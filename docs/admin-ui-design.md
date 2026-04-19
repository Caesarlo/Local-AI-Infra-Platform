# Admin Console UI 设计方案

> 技术栈：React + Vite + Tailwind CSS
> 对接后端：`/admin/*` API（见 design.md 第10章）
> 视觉原型：`web/pencils/pencil-prototype.pen`
> 撰写日期：2026-04-14

---

## 目录

1. [完整技术栈](#1-完整技术栈)
2. [视觉设计规范（源自原型）](#2-视觉设计规范源自原型)
3. [页面布局结构](#3-页面布局结构)
4. [页面与路由规划](#4-页面与路由规划)
5. [各页面详细设计](#5-各页面详细设计)
6. [Models & Instances 页面（重点扩展）](#6-models--instances-页面重点扩展)
7. [通用组件设计](#7-通用组件设计)
8. [实时监控设计](#8-实时监控设计)
9. [数据请求策略](#9-数据请求策略)
10. [认证流程](#10-认证流程)
11. [项目目录结构](#11-项目目录结构)
12. [开发环境搭建](#12-开发环境搭建)

---

## 1. 完整技术栈

| 类别 | 选型 | 理由 |
|---|---|---|
| 构建工具 | **Vite** | 启动快，配置简单 |
| 路由 | **React Router v6** | 标准选择 |
| 服务端状态 | **TanStack Query v5** | 缓存、轮询、错误处理一体化 |
| 表单 | **React Hook Form** | 轻量，与 Tailwind 无缝 |
| 表格 | **TanStack Table v8** | Headless，样式完全自控 |
| 图表 | **Recharts** | React 原生，Tailwind 友好 |
| UI 原语 | **Radix UI** | 无样式 Dialog/Dropdown/Tooltip，自加 Tailwind |
| 图标 | **Lucide React** | 线条图标，与原型风格一致 |
| Toast | **Sonner** | 轻量，API 简洁 |
| HTTP | **Axios** | 统一拦截器处理 401/403 |
| 实时数据 | **原生 EventSource** | 对接后端 SSE 接口，实时 GPU/延迟指标 |
| 日期 | **date-fns** | 格式化日志时间 |

**不引入重型组件库**，全部用 Tailwind 手写，与原型灰阶风格完全一致。

---

## 2. 视觉设计规范

> 结构骨架来自 `pencil-prototype.pen`，视觉风格升级为**冷色毛玻璃 + 悬浮卡片**。
> 参考方向：低饱和冰蓝背景 + `backdrop-blur` 半透明白卡 + 柔和冷色阴影 + 错落层次。

### 2.1 背景系统

页面不使用纯色背景，而是**冷色线性渐变**，从左上到右下：

```css
/* 全局页面背景 */
background: linear-gradient(135deg, #dce8f5 0%, #c8d8ea 40%, #d4dff0 100%);
```

```ts
// tailwind.config.ts
backgroundImage: {
  'page-gradient': 'linear-gradient(135deg, #dce8f5 0%, #c8d8ea 40%, #d4dff0 100%)',
}
// 使用：<div className="min-h-screen bg-page-gradient">
```

### 2.2 毛玻璃卡片系统

所有卡片使用毛玻璃效果，**不要在列表行上加 blur**，只用于容器级卡片。

```css
/* 标准毛玻璃卡片 */
background: rgba(255, 255, 255, 0.62);
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px);
border: 1px solid rgba(255, 255, 255, 0.75);
border-radius: 24px;
box-shadow: 0 8px 32px rgba(90, 130, 190, 0.12),
            0 2px 8px rgba(90, 130, 190, 0.08);
```

```ts
// tailwind.config.ts 扩展（与上面 css 等价的 Tailwind 写法）
// 直接用 Tailwind 工具类组合：
// bg-white/60 backdrop-blur-xl border border-white/75 rounded-3xl
// shadow-[0_8px_32px_rgba(90,130,190,0.12),0_2px_8px_rgba(90,130,190,0.08)]
```

**三种卡片层级：**

| 层级 | 用途 | 透明度 | 模糊 | 阴影强度 |
|---|---|---|---|---|
| 主卡片（浮起） | 模型卡、Stat 卡 | `bg-white/60` | `backdrop-blur-xl` | 大阴影 |
| 次卡片（内嵌） | 实例列表区、表格 | `bg-white/40` | `backdrop-blur-md` | 小阴影 |
| 深色卡片（强调） | Node Monitor 子块 | `bg-white/20` | `backdrop-blur-sm` | 无阴影，内描边 |

### 2.3 色彩系统

#### 文字色

| 用途 | 色值 | Tailwind |
|---|---|---|
| 主标题 / 大数字 | `#1e2d3d` | `text-[#1e2d3d]` |
| 区块标题 | `#334455` | `text-[#334455]` |
| 正文 | `#4a5c6e` | `text-[#4a5c6e]` |
| 次要说明 | `#7a8fa0` | `text-[#7a8fa0]` |
| 标签（小写灰） | `#9eb0c0` | `text-[#9eb0c0]` |
| 页面外框标题 | `#6F6F6F` | `text-neutral-500` |

#### 边框色

| 用途 | 色值 |
|---|---|
| 毛玻璃卡片外边框 | `rgba(255,255,255,0.75)` |
| 内嵌区块边框 | `rgba(255,255,255,0.5)` |
| 分割线 | `rgba(160,185,210,0.3)` |

#### 强调色（图表 & 高亮）

使用**渐变色块**作为视觉焦点，面积要小，点睛即可：

| 用途 | 渐变 | Tailwind |
|---|---|---|
| 主渐变（请求趋势线） | `#6366f1 → #3b82f6` | `from-indigo-500 to-blue-500` |
| 次渐变（Token 用量） | `#8b5cf6 → #6366f1` | `from-violet-500 to-indigo-500` |
| 警告渐变（错误率） | `#f97316 → #ef4444` | `from-orange-500 to-red-500` |
| 激活 Tab / 主按钮 | `#334455`（深灰蓝纯色） | `bg-[#334455] text-white` |

#### 状态色（同样降饱和度，配合冷色背景）

| 状态 | 色值 | 说明 |
|---|---|---|
| healthy | `#34d399` | 冷绿，非纯绿 |
| degraded | `#fbbf24` | 暖黄 |
| offline | `#94a3b8` | 冷灰蓝 |
| starting | `#60a5fa` + pulse | 冷蓝 |
| paused | `#fb923c` | 橙色 |
| error | `#f87171` | 冷红 |

### 2.4 字体

```css
/* Inter 需引入，推荐 Google Fonts 或本地部署 */
font-family: 'Inter', system-ui, sans-serif;
```

内网部署建议把 Inter 字体文件放到项目 `public/fonts/` 目录，避免访问 Google CDN。

| 场景 | 大小 | 粗细 | 色值 |
|---|---|---|---|
| 大数字（Stat 卡） | 32px | 300（Light） | `#1e2d3d` |
| 区块标题 | 16px | 600 | `#334455` |
| 侧栏主标题 | 18px | 700 | `#1e2d3d` |
| Tab 导航文字 | 14px | 500 | `#4a5c6e` |
| 正文 / 列表 | 13px | 400 | `#4a5c6e` |
| 次要说明 / 时间戳 | 12px | 400 | `#9eb0c0` |
| 标签（全大写） | 11px | 600 | `#9eb0c0` |

字重对比要明显：大数字用 Light（300），标题用 SemiBold（600），正文用 Regular（400）。

### 2.5 阴影与层次

模拟"光从左上方打来"，阴影偏右下，冷蓝色调：

```ts
// tailwind.config.ts
boxShadow: {
  // 主卡片（明显悬浮感）
  'glass':    '0 8px 32px rgba(90, 130, 190, 0.14), 0 2px 8px rgba(90, 130, 190, 0.08)',
  // 次卡片（轻微悬浮）
  'glass-sm': '0 4px 16px rgba(90, 130, 190, 0.10), 0 1px 4px rgba(90, 130, 190, 0.06)',
  // 悬停时（更强调）
  'glass-hover': '0 12px 40px rgba(90, 130, 190, 0.20), 0 4px 12px rgba(90, 130, 190,0.12)',
}
```

### 2.6 圆角

| 元素 | 圆角 | Tailwind |
|---|---|---|
| 最外层页面容器 | 24px | `rounded-3xl` |
| 主卡片 | 24px | `rounded-3xl` |
| 次级内嵌区块 | 16px | `rounded-2xl` |
| 小标签 / Badge | 999px（全圆） | `rounded-full` |
| 输入框 / 按钮 | 12px | `rounded-xl` |
| Tab 胶囊 | 999px | `rounded-full` |

### 2.7 整体布局尺寸（与原型对齐）

```
页面背景：全屏渐变，min-h-screen
  └── Shell 容器：max-w-[1280px] mx-auto，rounded-3xl，p-3，glass 阴影
        ├── 左侧 Node Monitor：w-[220px]，白色毛玻璃，右边线
        └── 主内容区：flex-1，rounded-2xl，内背景更深的毛玻璃
              ├── 顶部 Header：h-[72px]，白色毛玻璃，底部边线
              └── 内容区：p-5，各子卡片独立毛玻璃
```

---

## 3. 页面布局结构

### 全局 Shell（对应 `shell` frame）

```
┌─────────────────────────────────────────────────────────┐
│  Shell（bg:#F6F6F6，rounded-xl，gap-2.5）               │
│  ┌─────────────────┬───────────────────────────────────┐ │
│  │  Node Monitor   │  主内容区（bg:#F6F6F6，rounded）  │ │
│  │  220px 白色     │  ┌─────────────────────────────┐  │ │
│  │  右边线分割     │  │ Header（白色，72px）         │  │ │
│  │                 │  │ 左：Tab 导航                 │  │ │
│  │ GPU Server 01   │  │ 右：操作按钮（新建 Key 等）  │  │ │
│  │ Resources       │  └─────────────────────────────┘  │ │
│  │ Services        │  ┌─────────────────────────────┐  │ │
│  │ Alerts          │  │ Content（padding-20）        │  │ │
│  │                 │  │ 页面主体内容                 │  │ │
│  │ [Ops Admin]     │  └─────────────────────────────┘  │ │
│  │ [Settings]      │                                   │ │
│  └─────────────────┴───────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 顶部 Tab 导航（对应 headLeft）

```
[ Usage ]  [ Logs ]  [ Models ]  [ API Keys ]  [●Dashboard●]
```
- 当前激活 Tab：`bg-neutral-900 text-white rounded-full px-4 py-1.5`
- 非激活 Tab：`text-neutral-500 hover:text-neutral-800 rounded-full px-4 py-1.5`

### Node Monitor 侧栏（实时刷新，10s 轮询）

```
Node Monitor

[ GPU Server 01        ]   ← #F6F6F6 块，rounded-lg
  4x RTX 2000 Ada

Resources
[ GPU 72%              ]   ← 实时数据，SSE 推送
  VRAM 13.6 / 16 GB
  CPU 41%
  RAM 22 / 64 GB
  Network 320 Mbps

Services
[ Requests 6           ]
  Queue 2
  Status Healthy
  Latency P95 2.8s
  Error Rate 0.3%

Alerts
[ 1 instance warming up ]
  2 keys near quota

          ↕ spacer

[ 头像  Ops Admin      ]
  Platform Owner
[ Settings             ]
```

---

## 4. 页面与路由规划

```
/login                     → 登录页

/                          → 重定向 → /dashboard

/dashboard                 → 系统总览（对应原型 Dashboard tab）
/logs                      → 请求日志（对应原型 Logs tab）
/models                    → 模型实例管理（对应原型 Models tab）
/models/config/new         → 新增模型配置
/models/config/:id/edit    → 编辑模型配置（含量化设置）
/keys                      → API Key 管理（对应原型 API Keys tab）
/keys/new                  → 创建 Key
/keys/:id/edit             → 编辑 Key
/usage                     → 用量统计（对应原型 Usage tab）
/audit                     → 审计日志
```

所有路由（`/login` 除外）套在 `<RequireAuth>` 内，未登录跳转 `/login`。

---

## 5. 各页面详细设计

### 5.1 Login 页（对应原型 Login frame）

```
┌──────────────────────────────────────┐
│  bg:#F6F6F6                          │
│                                      │
│       Local AI Infra                 │
│       管理员登录                      │
│  使用 Admin Token 或团队帐号进入控制台 │
│                                      │
│  ┌──────────────────────────────┐   │
│  │ Admin Console                │   │
│  │ [管理员邮箱              ]   │   │
│  │ [Admin Token / Password  ]   │   │
│  │ ☑ 记住此设备    忘记 Token?  │   │
│  │ [      登录控制台      ]     │   │
│  │ [      查看公开文档    ]     │   │
│  └──────────────────────────────┘   │
│  仅限内网部署访问，所有操作均写入审计日志 │
│  Nginx IP 白名单 + HTTPS + Redis Key 缓存│
└──────────────────────────────────────┘
```

---

### 5.2 Dashboard 页（对应原型 Dashboard tab）

Header 右侧：`[ 退出项目 / Key ]` 按钮

Content 区分三块：

**① Stat Cards（3列等宽，#E9E9E9 背景）**
```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  活跃 API Keys   │  │  活跃并发         │  │  P99 延迟        │
│  128             │  │  6 / 8           │  │  2.8s            │
│  今日新增 0，共8个│  │  Gemma4 跑中，   │  │  TTFT P50 0.3s   │
│                  │  │  距离 FP8 限制0%  │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

**② 下方两列（左宽右窄）**

左列：请求趋势折线图（Recharts，高度 ~200px）
右列：平台摘要
```
┌──────────────────────────────┐  ┌────────────────────┐
│ 请求趋势（近1小时）           │  │ 平台摘要            │
│ [LineChart: QPS vs time]     │  │ 模型：Gemma4-27B   │
│                              │  │ FP8 量化           │
│                              │  │ 部署：Nginx+FastAPI │
└──────────────────────────────┘  └────────────────────┘
```

**③ 告警待处理区（白底卡片，红色警示）**
```
1 个实例刚启动中
2 个 API key 接近配额
GPU 显存峰值 91%，未超 OOM
```

---

### 5.3 Usage 页

Header 右侧：时间范围筛选器 `[今天 ▼]` `[按项目 ▼]` `[全部模型 ▼]`

Content：
- 上部：Token 用量趋势折线图（多线，每条线一个项目）
- 下部：项目用量排行表（排名 / 项目 / 请求数 / Prompt Tokens / Completion Tokens）

---

### 5.4 Logs 页（请求日志）

Header 右侧：`[ Key: ___ ]` `[ 模型 ▼ ]` `[ 状态 ▼ ]` `[ 查询 ]`

Content：
- 表头行：时间 / Key / 模型 / 状态码 / 耗时 / Tokens / 操作
- 数据行（#E3E3E3 背景块内）
- 点击"详情"：右侧 Side Panel 弹出，展示 request_id / instance / IP / 错误信息

---

### 5.5 API Keys 页

Header 右侧：`[ 创建 Key ]` 按钮（深色）

Filter 行：`[ 状态: Active ▼ ]` `[ 项目: team-xxx ▼ ]` `[ 模型: gemma4-27b ▼ ]`

表格列：Key 名称 / 项目 / 文件类型 / GPU/并发 / 最近使用 / 操作

操作列：`[ 编辑 ]` `[ 吊销 ]`

创建成功弹窗（一次性展示完整 Key，提示复制保存）

---

## 6. Models & Instances 页面（重点扩展）

这是本次新增需求的核心页面，分为两个区域。

### 6.1 Header

```
Tab 导航：[ Usage ] [ Logs ] [●Models●] [ API Keys ] [ Dashboard ]
右侧按钮：[ 添加模型 ]
```

### 6.2 模型配置卡片区（上半部分）

每个已配置的模型显示为一张卡片（#E4E4E4 背景，rounded-2xl，padding-18px）：

```
┌───────────────────────────────────────────────────┐
│  Gemma4-27B-MoE                      ● healthy    │
│  FP8  tensor_parallel=4  max_model_len=32768       │
│  路径: /models/gemma-4-27b-it                     │
│  活跃请求: 6/8                                     │
│                         [ ⏸ 暂停 ] [ ✎ 编辑 ] [ ⋯ ]│
└───────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────┐
│  BGE-M3 Embedding                    ● healthy    │
│  FP16  GPU: shared /v1/embeddings                 │
│  路径: BAAI/bge-m3                               │
│  活跃请求: 中 42%                                 │
│                         [ ⏸ 暂停 ] [ ✎ 编辑 ] [ ⋯ ]│
└───────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────┐
│  Rerank Service                      ● degraded   │
│  CPU/GPU 可插拔  bge-reranker-v2-m3              │
│  状态: degraded                                   │
│                         [ ▶ 启动 ] [ ✎ 编辑 ] [ ⋯ ]│
└───────────────────────────────────────────────────┘

                                       [ + 添加模型 ]
```

**卡片交互规则：**
- 状态 `healthy` → 显示 `[ ⏸ 暂停 ]`（暂停后停止接受新请求，等待当前请求完成）
- 状态 `paused` / `offline` → 显示 `[ ▶ 启动 ]`
- 状态 `starting` → 显示 `[ ⏳ 启动中... ]`（disabled，蓝色 pulse）
- `[ ⋯ ]` 下拉菜单：重启 / 强制停止 / 删除配置

**暂停 vs 下线的区别：**

| 操作 | 行为 | 恢复时间 |
|---|---|---|
| 暂停（Pause） | 停止路由新请求，等现有请求跑完，进程保持运行 | 秒级恢复 |
| 下线（Offline） | 直接摘除，进程仍在 | 秒级恢复 |
| 停止（Stop） | 终止 vLLM 进程，释放 GPU 显存 | 分钟级（需重载模型） |

### 6.3 新增 / 编辑模型配置（Side Panel 或独立页）

点击"添加模型"或"编辑"，右侧滑出一个 Panel（宽 480px）：

```
┌──────────────────────────────────────────────────┐
│  配置模型                                     ×  │
├──────────────────────────────────────────────────┤
│                                                  │
│  基本信息                                        │
│  ─────────────────────────────────────────────  │
│  模型名称（对外暴露）                             │
│  [ gemma4-27b                               ]   │
│                                                  │
│  显示名称                                        │
│  [ Gemma 4 27B MoE                          ]   │
│                                                  │
│  模型类型                                        │
│  ○ Chat（文本生成）  ○ Embedding  ○ Rerank       │
│                                                  │
│  模型路径 / HuggingFace ID                       │
│  [ /models/gemma-4-27b-it                   ]   │
│                                                  │
│  量化配置                                        │
│  ─────────────────────────────────────────────  │
│  量化方式                                        │
│  [ FP8 ▼ ]  （无 / FP8 / INT8 / AWQ / GPTQ）   │
│                                                  │
│  基础精度                                        │
│  [ bfloat16 ▼ ]  （float16 / bfloat16）         │
│                                                  │
│  Tensor Parallel Size                           │
│  [ 4  ]  （可用 GPU 数量）                       │
│                                                  │
│  Max Model Length（tokens）                     │
│  [ 32768  ]                                     │
│                                                  │
│  GPU Memory Utilization                         │
│  [ 0.85 ]  (0.0 ~ 1.0)                         │
│                                                  │
│  ☑ 启用 Prefix KV Cache                        │
│  ☑ 禁用 vLLM 内置请求日志                       │
│                                                  │
│  vLLM 额外参数（高级）                           │
│  [ --trust-remote-code                      ]   │
│    （每行一个参数，直接透传给 vllm serve）        │
│                                                  │
│  部署配置                                        │
│  ─────────────────────────────────────────────  │
│  监听地址                                        │
│  [ 127.0.0.1 ]  端口 [ 8001 ]                  │
│                                                  │
│  CUDA_VISIBLE_DEVICES                           │
│  [ 0,1,2,3                                  ]   │
│                                                  │
│  最大并发数（调度层限制）                         │
│  [ 8  ]                                         │
│                                                  │
├──────────────────────────────────────────────────┤
│  [ 取消 ]              [ 保存配置 ]              │
└──────────────────────────────────────────────────┘
```

**保存后行为：**
- 仅保存配置到数据库，**不自动启动**
- 页面提示："配置已保存，点击 ▶ 启动 使实例上线"

### 6.4 实例池与健康状态（下半部分）

白色卡片，filter chip 行 + 实例列表：

```
实例池与健康状态

[ model=gemma4-27b ] [ status=healthy ] [ 清除 ]

┌─────────────────────────────────────────────────────────────┐
│  gemma4-inst-1  127.0.0.1:8001  ● healthy                  │
│  活跃请求 6/8  队列 0  P95 延迟 2.8s  最后检查 3s 前        │
│  今日请求 1,203  TTFT P50 0.68s                             │
│                          [ 暂停 ] [ 重启 ] [ 查看日志 ]     │
├─────────────────────────────────────────────────────────────┤
│  emb-inst-1  127.0.0.1:8010  ● healthy                     │
│  活跃请求 5/32  队列 0  平均延迟 0.08s  最后检查 2s 前      │
│  今日请求 12,304                                            │
│                          [ 暂停 ] [ 重启 ] [ 查看日志 ]     │
├─────────────────────────────────────────────────────────────┤
│  warmup-gemma4-inst-2  127.0.0.1:8002  ● starting          │
│  warmup 请求进行中...                                       │
│                          [ 等待... ]                        │
└─────────────────────────────────────────────────────────────┘
```

**行内操作：**
- `[ 暂停 ]`：调用 `POST /admin/instances/:id/pause`
- `[ 重启 ]`：调用 `POST /admin/instances/:id/restart`（graceful restart）
- `[ 查看日志 ]`：跳转到 `/logs?instance=:id`（带预填过滤条件）

---

## 7. 通用组件设计

### StatusDot

```tsx
<StatusDot status="healthy" />   // ● 绿色
<StatusDot status="degraded" />  // ● 黄色
<StatusDot status="offline" />   // ● 灰色
<StatusDot status="starting" />  // ● 蓝色 + animate-pulse
<StatusDot status="paused" />    // ● 橙色（新增）
```

### Badge

```tsx
<Badge variant="success">活跃</Badge>
<Badge variant="warning">暂停中</Badge>
<Badge variant="error">429</Badge>
<Badge variant="neutral">disabled</Badge>
<Badge variant="info">starting</Badge>
```

### ControlButton（操作按钮，带状态禁用）

```tsx
// 暂停按钮
<ControlButton
  action="pause"
  disabled={status === 'starting'}
  onClick={handlePause}
/>

// 启动按钮
<ControlButton
  action="start"
  disabled={status === 'starting'}
  onClick={handleStart}
/>
```

样式：`rounded-lg bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700`

### ConfigPanel（侧滑 Panel）

基于 Radix UI `Dialog`，从右侧滑入，宽 480px：

```
右侧抽屉，position: fixed right-0 top-0 h-full w-[480px]
背景：white，left border: #EAEAEA 1px
动画：slide-in-from-right 200ms
```

### DataTable

基于 TanStack Table v8，封装：
- 列定义传入
- 排序（点击列头）
- 分页控件
- 空状态展示
- 加载骨架屏

---

## 8. 实时监控设计

### 8.1 数据来源

| 数据 | 来源 | 刷新机制 |
|---|---|---|
| GPU % / VRAM / CPU / RAM | `GET /admin/metrics/hardware` | 10s 轮询 |
| 实例活跃请求 / 队列 | `GET /admin/models` | 10s 轮询 |
| 请求 QPS 趋势 | `GET /admin/metrics/timeseries` | 30s 轮询 |
| 实时延迟 P50/P95/P99 | `GET /admin/metrics/latency` | 10s 轮询 |
| 告警事件 | `GET /admin/alerts` | 30s 轮询 |

> 轮询 vs SSE：内部工具 10s 轮询完全够用，SSE 的实现成本更高且对内网运维没有实质收益。Dashboard 不需要毫秒级实时，10s 已经能及时反映 GPU OOM 或实例崩溃。

### 8.2 Node Monitor 侧栏实时数据

```
Node Monitor                           ← 固定，不会因页面切换消失

GPU Server 01
4x RTX 2000 Ada

Resources
  GPU    [████████░░] 72%
  VRAM   13.6 / 16 GB（每卡）
  CPU    41%
  RAM    22 / 64 GB
  Net    320 Mbps

Services
  Requests  6
  Queue     2
  Status    Healthy
  P95       2.8s
  Error     0.3%

Alerts
  ⚠ 1 instance warming up
  ⚠ 2 keys near quota
```

GPU / VRAM 数据需要后端暴露 Prometheus metrics 并封装为 `/admin/metrics/hardware` 接口。

### 8.3 Models 页实例行内实时数据

每行实例数据通过 TanStack Query `refetchInterval: 10_000` 轮询刷新：

```tsx
const { data: instances } = useQuery({
  queryKey: ['instances'],
  queryFn: api.models.listInstances,
  refetchInterval: 10_000,  // 10s 自动刷新
  refetchIntervalInBackground: false,  // 页面隐藏时暂停，省网络
})
```

### 8.4 暂停/启动的 UI 状态机

```
healthy ──[点击暂停]──► pausing（按钮变灰 + spinner）
                           │
                     (后端确认)
                           │
                           ▼
                        paused ──[点击启动]──► starting（蓝色 pulse）
                                                  │
                                            (warmup 完成)
                                                  │
                                                  ▼
                                               healthy
```

状态变化通过乐观更新（optimistic update）立刻反映在 UI，再由下一次轮询数据确认。

---

## 9. 数据请求策略

### TanStack Query 模式

```ts
// Dashboard 统计（30s 刷新）
useQuery({ queryKey: ['metrics/summary'], queryFn: api.metrics.summary, refetchInterval: 30_000 })

// 实例状态（10s 刷新）
useQuery({ queryKey: ['instances'], queryFn: api.models.listInstances, refetchInterval: 10_000 })

// Node Monitor 硬件指标（10s 刷新）
useQuery({ queryKey: ['metrics/hardware'], queryFn: api.metrics.hardware, refetchInterval: 10_000 })

// Key 列表（手动刷新，不自动轮询）
useQuery({ queryKey: ['keys', filters], queryFn: () => api.keys.list(filters), staleTime: 30_000 })
```

### 暂停/启动 Mutation

```ts
const pauseMutation = useMutation({
  mutationFn: (instanceId: string) => api.instances.pause(instanceId),
  onMutate: async (instanceId) => {
    // 乐观更新：立刻把 UI 状态改为 pausing
    await queryClient.cancelQueries({ queryKey: ['instances'] })
    queryClient.setQueryData(['instances'], (old) =>
      old.map(inst => inst.id === instanceId ? { ...inst, status: 'pausing' } : inst)
    )
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['instances'] }),
})
```

### 错误处理

| HTTP 状态 | 行为 |
|---|---|
| 401 | Axios 拦截器清除 token，跳转 `/login` |
| 403 | Sonner toast："权限不足" |
| 409 | 实例操作冲突，toast："实例当前状态不允许此操作" |
| 5xx | toast："服务器错误，请稍后重试" |
| 网络错误 | toast："无法连接到服务器" |

---

## 10. 认证流程

```
用户访问 /dashboard
  → RequireAuth 检查 localStorage['admin_jwt']
  → 无 token → 跳转 /login

登录页：输入 Admin Token
  → POST /admin/auth/login { token }
  → 返回 JWT（1小时有效）
  → 存入 localStorage['admin_jwt']
  → 跳转 /dashboard

所有请求：Axios 拦截器自动添加 Authorization: Bearer {jwt}

JWT 过期（401）：清除 token → 跳转 /login
```

---

## 11. 项目目录结构

```
services/admin-ui/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx                       # 路由 + Provider
│   ├── api/
│   │   ├── client.ts                 # Axios 实例 + 拦截器
│   │   ├── auth.ts
│   │   ├── keys.ts
│   │   ├── models.ts                 # 模型配置 + 实例控制
│   │   ├── instances.ts              # pause/start/restart
│   │   ├── metrics.ts                # hardware + timeseries + latency
│   │   ├── usage.ts
│   │   ├── requests.ts
│   │   └── audit.ts
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Models/
│   │   │   ├── index.tsx             # 模型卡片 + 实例列表
│   │   │   └── ModelConfigPanel.tsx  # 新增/编辑侧滑面板（含量化配置）
│   │   ├── Keys/
│   │   │   ├── index.tsx
│   │   │   └── KeyForm.tsx
│   │   ├── Usage.tsx
│   │   ├── Logs.tsx
│   │   └── Audit.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Shell.tsx             # 整体 Shell 布局
│   │   │   ├── NodeMonitor.tsx       # 左侧实时监控侧栏
│   │   │   ├── TabNav.tsx            # 顶部 Tab 导航
│   │   │   └── PageLayout.tsx        # 内容区 wrapper
│   │   ├── ui/
│   │   │   ├── Badge.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── ControlButton.tsx     # pause/start/restart 操作按钮
│   │   │   ├── Card.tsx
│   │   │   ├── ConfigPanel.tsx       # 右侧滑入 Panel
│   │   │   ├── DataTable.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Spinner.tsx
│   │   │   └── StatusDot.tsx
│   │   └── charts/
│   │       ├── LineChart.tsx
│   │       └── BarChart.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useInstanceControl.ts     # pause/start/restart mutations + 乐观更新
│   │   └── useHardwareMetrics.ts     # Node Monitor 数据轮询
│   └── lib/
│       ├── utils.ts                  # cn() 等工具
│       └── constants.ts
```

---

## 12. 开发环境搭建

```bash
cd services/
npm create vite@latest admin-ui -- --template react-ts
cd admin-ui

npm install \
  react-router-dom \
  @tanstack/react-query \
  @tanstack/react-table \
  react-hook-form \
  recharts \
  @radix-ui/react-dialog \
  @radix-ui/react-dropdown-menu \
  @radix-ui/react-select \
  @radix-ui/react-tooltip \
  @radix-ui/react-switch \
  lucide-react \
  sonner \
  axios \
  date-fns \
  clsx \
  tailwind-merge

npm install -D tailwindcss postcss autoprefixer @tailwindcss/forms
npx tailwindcss init -p
```

### vite.config.ts

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/admin': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/v1':    { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
})
```

### tailwind.config.ts（冷色毛玻璃风格）

```ts
import forms from '@tailwindcss/forms'
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },

      // 背景渐变
      backgroundImage: {
        'page-gradient': 'linear-gradient(135deg, #dce8f5 0%, #c8d8ea 40%, #d4dff0 100%)',
        'accent-gradient':   'linear-gradient(135deg, #6366f1, #3b82f6)',
        'accent-gradient-2': 'linear-gradient(135deg, #8b5cf6, #6366f1)',
        'warn-gradient':     'linear-gradient(135deg, #f97316, #ef4444)',
      },

      // 语义化颜色
      colors: {
        text: {
          primary:   '#1e2d3d',
          secondary: '#334455',
          body:      '#4a5c6e',
          muted:     '#7a8fa0',
          subtle:    '#9eb0c0',
        },
        glass: {
          border:    'rgba(255,255,255,0.75)',
          'border-inner': 'rgba(255,255,255,0.5)',
          divider:   'rgba(160,185,210,0.3)',
        },
        status: {
          healthy:  '#34d399',
          degraded: '#fbbf24',
          offline:  '#94a3b8',
          starting: '#60a5fa',
          paused:   '#fb923c',
          error:    '#f87171',
        },
      },

      // 阴影
      boxShadow: {
        'glass':       '0 8px 32px rgba(90,130,190,0.14), 0 2px 8px rgba(90,130,190,0.08)',
        'glass-sm':    '0 4px 16px rgba(90,130,190,0.10), 0 1px 4px rgba(90,130,190,0.06)',
        'glass-hover': '0 12px 40px rgba(90,130,190,0.20), 0 4px 12px rgba(90,130,190,0.12)',
      },

      // 圆角
      borderRadius: {
        '4xl': '2rem',    // 32px，最外层容器
      },

      // 字号
      fontSize: {
        '2xs': ['11px', { lineHeight: '16px' }],
      },
    },
  },
  plugins: [forms],
} satisfies Config
```

### index.css（全局基础样式）

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 引入 Inter 字体（放在 public/fonts/ 目录） */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Variable.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap;
}

/* 毛玻璃卡片工具类 */
@layer components {
  .glass-card {
    @apply bg-white/60 backdrop-blur-xl border border-white/75 rounded-3xl shadow-glass;
  }
  .glass-card-sm {
    @apply bg-white/40 backdrop-blur-md border border-white/50 rounded-2xl shadow-glass-sm;
  }
  .glass-inner {
    @apply bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl;
  }

  /* 激活 Tab 胶囊 */
  .tab-active {
    @apply bg-[#334455] text-white rounded-full px-4 py-1.5 text-sm font-medium;
  }
  .tab-inactive {
    @apply text-[#7a8fa0] hover:text-[#334455] rounded-full px-4 py-1.5 text-sm font-medium transition-colors;
  }

  /* 主按钮 */
  .btn-primary {
    @apply bg-[#334455] hover:bg-[#1e2d3d] text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors;
  }
  /* 次按钮 */
  .btn-ghost {
    @apply bg-white/40 hover:bg-white/60 border border-white/60 text-[#4a5c6e] rounded-xl px-4 py-2 text-sm font-medium transition-all;
  }
}
```

---

## 附：与后端 API 对应关系（含新增接口）

| 页面/功能 | 调用接口 |
|---|---|
| Dashboard 统计 | `GET /admin/metrics/summary` |
| Dashboard 趋势图 | `GET /admin/metrics/timeseries?range=1h` |
| Node Monitor 硬件 | `GET /admin/metrics/hardware` |
| Key 列表 | `GET /admin/keys` |
| 创建 / 编辑 Key | `POST /admin/keys` / `PATCH /admin/keys/:id` |
| 吊销 Key | `POST /admin/keys/:id/revoke` |
| **模型配置列表** | `GET /admin/models` |
| **新增模型配置** | `POST /admin/models` |
| **编辑模型配置** | `PATCH /admin/models/:id` |
| **删除模型配置** | `DELETE /admin/models/:id` |
| 实例列表 | `GET /admin/instances` |
| **暂停实例** | `POST /admin/instances/:id/pause` |
| **启动实例** | `POST /admin/instances/:id/start` |
| **重启实例** | `POST /admin/instances/:id/restart` |
| **强制停止** | `POST /admin/instances/:id/stop` |
| 手动上下线 | `PATCH /admin/instances/:id` |
| 用量统计 | `GET /admin/usage` |
| 请求日志 | `GET /admin/requests` |
| 审计日志 | `GET /admin/audit` |
