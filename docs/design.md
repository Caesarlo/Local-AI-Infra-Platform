# 本地大模型 API 平台设计方案

> 目标：内网自用、团队 API Key 管控、高并发、完全本地部署
> 主力模型：Gemma 4 27B MoE（vLLM 推理）
> 撰写日期：2026-04-14

---

## 目录

1. [硬件规划](#1-硬件规划)
2. [总体架构](#2-总体架构)
3. [调用链路](#3-调用链路)
4. [核心组件设计](#4-核心组件设计)
   - 4.1 Nginx 接入层
   - 4.2 API Gateway
   - 4.3 Auth & Rate Limit
   - 4.4 Scheduler / Router
   - 4.5 Model Runtime Pool
   - 4.6 审计与日志
   - 4.7 Admin 后台
5. [API Key 设计](#5-api-key-设计)
6. [限流设计](#6-限流设计)
7. [数据库 Schema](#7-数据库-schema)
8. [Redis Key 设计](#8-redis-key-设计)
9. [vLLM 部署配置](#9-vllm-部署配置)
10. [接口规范](#10-接口规范)
11. [监控与告警](#11-监控与告警)
12. [安全设计](#12-安全设计)
13. [部署拓扑](#13-部署拓扑)
14. [分阶段计划](#14-分阶段计划)
15. [关键性能指标](#15-关键性能指标)

---

## 1. 硬件规划

### 实际硬件：4× RTX 2000 Ada（每张 16GB，合计 64GB）

Gemma 4 27B MoE 是混合专家架构：**所有专家权重都需加载进显存，但每次推理只激活部分专家**。
这意味着显存是核心瓶颈，计算压力相对稠密模型低。

### 显存分配分析

| 量化方式 | 权重显存 | 4 张卡合计 KV Cache | 可行性 |
|---|---|---|---|
| BF16 原精度 | ~54 GB | 64-54=10GB | ❌ KV Cache 太少 |
| INT8 | ~27 GB | 64×0.90-27=**30.6GB** | ✅ 可用 |
| **FP8**（推荐） | ~27 GB | 64×0.85-27=**27.4GB** | ✅ **推荐** |
| AWQ 4-bit | ~14 GB | 64×0.90-14=43.6GB | ✅ 质量较低 |

**结论：FP8 量化，4 张卡跑单个 vLLM 实例（tensor_parallel=4）。**

FP8 vs INT8 vs AWQ：
- FP8：质量最接近 BF16，RTX 2000 Ada 原生硬件支持，推理速度比 INT8 更快
- INT8：质量相近但速度略慢
- AWQ 4-bit：质量下降明显，适合显存极度不足的情况

> KV Cache 不足的后果比权重装不下更难排查——不会立即报错，
> 而是在并发上升时随机触发 OOM 或强制截断 context，表现为偶发 500 错误。
> FP8 留 27GB KV Cache，支持 32K context 下 6–8 并发，已足够内部团队使用。

### GPU 分配规划

```
单台服务器（4× RTX 2000 Ada，每张 16GB）

┌──────────────────────────────────────────────────────┐
│  GPU 0 + GPU 1 + GPU 2 + GPU 3  （64GB）             │
│  vLLM Instance 1：Gemma4-27B-MoE FP8                │
│  tensor_parallel=4                                    │
│  权重 ~27GB（每卡 ~6.75GB）                           │
│  KV Cache ~27GB（每卡 ~6.8GB）                        │
│  max_model_len=32768，max_concurrency≈8              │
│                                                       │
│  Embedding 服务共享 GPU 3（BGE-M3 仅 0.5GB，         │
│  vLLM 留 15% 显存空余完全够用）                       │
└──────────────────────────────────────────────────────┘

控制面服务（同机 CPU 运行）：
  Nginx / Gateway / Scheduler / PostgreSQL / Redis / Prometheus / Grafana
```

### 容量预估

| 场景 | 预估吞吐（单实例） |
|---|---|
| 短对话（512 in / 256 out） | ~20–35 req/min |
| RAG 问答（1K in / 512 out） | ~10–18 req/min |
| 长文档摘要（8K in / 1K out） | ~3–6 req/min |
| Embedding（BGE-M3，512 tokens） | ~200–400 req/min |

支撑 **15–20 人日常并发** 使用无压力。单实例无冗余，如果 vLLM 进程崩溃需重启（约 2–3 分钟），可以接受。

---

## 2. 总体架构

```
┌─────────────────────────────────────────────────────────┐
│                      内网客户端                          │
│         (IDE 插件 / 自研应用 / curl / OpenAI SDK)        │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS (内网)
┌────────────────────────▼────────────────────────────────┐
│                     Nginx                                │
│        TLS 终止 / IP 白名单 / 静态限速保护               │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                  API Gateway (FastAPI)                   │
│   输入校验 → Auth → 限流 → 路由决策 → 转发 → 异步日志    │
└──────┬──────────────────────────────────────┬───────────┘
       │                                      │
┌──────▼──────┐                    ┌──────────▼──────────┐
│  Auth &     │                    │  Scheduler /        │
│  Policy     │                    │  Router             │
│  (Redis)    │                    │  (队列 + 健康检查)   │
└─────────────┘                    └──────┬──────────────┘
                                          │
              ┌───────────────────────────┼─────────────────────┐
              │                           │                     │
┌─────────────▼──────┐   ┌───────────────▼────┐   ┌───────────▼──────┐
│  vLLM 实例 1       │   │  vLLM 实例 2       │   │  Embedding 服务  │
│  Gemma4-27B-MoE   │   │  Gemma4-27B-MoE   │   │  + Rerank 服务   │
│  :8001             │   │  :8002             │   │  :8010 / :8011   │
└────────────────────┘   └────────────────────┘   └──────────────────┘
              │
┌─────────────▼─────────────────────────────────────────────────────┐
│          控制面（PostgreSQL + Redis + Prometheus + Loki）           │
└───────────────────────────────────────────────────────────────────┘
              │
┌─────────────▼──────────────────────┐
│  Admin Console (Vue/React 后台)    │
└────────────────────────────────────┘
```

---

## 3. 调用链路

### 普通请求（非流式）

```
Client
  → Nginx（TLS 终止、IP 校验）
  → Gateway：解析请求体，提取 Authorization: Bearer {key}
  → Auth：Redis lookup key_hash → 获取 key 元数据（owner/project/allowed_models/limits）
  → 限流检查：Redis INCR 计数（QPS + 并发）
  → 输入校验：token 长度 ≤ 模型 max_context_length
  → Scheduler：按模型名选实例，综合队列长度 + 健康状态
  → 转发到 vLLM /v1/chat/completions
  → 返回响应给 Client
  → 异步（background task）写请求日志到 PostgreSQL
```

### 流式请求（SSE）

```
Client（保持长连接）
  → 同上鉴权 + 限流
  → Scheduler 选实例，优先选队列最短的低延迟实例
  → 转发 SSE 流给 Client（httpx.AsyncClient stream）
  → 客户端断连时：立即调用 vLLM /v1/cancel/{request_id} 终止生成，释放 KV Cache
  → 异步写日志（流结束或取消时）
```

### 为什么流式必须处理客户端断连？

vLLM 的 KV Cache 在生成过程中一直被占用。客户端断开后如果不通知 vLLM，
该请求会继续消耗 GPU 显存和算力直到生成完毕，严重影响其他请求的排队等待时间。

---

## 4. 核心组件设计

### 4.1 Nginx 接入层

职责：TLS 终止、IP 白名单、防止直接暴露 Gateway 端口、静态限速兜底。

```nginx
# /etc/nginx/conf.d/llm-gateway.conf

# 仅允许内网网段
geo $allowed_ip {
    default         0;
    192.168.0.0/16  1;
    10.0.0.0/8      1;
}

# 兜底限速：单 IP 每秒最多 50 个连接（防止脚本误打爆）
limit_req_zone $binary_remote_addr zone=global:10m rate=50r/s;

upstream gateway_backend {
    least_conn;
    server 127.0.0.1:8000;
    server 127.0.0.1:8001;  # 如有多个 Gateway 实例
    keepalive 64;
}

server {
    listen 443 ssl;
    server_name llm-api.internal;

    ssl_certificate     /etc/ssl/internal/cert.pem;
    ssl_certificate_key /etc/ssl/internal/key.pem;

    # IP 白名单
    if ($allowed_ip = 0) {
        return 403 "Access denied: not in allowed network";
    }

    # 兜底限速（不影响 Gateway 内部细粒度限流）
    limit_req zone=global burst=200 nodelay;

    # 流式响应不缓冲
    proxy_buffering off;
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;

    location /v1/ {
        proxy_pass http://gateway_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        # SSE 必须关闭 chunked 缓冲
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }

    location /admin/ {
        # 管理后台只允许特定管理 IP 段
        allow 192.168.1.0/24;
        deny all;
        proxy_pass http://gateway_backend;
    }
}
```

### 4.2 API Gateway

职责：统一入口、请求解析、编排各中间件、转发请求、异步写日志。

**技术选型：FastAPI + Uvicorn（多 worker）**

关键设计点：
- 所有中间件通过 FastAPI `Depends` 注入，按顺序执行
- 日志写入用 `BackgroundTask`，不阻塞响应
- 流式转发用 `httpx.AsyncClient`，支持 SSE chunk-by-chunk 透传
- 客户端断连通过 `request.is_disconnected()` 检测，触发 vLLM cancel

```
Gateway 中间件执行顺序：
  parse_auth_header()       # 提取 Bearer token
    → validate_api_key()    # Redis hash 查询，获取 key 元数据
    → check_model_access()  # key 是否有权限访问目标模型
    → rate_limit_check()    # QPS + 并发双维度限流（纯 Redis）
    → validate_input()      # 参数格式 + token 长度校验
    → route_request()       # 调用 Scheduler 选实例
    → proxy_to_vllm()       # 透传请求（流式/非流式）
    → [BackgroundTask] write_request_log()
```

### 4.3 Auth & Rate Limit

#### API Key 验证流程

```
请求携带：Authorization: Bearer sk-abc123...xyz

Gateway 步骤：
  1. 截取 Bearer token
  2. 计算 SHA-256(token) → key_hash
  3. Redis GET api_key:{key_hash} → 返回序列化的 key 元数据 JSON
     如果不存在 → 401 Unauthorized
  4. 检查 key.status == "active"，否则 → 401
  5. 检查 key.expires_at，过期 → 401
  6. 检查 request.model in key.allowed_models，否则 → 403
```

#### 限流（全部走 Redis，不入库）

三层保护，由外到内：

```
Layer 1：全局保护（Nginx limit_req，兜底）
Layer 2：按 API Key 限流（Gateway 内 Redis）
  - QPS 窗口：每秒请求数
  - 并发窗口：当前进行中请求数（INCR/DECR + TTL）
  - 每分钟 token 预算（可选）
Layer 3：按模型限流（Gateway 内 Redis）
  - 每个模型实例最大并发数（保护 GPU）
```

**Redis 限流算法选择：滑动窗口（推荐）**

令牌桶对突发友好，滑动窗口对限速精度更高。
内部团队用滑动窗口更合适，避免有人积累令牌后突发打爆。

```python
# 并发控制用 INCR/DECR（简单可靠）
# 当前活跃请求数
key = f"concur:{key_id}"
current = redis.incr(key)
redis.expire(key, 60)  # 防止异常不减导致永久阻塞
if current > key_meta.concurrency_limit:
    redis.decr(key)
    raise TooManyRequestsError("并发超限")
try:
    yield  # 执行实际请求
finally:
    redis.decr(key)
```

### 4.4 Scheduler / Router

职责：在多个 vLLM 实例之间做负载均衡，感知实例健康状态和当前队列压力。

#### 实例注册（MVP 用静态配置）

```yaml
# config/instances.yaml（针对 4× RTX 2000 Ada 单机，单实例 FP8）
models:
  gemma4-27b:
    type: chat
    context_length: 32768
    instances:
      - id: gemma4-inst-1
        url: http://127.0.0.1:8001
        gpu: "RTX2000Ada-0,1,2,3"
        max_concurrency: 8
  text-embedding:
    type: embedding
    instances:
      - id: emb-inst-1
        url: http://127.0.0.1:8010
        gpu: "RTX2000Ada-3(shared)"
        max_concurrency: 32
```

#### 调度算法：最小活跃请求数（Least Outstanding Requests）

**不要用 round-robin**。LLM 请求时长差异极大（短问答 2s vs 长文档 60s），
round-robin 会让某些实例积压大量慢请求，另一些实例却闲置。

```
选实例逻辑：
  1. 过滤掉状态非 healthy 的实例
  2. 过滤掉当前活跃请求数 ≥ max_concurrency 的实例（满载）
  3. 在剩余实例中选 active_requests 最少的
  4. 如果所有实例满载 → 排队（队列长度 > 阈值则快速失败）

Prefix Cache 亲和（可选优化）：
  对 system_prompt 做 SHA-256[:8]，
  用一致性哈希将相同前缀的请求路由到同一实例，
  利用 vLLM 的 Prefix KV Cache 提升命中率。
```

#### 实例健康检查

```
后台协程每 10s 轮询各实例 GET /health
  healthy：正常接收请求
  degraded：响应慢但存活，仍可路由但降低优先级
  offline：不路由，等待恢复

冷启动保护：
  实例刚启动时状态为 starting，先发一个 warmup 请求（短 prompt）
  warmup 成功后才切换为 healthy，开始接收流量
```

#### 排队与背压

```
每个模型维护一个内存队列（asyncio.Queue）：
  - 队列长度上限：max_queue_size（推荐 = max_concurrency × 3）
  - 超出上限 → 立即返回 503 {"error": "system_busy", "retry_after": 10}
  - 队列中请求的超时：60s 排队超时，超时返回 504
  
对重要项目可设置 priority 字段（0=normal, 1=high）：
  高优先级请求插队到队列头部
```

### 4.5 Model Runtime Pool

#### vLLM 部署（Gemma 4 27B MoE）

详见第 9 章。

#### Embedding 服务

独立部署，**不与 LLM 混用 GPU**。推荐模型：

- 中英文：`BAAI/bge-m3`（1.5GB 显存，支持多语言）
- 纯中文：`BAAI/bge-large-zh-v1.5`
- 高性能：`Qwen/Qwen3-Embedding`

接口兼容 OpenAI `/v1/embeddings`，可直接用 vLLM 或 sentence-transformers 封装。

**Embedding 结果缓存（减少 GPU 负载 30–60%）：**

```python
# 同一文本的 embedding 结果永远相同，值得缓存
cache_key = f"emb:{model}:{sha256(text)[:16]}"
cached = await redis.get(cache_key)
if cached:
    return json.loads(cached)
result = await call_embedding_service(text, model)
await redis.setex(cache_key, 86400, json.dumps(result))  # TTL 24h
return result
```

#### Rerank 服务

独立 CPU/GPU 服务，推荐 `BAAI/bge-reranker-v2-m3`。
接口：`POST /v1/rerank`（自定义，非 OpenAI 标准）。

### 4.6 审计与日志

#### 请求日志（异步写入，不阻塞响应）

```python
# FastAPI BackgroundTask 方式，请求结束后异步执行
background_tasks.add_task(write_request_log, log_data)

# log_data 结构：
{
    "request_id": "uuid",
    "key_id": "k_xxx",
    "project": "team-rag",
    "model": "gemma4-27b",
    "prompt_tokens": 512,
    "completion_tokens": 256,
    "latency_ms": 3200,
    "ttft_ms": 680,          # Time to First Token（流式）
    "status_code": 200,
    "backend_instance": "gemma4-inst-1",
    "client_ip": "192.168.1.50",
    "created_at": "2026-04-14T10:30:00Z",
    # 注意：不存储原始 prompt 正文（隐私保护）
    # 如需审计留痕，只存 sha256(prompt) 用于去重分析
}
```

#### 日志存储策略

| 数据 | 存储位置 | 保留期 |
|---|---|---|
| 请求日志（结构化） | PostgreSQL request_logs | 90 天 |
| 原始 prompt/completion | 默认不存；敏感项目可选开启 | 30 天 |
| 系统日志 | Loki | 30 天 |
| 监控指标 | Prometheus TSDB | 15 天 |
| 告警历史 | Grafana | 90 天 |

### 4.7 Admin 后台

后台 API 独立路由前缀 `/admin/*`，通过 Nginx 限制只允许管理员 IP 访问。

认证方式（MVP）：静态 Admin Token（环境变量配置，启动时加载）

最少功能：

| 模块 | 核心功能 |
|---|---|
| API Key 管理 | 创建、查看（只显示前后4位）、禁用、删除、设置配额 |
| 模型管理 | 查看实例状态（healthy/degraded/offline）、手动上下线 |
| 用量统计 | 按 key / project / 模型 / 时间段汇总 token 消耗 |
| 请求日志 | 查询最近请求，支持按 key / 模型 / 状态过滤 |
| 限流配置 | 动态修改 key 的 QPS/并发/配额（写入 DB + 刷新 Redis 缓存） |
| 系统状态 | 各模型实例队列长度、GPU 利用率（对接 Prometheus） |

前端建议：Vue 3 + Element Plus，或直接用 Swagger UI 管理（MVP 足够）。

---

## 5. API Key 设计

### Key 结构

```
格式：sk-{base62(32字节随机数)}
示例：sk-Xk9mP2qRnL8vTzYcW5aJ4bDsE6fHiNu

生成（Python）：
  import secrets
  raw = "sk-" + secrets.token_urlsafe(32)

存储：
  数据库和 Redis 只存 SHA-256(raw_key)
  展示时只显示前8位和后4位：sk-Xk9m****NLu
```

### Key 元数据（PostgreSQL api_keys 表）

```sql
CREATE TABLE api_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_id          VARCHAR(16) UNIQUE NOT NULL,  -- 短 ID，用于日志引用
    key_hash        CHAR(64) NOT NULL UNIQUE,     -- SHA-256 hex
    name            VARCHAR(128) NOT NULL,         -- 可读名称
    owner           VARCHAR(64) NOT NULL,          -- 负责人
    project         VARCHAR(64) NOT NULL,          -- 所属项目
    allowed_models  TEXT[] NOT NULL DEFAULT '{}',  -- 允许的模型列表
    qps_limit       INTEGER NOT NULL DEFAULT 10,
    concurrency_limit INTEGER NOT NULL DEFAULT 5,
    daily_token_quota BIGINT,                     -- NULL = 不限额
    status          VARCHAR(16) NOT NULL DEFAULT 'active',  -- active/disabled/expired
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    last_used_at    TIMESTAMPTZ,
    created_by      VARCHAR(64) NOT NULL
);
```

### Redis 缓存（减少 DB 查询）

```
# Key 元数据缓存，TTL 5 分钟（修改 key 后主动失效）
api_key:{key_hash} → JSON(key_metadata)  TTL: 300s

# 修改 key 时：
redis.delete(f"api_key:{key_hash}")  # 主动失效，下次请求重新从 DB 加载
```

---

## 6. 限流设计

### 三层限流架构

```
┌─────────────────────────────────────────────────┐
│  Layer 1：Nginx limit_req                       │
│  粒度：单 IP，50 req/s，兜底保护                 │
└───────────────────────────┬─────────────────────┘
                            ↓
┌─────────────────────────────────────────────────┐
│  Layer 2：按 API Key（Redis）                   │
│  ├─ QPS 限流：滑动窗口，1s 粒度                  │
│  ├─ 并发限流：INCR/DECR 计数器                  │
│  └─ 日 token 配额：INCR + 当天 0 点 EXPIRE      │
└───────────────────────────┬─────────────────────┘
                            ↓
┌─────────────────────────────────────────────────┐
│  Layer 3：按模型实例（Scheduler）               │
│  实例活跃请求数 ≥ max_concurrency → 排队/拒绝   │
└─────────────────────────────────────────────────┘
```

### Redis 限流 Key 设计

```
# QPS 滑动窗口（按秒切分）
rate:qps:{key_id}:{unix_second}  →  INCR，TTL 10s

# 并发计数
rate:concur:{key_id}  →  INCR（请求开始），DECR（请求结束），TTL 60s

# 日 token 配额
rate:token:{key_id}:{date}  →  INCRBY(tokens_used)，EXPIREAT(当天23:59:59)

# 模型级别并发
rate:model:{model_name}:{instance_id}  →  INCR/DECR，TTL 60s
```

### 限流响应

```json
HTTP 429 Too Many Requests
{
    "error": {
        "code": "rate_limit_exceeded",
        "message": "QPS limit exceeded for this API key",
        "type": "rate_limit_error"
    }
}
Headers:
  X-RateLimit-Limit: 10
  X-RateLimit-Remaining: 0
  X-RateLimit-Reset: 1713090600
  Retry-After: 1
```

---

## 7. 数据库 Schema

```sql
-- 项目表
CREATE TABLE projects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(64) UNIQUE NOT NULL,
    description TEXT,
    owner       VARCHAR(64) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- API Keys（见第5章）

-- 模型配置表（含量化参数，支持从管理后台配置）
CREATE TABLE models (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                 VARCHAR(64) UNIQUE NOT NULL,   -- 对外暴露名称，如 "gemma4-27b"
    display_name         VARCHAR(128),
    type                 VARCHAR(32) NOT NULL,           -- chat/embedding/rerank
    model_path           VARCHAR(512) NOT NULL,          -- 本地路径或 HuggingFace ID

    -- 量化配置
    quantization         VARCHAR(16),                   -- null/fp8/int8/awq/gptq
    dtype                VARCHAR(16) NOT NULL DEFAULT 'bfloat16',  -- bfloat16/float16
    tensor_parallel_size INTEGER NOT NULL DEFAULT 1,
    max_model_len        INTEGER NOT NULL DEFAULT 8192,
    gpu_memory_utilization NUMERIC(3,2) NOT NULL DEFAULT 0.85,
    enable_prefix_caching BOOLEAN NOT NULL DEFAULT TRUE,
    extra_args           TEXT,                          -- 额外 vllm 参数，换行分隔

    -- 部署配置
    listen_host          VARCHAR(64) NOT NULL DEFAULT '127.0.0.1',
    listen_port          INTEGER NOT NULL,
    cuda_visible_devices VARCHAR(64),                   -- "0,1,2,3"
    max_concurrency      INTEGER NOT NULL DEFAULT 8,

    -- 状态
    context_length       INTEGER NOT NULL,              -- 冗余存储，方便网关层校验
    status               VARCHAR(16) NOT NULL DEFAULT 'configured',
    -- configured: 已配置未启动 / starting / healthy / degraded / paused / offline

    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by           VARCHAR(64) NOT NULL DEFAULT 'admin'
);

-- 模型实例表（运行时状态，由 Scheduler 维护）
CREATE TABLE model_instances (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id          UUID REFERENCES models(id) ON DELETE CASCADE,
    instance_id       VARCHAR(64) UNIQUE NOT NULL,
    url               VARCHAR(256) NOT NULL,
    max_concurrency   INTEGER NOT NULL DEFAULT 8,
    status            VARCHAR(16) NOT NULL DEFAULT 'offline',
    -- starting / healthy / degraded / paused / offline / stopping
    last_health_check TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 请求日志表（按月分区，避免单表过大）
CREATE TABLE request_logs (
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    request_id      VARCHAR(36) NOT NULL,
    key_id          VARCHAR(16) NOT NULL,
    project         VARCHAR(64),
    model           VARCHAR(64) NOT NULL,
    prompt_tokens   INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    latency_ms      INTEGER,
    ttft_ms         INTEGER,     -- Time to First Token
    status_code     SMALLINT NOT NULL,
    error_code      VARCHAR(64),
    backend_instance VARCHAR(64),
    client_ip       INET,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- 按月分区示例
CREATE TABLE request_logs_2026_04 PARTITION OF request_logs
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

-- 日用量聚合（定时任务从 request_logs 汇总，加速统计查询）
CREATE TABLE usage_daily (
    key_id          VARCHAR(16) NOT NULL,
    project         VARCHAR(64),
    model           VARCHAR(64) NOT NULL,
    date            DATE NOT NULL,
    request_count   INTEGER NOT NULL DEFAULT 0,
    prompt_tokens   BIGINT NOT NULL DEFAULT 0,
    completion_tokens BIGINT NOT NULL DEFAULT 0,
    error_count     INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (key_id, model, date)
);

-- 审计事件表（key 创建/禁用/删除等操作）
CREATE TABLE audit_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type  VARCHAR(64) NOT NULL,  -- key.created / key.disabled / model.offline
    operator    VARCHAR(64) NOT NULL,
    target_id   VARCHAR(128),
    detail      JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 常用索引
CREATE INDEX idx_request_logs_key_id ON request_logs (key_id, created_at DESC);
CREATE INDEX idx_request_logs_model ON request_logs (model, created_at DESC);
CREATE INDEX idx_api_keys_hash ON api_keys (key_hash);
CREATE INDEX idx_api_keys_project ON api_keys (project);
```

---

## 8. Redis Key 设计

```
# ─── API Key 缓存 ───────────────────────────────
api_key:{key_hash}              STRING  JSON(key_meta)     TTL:300s

# ─── 限流计数器 ──────────────────────────────────
rate:qps:{key_id}:{unix_sec}    STRING  整数请求计数        TTL:10s
rate:concur:{key_id}            STRING  当前并发数          TTL:60s
rate:token:{key_id}:{date}      STRING  当日 token 消耗     EXPIREAT:当天结束

# ─── 模型实例状态 ─────────────────────────────────
instance:status:{instance_id}   STRING  healthy/degraded/offline  TTL:30s（健康检查续期）
instance:concur:{instance_id}   STRING  当前活跃请求数     TTL:60s
instance:queue:{instance_id}    STRING  排队中请求数       TTL:60s

# ─── Embedding 缓存 ───────────────────────────────
emb:{model}:{text_hash_prefix}  STRING  JSON([float...])   TTL:86400s

# ─── 调度器全局队列（可选，轻量部署用内存 asyncio.Queue 即可）
scheduler:queue:{model}         LIST    待处理 request_id  无 TTL
```

---

## 9. vLLM 部署配置

> 本节针对实际硬件：**4× RTX 2000 Ada（每张 16GB）**，FP8 量化，单实例 tensor_parallel=4。

### FP8 无需提前量化

FP8 是 vLLM 原生支持的在线量化，**直接加载 BF16 原始模型，启动时自动转换**。
RTX 2000 Ada（Ada Lovelace，compute 8.9）原生有 FP8 Tensor Core，速度比软件模拟快。

### 启动命令

```bash
# 主 LLM 实例：全部 4 张 GPU
CUDA_VISIBLE_DEVICES=0,1,2,3 vllm serve /models/gemma-4-27b-it \
    --host 127.0.0.1 \
    --port 8001 \
    --dtype bfloat16 \
    --quantization fp8 \
    --tensor-parallel-size 4 \
    --max-model-len 32768 \
    --max-num-batched-tokens 32768 \
    --gpu-memory-utilization 0.85 \
    --enable-prefix-caching \
    --disable-log-requests \
    --trust-remote-code \
    --served-model-name gemma4-27b

# Embedding：共享 GPU 3（vLLM 留 15% = 2.4GB，BGE-M3 只要 0.5GB）
CUDA_VISIBLE_DEVICES=3 vllm serve BAAI/bge-m3 \
    --host 127.0.0.1 \
    --port 8010 \
    --dtype float16 \
    --gpu-memory-utilization 0.12 \
    --disable-log-requests \
    --served-model-name text-embedding
```

> **注意：** Embedding 进程用 `CUDA_VISIBLE_DEVICES=3` 独立启动，
> 与 vLLM 主进程共享 GPU 3 的剩余显存。两个进程的显存分配之和不超过 16GB 即可。

### 关键参数说明

| 参数 | 作用 | 本机设定值 | 原因 |
|---|---|---|---|
| `--quantization fp8` | FP8 在线量化 | fp8 | 质量接近 BF16，Ada 架构原生加速 |
| `--dtype bfloat16` | 计算基础精度 | bfloat16 | FP8 量化的基准精度 |
| `--tensor-parallel-size` | 多卡张量并行 | 4 | 全部 4 张卡 |
| `--max-model-len` | 最大 context 长度 | 32768 | FP8 权重省出的显存给 KV Cache |
| `--max-num-batched-tokens` | 单批次 token 上限 | 32768 | 影响并发吞吐 |
| `--gpu-memory-utilization` | KV Cache 使用显存比例 | 0.85 | 留 15% 给 Embedding 共享和系统 |
| `--enable-prefix-caching` | Prefix KV Cache | 必须开启 | RAG 场景收益显著 |
| `--disable-log-requests` | 关闭 vLLM 自身日志 | 推荐 | 由 Gateway 统一记录 |
| `--host 127.0.0.1` | 只绑定本机 | 安全要求 | 不对外暴露端口 |

### 显存占用估算

```
每张 GPU 16GB × 4 = 64GB

vLLM（gpu_memory_utilization=0.85）：
  可用显存：64 × 0.85 = 54.4GB
  FP8 权重：~27GB（每卡 6.75GB）
  KV Cache：54.4 - 27 = 27.4GB（每卡约 6.8GB）
  → 支持 32K context，8 并发

GPU 3 剩余空间：
  vLLM 占用：6.75 + 6.8 = 13.55GB
  剩余：16 - 13.55 = 2.45GB
  BGE-M3 需要：~0.5GB  ✓
```

### Prefix KV Cache 说明

vLLM 会对相同前缀（System Prompt）的请求复用 KV Cache，跳过重复计算。

如果你的团队应用有固定 System Prompt（RAG、代码助手等），开启后：
- 首次请求：正常计算
- 后续相同 System Prompt 的请求：**直接复用缓存，TTFT 可降低 40–70%**

单实例部署时无需一致性哈希，所有请求自然路由到同一实例，Prefix Cache 命中率最高。

### Systemd 服务（开机自启）

```ini
# /etc/systemd/system/vllm-gemma4.service
[Unit]
Description=vLLM Gemma4 27B MoE FP8 (4-GPU)
After=network.target

[Service]
Type=simple
User=llm
WorkingDirectory=/opt/llm
ExecStart=/opt/venv/bin/vllm serve /models/gemma-4-27b-it \
    --host 127.0.0.1 --port 8001 \
    --dtype bfloat16 --quantization fp8 \
    --tensor-parallel-size 4 \
    --max-model-len 32768 \
    --gpu-memory-utilization 0.85 \
    --enable-prefix-caching \
    --disable-log-requests \
    --trust-remote-code \
    --served-model-name gemma4-27b
Restart=always
RestartSec=30
StandardOutput=journal
StandardError=journal
Environment=CUDA_VISIBLE_DEVICES=0,1,2,3
Environment=HF_HOME=/models/cache

[Install]
WantedBy=multi-user.target
```

```ini
# /etc/systemd/system/vllm-embedding.service
[Unit]
Description=vLLM BGE-M3 Embedding
After=vllm-gemma4.service

[Service]
Type=simple
User=llm
ExecStart=/opt/venv/bin/vllm serve BAAI/bge-m3 \
    --host 127.0.0.1 --port 8010 \
    --dtype float16 \
    --gpu-memory-utilization 0.12 \
    --disable-log-requests \
    --served-model-name text-embedding
Restart=always
RestartSec=10
Environment=CUDA_VISIBLE_DEVICES=3
Environment=HF_HOME=/models/cache

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable vllm-gemma4 vllm-embedding
systemctl start  vllm-gemma4
# 等 vllm-gemma4 启动完成（约 3 分钟），再启动 embedding
systemctl start  vllm-embedding
```

---

## 10. 接口规范

### 用户侧接口

```
POST   /v1/chat/completions       对话（兼容 OpenAI）
POST   /v1/embeddings             向量化（兼容 OpenAI）
POST   /v1/rerank                 重排序（自定义）
GET    /v1/models                 可用模型列表（仅返回 key 有权限的模型）
GET    /v1/usage                  当前 key 的用量统计
```

### 管理侧接口

```
# 认证
POST   /admin/auth/login               Admin Token 换 JWT

# API Key 管理
POST   /admin/keys                     创建 API Key
GET    /admin/keys                     列表（支持 project/status 过滤）
GET    /admin/keys/{id}                详情
PATCH  /admin/keys/{id}                修改配额/状态/模型权限
POST   /admin/keys/{id}/revoke         立即吊销

# 模型配置管理（新增）
GET    /admin/models                   模型配置列表
POST   /admin/models                   新增模型配置（含量化参数）
GET    /admin/models/{id}              模型配置详情
PATCH  /admin/models/{id}              更新模型配置
DELETE /admin/models/{id}              删除模型配置（需先停止实例）

# 实例运行控制（新增）
GET    /admin/instances                实例列表（含实时状态）
POST   /admin/instances/{id}/start     启动实例（拉起 vLLM 进程）
POST   /admin/instances/{id}/pause     暂停路由（不停进程，等现有请求结束）
POST   /admin/instances/{id}/resume    恢复路由
POST   /admin/instances/{id}/restart   优雅重启（等当前请求结束后重启进程）
POST   /admin/instances/{id}/stop      强制停止（终止进程，释放 GPU）
PATCH  /admin/instances/{id}           手动修改状态（上线/下线）

# 监控指标（新增细分）
GET    /admin/metrics/summary          今日概览（请求数/并发/错误率）
GET    /admin/metrics/timeseries       时序数据（QPS 趋势，?range=1h/6h/24h）
GET    /admin/metrics/latency          延迟分位（P50/P95/P99，?model=xxx）
GET    /admin/metrics/hardware         硬件指标（GPU%/VRAM/CPU/RAM，从 nvidia-smi 或 Prometheus 聚合）

# 日志与审计
GET    /admin/requests                 请求日志（分页+过滤）
GET    /admin/usage                    用量汇总（按 key/project/模型/时间）
GET    /admin/alerts                   当前告警列表
GET    /admin/audit                    审计日志
```

### 实例控制接口说明

`POST /admin/instances/{id}/pause` — 暂停路由
```json
// 请求体：可选等待超时
{ "drain_timeout_seconds": 30 }

// 行为：
// 1. Scheduler 停止向该实例分配新请求
// 2. 等待当前活跃请求完成（最多 drain_timeout_seconds）
// 3. 实例状态变为 paused，进程继续运行（KV Cache 保留）
// 4. 恢复时调用 /resume，秒级生效
```

`POST /admin/instances/{id}/stop` — 强制停止
```json
// 请求体：
{ "force": false }  // false=等请求结束后停；true=立即 SIGTERM

// 行为：终止 vLLM 进程，释放全部 GPU 显存
// 恢复时需重新加载模型（分钟级），谨慎使用
```

`POST /admin/instances/{id}/start` — 启动实例
```json
// 请求体：可选覆盖参数（否则使用 models 表中的配置）
{
  "override_args": {
    "gpu_memory_utilization": 0.90
  }
}
// 行为：
// 1. 读取 models 表中的量化/并发/路径等配置
// 2. 拼装 vllm serve 命令并启动进程
// 3. 实例状态变为 starting
// 4. 后台发送 warmup 请求，成功后切换为 healthy
```

### 错误响应规范（兼容 OpenAI 格式）

```json
{
    "error": {
        "code": "rate_limit_exceeded",
        "message": "You have exceeded your QPS limit of 10 requests/second",
        "type": "rate_limit_error",
        "param": null
    }
}
```

| HTTP 状态码 | error.code | 含义 |
|---|---|---|
| 400 | `invalid_request_error` | 参数错误、格式错误 |
| 400 | `context_length_exceeded` | 输入 token 超出模型限制 |
| 401 | `authentication_error` | Key 无效、已过期、已吊销 |
| 403 | `permission_denied` | Key 无权访问该模型 |
| 429 | `rate_limit_exceeded` | QPS/并发/配额超限 |
| 503 | `service_unavailable` | 所有实例不可用 |
| 503 | `system_busy` | 排队已满，稍后重试 |
| 504 | `upstream_timeout` | 推理超时 |

---

## 11. 监控与告警

### Prometheus 指标（Gateway 暴露 /metrics）

```
# 请求计数
llm_requests_total{model, status_code, key_project}

# 延迟分布
llm_request_duration_ms{model, quantile}   # P50/P95/P99
llm_ttft_ms{model, quantile}               # 流式首 token 时间

# Token 吞吐
llm_prompt_tokens_total{model}
llm_completion_tokens_total{model}

# 实例状态
llm_instance_status{instance_id, model}    # 0=offline 1=degraded 2=healthy
llm_instance_active_requests{instance_id}
llm_instance_queue_length{instance_id}

# 限流
llm_rate_limit_hits_total{key_id, limit_type}  # qps/concurrency/quota

# 错误
llm_errors_total{model, error_code}
```

### 关键告警规则

```yaml
# prometheus/alert_rules.yml
groups:
  - name: llm_platform
    rules:

      - alert: HighErrorRate
        expr: rate(llm_errors_total[5m]) / rate(llm_requests_total[5m]) > 0.05
        for: 2m
        annotations:
          summary: "错误率超过 5%"

      - alert: InstanceOffline
        expr: llm_instance_status == 0
        for: 1m
        annotations:
          summary: "模型实例下线: {{ $labels.instance_id }}"

      - alert: HighQueueLength
        expr: llm_instance_queue_length > 20
        for: 3m
        annotations:
          summary: "实例排队积压: {{ $labels.instance_id }}"

      - alert: HighP99Latency
        expr: llm_request_duration_ms{quantile="0.99"} > 60000
        for: 5m
        annotations:
          summary: "P99 延迟超过 60s: {{ $labels.model }}"

      - alert: GPUMemoryHigh
        expr: nvidia_gpu_memory_used_bytes / nvidia_gpu_memory_total_bytes > 0.95
        for: 2m
        annotations:
          summary: "GPU 显存占用超过 95%"
```

### Grafana 核心 Dashboard

推荐创建 4 个面板：

1. **请求概览**：QPS、错误率、P50/P95/P99 延迟趋势
2. **模型实例**：各实例活跃请求数、队列长度、健康状态
3. **GPU 监控**：显存占用、计算利用率、温度
4. **用量排行**：按 project 的 token 消耗排行、按模型的请求量

---

## 12. 安全设计

### 最小安全要求（必须做）

- [ ] Nginx 严格限制内网网段，禁止公网访问
- [ ] 全程 HTTPS（自签证书 + 内网 CA 即可）
- [ ] API Key 只存 SHA-256 hash，展示时只显示前后4位
- [ ] Admin 后台限制 IP 只允许运维机器段
- [ ] Admin Token 通过环境变量注入，不写入代码
- [ ] 支持 Key 一键吊销，吊销后 5 分钟内全平台生效（Redis 缓存 TTL）
- [ ] 所有管理员操作写审计日志（audit_events 表）
- [ ] vLLM 实例不对外暴露，只允许 Gateway 内网访问

### 按需增强（可选）

- LDAP/AD 集成后台登录（如果公司有现成 LDAP）
- Key 申请走审批流（避免随意创建）
- 细粒度 RBAC（超级管理员 / 项目管理员 / 只读查看）
- mTLS（Gateway 到 vLLM 实例之间）
- 敏感项目开启 prompt 审计留痕（记录原文 + 加密存储）

---

## 13. 部署拓扑

### Docker Compose 部署（小团队 MVP）

```yaml
# docker-compose.yml（控制节点运行）

version: "3.9"

services:
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./config/nginx.conf:/etc/nginx/conf.d/default.conf
      - ./certs:/etc/ssl/internal
    depends_on: [gateway]

  gateway:
    build: ./services/gateway
    environment:
      - DATABASE_URL=postgresql://llm:password@postgres:5432/llmplatform
      - REDIS_URL=redis://redis:6379
      - ADMIN_TOKEN=${ADMIN_TOKEN}
      - INSTANCES_CONFIG=/config/instances.yaml
    volumes:
      - ./config:/config
    ports:
      - "8000:8000"
    depends_on: [postgres, redis]
    deploy:
      replicas: 2  # Gateway 本身无状态，可多副本

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: llmplatform
      POSTGRES_USER: llm
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init_db.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "127.0.0.1:5432:5432"  # 只绑定本地

  redis:
    image: redis:7-alpine
    command: redis-server --save 60 1 --loglevel warning
    volumes:
      - redis_data:/data
    ports:
      - "127.0.0.1:6379:6379"

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./monitoring/alert_rules.yml:/etc/prometheus/alert_rules.yml
      - prometheus_data:/prometheus
    ports:
      - "127.0.0.1:9090:9090"

  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
    ports:
      - "127.0.0.1:3000:3000"

  loki:
    image: grafana/loki:latest
    ports:
      - "127.0.0.1:3100:3100"

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:
```

```bash
# GPU 机器单独运行（不放在 compose 里，避免资源争抢）
# start_vllm.sh

#!/bin/bash
docker run -d \
  --name vllm-gemma4-1 \
  --gpus "device=0,1" \
  --ipc=host \
  -p 8001:8000 \
  -v /models:/models \
  vllm/vllm-openai:latest \
  --model /models/gemma-4-27b-it \
  --dtype bfloat16 \
  --tensor-parallel-size 2 \
  --max-model-len 32768 \
  --enable-prefix-caching \
  --trust-remote-code \
  --served-model-name gemma4-27b
```

### 网络规划

```
控制节点：192.168.1.100
  - :443   → Nginx（对内网用户暴露）
  - :8000  → Gateway（只允许 Nginx 访问）
  - :5432  → PostgreSQL（只允许本机）
  - :6379  → Redis（只允许本机 + 192.168.1.101）
  - :9090  → Prometheus（只允许运维机器）
  - :3000  → Grafana（只允许运维机器）

GPU 推理节点：192.168.1.101
  - :8001  → vLLM 实例 1（只允许 192.168.1.100 访问）
  - :8002  → vLLM 实例 2（只允许 192.168.1.100 访问）
  - :8010  → Embedding 服务（只允许 192.168.1.100 访问）
```

---

## 14. 分阶段计划

### Phase 1：MVP 可用（目标 2–3 周）

- [ ] Nginx + TLS + IP 白名单
- [ ] FastAPI Gateway：接入、鉴权、限流、转发、异步日志
- [ ] API Key 管理（API 接口，暂不做 UI）
- [ ] Redis 限流（QPS + 并发）
- [ ] PostgreSQL 建表 + 请求日志
- [ ] vLLM 1 个实例（静态配置）
- [ ] Embedding 服务 1 个实例
- [ ] Prometheus + Grafana 基础监控

**验收标准：** 团队成员能通过 API Key 正常调用，超限返回 429，日志可查。

### Phase 2：稳定可靠（目标 1 个月）

- [ ] Scheduler：最小活跃请求数调度 + Prefix Cache 亲和
- [ ] vLLM 多副本 + 实例健康检查 + 自动上下线
- [ ] 流式输出客户端断连处理（vLLM cancel）
- [ ] Embedding 结果 Redis 缓存
- [ ] 输入 token 长度校验（context_length_exceeded）
- [ ] 请求排队 + 背压（queue 满返回 503）
- [ ] Admin 后台 UI（用量统计、Key 管理）
- [ ] 告警规则 + Grafana Dashboard 完善

**验收标准：** 高峰期不出现 GPU OOM 或雪崩；单实例故障自动摘除。

### Phase 3：增强（按需）

- [ ] 优先级队列（重要项目插队）
- [ ] token 日配额（daily_token_quota）
- [ ] 模型版本灰度发布
- [ ] Key 申请审批流
- [ ] LDAP 后台登录
- [ ] 细粒度 RBAC
- [ ] K8s 迁移 + HPA 自动扩缩容

---

## 15. 关键性能指标

| 指标 | 说明 | 目标值（参考） |
|---|---|---|
| TTFT（流式首 token 时间） | 用户感知响应速度 | P50 < 1s，P99 < 3s |
| 请求 P99 延迟 | 端到端响应时间（不含生成） | 网关开销 < 50ms |
| 推理吞吐 | vLLM token/s（含批处理） | 视 GPU 型号，A100 约 2000–4000 tok/s |
| 并发容量 | 同时处理的请求数 | 每实例 8–16（视 context 长度） |
| GPU 利用率 | 推理计算利用率 | 目标 > 70%（低说明资源浪费） |
| 错误率 | 5xx 错误 / 总请求 | < 0.5% |
| 队列等待时间 | 请求在排队阶段等待时长 | P95 < 5s |
| Embedding 缓存命中率 | 减少 GPU 调用的比例 | > 30%（RAG 场景通常 40–60%） |

---

## 附：推荐技术栈清单

| 组件 | 选型 | 说明 |
|---|---|---|
| 接入代理 | Nginx | TLS 终止、IP 白名单、静态限速 |
| API 网关 | FastAPI + Uvicorn | 异步、OpenAI 兼容、开发效率高 |
| 缓存/限流 | Redis 7 | 限流计数、Key 缓存、Embedding 缓存 |
| 数据库 | PostgreSQL 16 | 请求日志、Key 管理、用量统计 |
| LLM 推理 | vLLM | 高吞吐、Continuous Batching、Prefix Cache |
| Embedding | vLLM 或 sentence-transformers | BGE-M3 或 Qwen3-Embedding |
| 监控 | Prometheus + Grafana | 指标采集与可视化 |
| 日志 | Loki + Promtail | 结构化日志聚合 |
| 容器编排 | Docker Compose（MVP） / K8s（后期） | 按规模选择 |
| 管理前端 | Vue 3 + Element Plus | 简单可用即可 |
