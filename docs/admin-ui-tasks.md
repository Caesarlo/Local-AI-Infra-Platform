# Admin Console UI 任务拆分

> 参考文档：`docs/admin-ui-design.md`
> 技术栈：React + Vite + TypeScript + Tailwind CSS
> 原则：先把基础架构跑通，再逐页实现，最后接真实 API

---

## 阶段总览

| 阶段 | 内容 | 前置依赖 |
|---|---|---|
| **Phase 1** | 基础架构搭建 | 无 |
| **Phase 2** | 通用组件库 | Phase 1 |
| **Phase 3** | 全局布局（Shell + 侧栏 + Tab 导航） | Phase 1、2 |
| **Phase 4** | 登录页 | Phase 1、2、3 |
| **Phase 5** | Dashboard 页 | Phase 2、3 |
| **Phase 6** | Models & Instances 页 | Phase 2、3 |
| **Phase 7** | API Keys 页 | Phase 2、3 |
| **Phase 8** | 请求日志页 | Phase 2、3 |
| **Phase 9** | 用量统计页 | Phase 2、3 |
| **Phase 10** | 审计日志页 | Phase 2、3 |
| **Phase 11** | 对接真实后端 API | Phase 4–10 |

---

## Phase 1：基础架构搭建

> 目标：项目能跑起来，路由能跳转，样式系统完整，Mock 数据可用。

### 1.1 初始化项目

- [x] `npm create vite@latest admin-ui -- --template react-ts`
- [x] 安装全部依赖（见 `admin-ui-design.md` 第12章依赖列表）
- [x] 安装 Tailwind CSS v4.2 并配置 `@tailwindcss/vite` 插件（v4 无需 `tailwind.config.ts` + `postcss.config.js`）
- [x] 配置 `vite.config.ts`：路径别名 `@` → `src/`，代理 `/admin` → `http://127.0.0.1:8000`

### 1.2 Tailwind 视觉系统配置

- [x] 在 `src/index.css` 的 `@theme {}` 中写入完整扩展（v4 方式）：
  - `backgroundImage`：`page-gradient`、`accent-gradient`、`warn-gradient`
  - `colors`：`text.*`、`glass.*`、`status.*`
  - `boxShadow`：`glass`、`glass-sm`、`glass-hover`
  - `borderRadius`：`4xl`
  - `fontSize`：`2xs`
  - `fontFamily`：Inter（英文）+ 思源黑体 SC（中文）
- [x] 在 `src/index.css` 中写入 `@layer components`：
  - `.glass-card`（主卡片毛玻璃）
  - `.glass-card-sm`（次级卡片）
  - `.glass-inner`（内嵌深色块）
  - `.tab-active` / `.tab-inactive`（Tab 胶囊）
  - `.btn-primary` / `.btn-ghost`（按钮变体）
- [x] 在 `index.css` 注册 `@font-face`（Inter Variable + 思源黑体 SC 4 个字重）；字体文件需手动放入 `public/fonts/`

### 1.3 路由配置

- [x] 在 `src/App.tsx` 配置 `BrowserRouter` + `Routes`：
  ```
  /login           → <Login />
  /                → <Navigate to="/dashboard" />
  /* 以下套 <RequireAuth> */
  /dashboard       → <Dashboard />
  /models          → <Models />
  /models/config/new         → <Models />（带 panel open 状态）
  /models/config/:id/edit    → <Models />（带 panel open 状态）
  /keys            → <Keys />
  /keys/new        → <Keys />
  /keys/:id/edit   → <Keys />
  /usage           → <Usage />
  /logs            → <Logs />
  /audit           → <Audit />
  ```
- [x] 创建 `<RequireAuth>` 组件：检查 `localStorage['admin_jwt']`，无则跳 `/login`

### 1.4 TanStack Query 初始化

- [x] 在 `src/main.tsx` 中配置 `QueryClientProvider`
- [x] 设置全局默认值：`staleTime: 30_000`，`retry: 1`

### 1.5 Axios 客户端

- [x] 创建 `src/api/client.ts`：
  - baseURL：`/admin`
  - 请求拦截器：自动附加 `Authorization: Bearer {jwt}`
  - 响应拦截器：
    - 401 → 清除 `localStorage['admin_jwt']`，跳转 `/login`
    - 403 → Sonner toast `"权限不足"`
    - 5xx → Sonner toast `"服务器错误，请稍后重试"`
    - 网络错误 → Sonner toast `"无法连接到服务器"`

### 1.6 Mock 数据层

- [x] 安装 `msw`（Mock Service Worker）用于开发阶段脱离后端独立开发
- [x] 创建 `src/mocks/handlers.ts`，为以下接口提供 Mock 数据：
  - `POST /admin/auth/login`
  - `GET /admin/metrics/summary`
  - `GET /admin/metrics/hardware`
  - `GET /admin/models`
  - `GET /admin/instances`
  - `GET /admin/keys`
- [x] 在 `src/main.tsx` 中仅在 `development` 模式下启用 MSW

### 1.7 Auth 状态管理

- [x] 创建 `src/hooks/useAuth.ts`：
  - `login(token)` → 调用 API → 存 JWT → 跳转 `/dashboard`
  - `logout()` → 清除 JWT → 跳转 `/login`
  - `isAuthenticated` → 读取 JWT 是否存在且未过期
- [ ] 验收：访问 `/dashboard` 自动跳 `/login`；登录后跳回 `/dashboard`；刷新不丢失登录态

---

## Phase 2：通用组件库

> 目标：建立可复用的 UI 原语，后续所有页面基于这套组件拼装。

### 2.1 基础原语

- [ ] **`Button`**：variant = `primary | ghost | danger`，支持 `loading` 状态（内置 Spinner）、`disabled`
- [ ] **`Input`**：带 label、错误提示、前缀图标插槽；与 React Hook Form 兼容
- [ ] **`Select`**：基于 Radix UI Select，支持选项分组，毛玻璃下拉列表
- [ ] **`Spinner`**：大中小三个尺寸，颜色跟随父元素
- [ ] **`Skeleton`**：文字骨架屏（用于表格加载态）
- [ ] **`Badge`**：variant = `success | warning | error | neutral | info`，全圆角胶囊

### 2.2 状态指示

- [ ] **`StatusDot`**：
  - `healthy` → 绿色实心圆
  - `degraded` → 黄色实心圆
  - `offline` → 灰色实心圆
  - `starting` → 蓝色实心圆 + `animate-pulse`
  - `paused` → 橙色实心圆
  - `error` → 红色实心圆

### 2.3 反馈组件

- [ ] **`Modal`**：基于 Radix UI Dialog，毛玻璃背景遮罩，卡片式弹窗，支持标题/内容/底部操作栏插槽
- [ ] **`ConfirmDialog`**：基于 Modal，专用于"吊销 Key""删除配置"等危险操作二次确认
- [ ] **`ConfigPanel`**：右侧滑入抽屉，宽 480px，`position: fixed`，slide-in 动画，独立滚动区域
- [ ] 全局 Toast：在 `App.tsx` 根节点添加 `<Toaster />`（Sonner），位置右下角

### 2.4 数据展示

- [ ] **`DataTable`**：基于 TanStack Table v8
  - 接受 `columns` 定义和 `data` 数组
  - 支持列头排序（点击切换 asc/desc）
  - 分页控件（上一页 / 下一页 / 当前页码）
  - 空状态插槽（无数据时展示）
  - 加载态（行骨架屏）
- [ ] **`FilterBar`**：横向排列的筛选器容器，包含搜索框 + 多个 Select，右侧"清除筛选"按钮

### 2.5 操作控件

- [ ] **`ControlButton`**：实例操作专用按钮
  - action = `pause | start | restart | stop`
  - 每种 action 对应图标（Lucide）+ 文字 + 颜色
  - `disabled` 时变灰 + cursor-not-allowed
  - `loading` 时显示 Spinner，防止重复点击

### 2.6 图表组件

- [ ] **`LineChart`**：基于 Recharts
  - 接受 `data`（时序数组）、`lines`（线条配置，支持多条线）
  - X 轴：时间格式化（`date-fns`）
  - Y 轴：自动 domain
  - Tooltip：毛玻璃样式
  - 响应式宽度（`ResponsiveContainer`）
- [ ] **`BarChart`**：基于 Recharts
  - 接受 `data` 和 `bars` 配置
  - 支持渐变填充（对应 `accent-gradient`）
  - Tooltip 同上

---

## Phase 3：全局布局

> 目标：Shell 骨架搭起来，所有页面共享侧栏和顶部 Tab 导航。

### 3.1 Shell 布局容器

- [ ] 创建 `src/components/layout/Shell.tsx`：
  - 最外层：`min-h-screen bg-page-gradient` 全屏渐变背景
  - 内层容器：`max-w-[1280px] mx-auto p-3 flex gap-2.5`
  - 左侧：`<NodeMonitor />` 固定宽度 220px
  - 右侧：`<MainArea />` flex-1，`glass-card` 样式，`overflow-hidden`
- [ ] `<MainArea>` 内部分为：
  - `<Header>`（72px 高，白色毛玻璃，底部分割线）
  - `<Outlet />`（页面内容区，`p-5 overflow-auto`）

### 3.2 顶部 Tab 导航

- [ ] 创建 `src/components/layout/TabNav.tsx`：
  - Tab 项：Dashboard / Models / API Keys / Usage / Logs
  - 用 `useLocation()` 判断当前路由，激活对应 Tab
  - 点击 Tab → `navigate(path)`
  - 激活样式：`.tab-active`；非激活：`.tab-inactive`
- [ ] Header 右侧插槽：各页面可传入操作按钮（如"创建 Key""添加模型"）

### 3.3 Node Monitor 侧栏

- [ ] 创建 `src/components/layout/NodeMonitor.tsx`：
  - 使用 `useHardwareMetrics()` hook，`refetchInterval: 10_000`
  - 渲染各数据块（Resources / Services / Alerts）
  - 底部：头像 + 用户名 + Settings 按钮（`logout()` 入口）
  - 加载态：各数据块显示骨架屏
- [ ] 创建 `src/hooks/useHardwareMetrics.ts`：
  - 调用 `GET /admin/metrics/hardware`
  - 返回 `{ gpu, vram, cpu, ram, network, services, alerts }`

### 3.4 验收标准

- [ ] 访问任意已登录路由，左侧 Node Monitor 始终显示
- [ ] Tab 高亮随路由切换
- [ ] Node Monitor 每 10s 自动刷新数据

---

## Phase 4：登录页

> 目标：能用 Admin Token 登录，跳转到 Dashboard。

- [ ] 创建 `src/pages/Login.tsx`：
  - 全屏渐变背景（复用 `bg-page-gradient`）
  - 居中毛玻璃卡片（`glass-card`，宽 380px）
  - 表单字段：管理员邮箱（可选）+ Admin Token / Password
  - Token 输入框：`type="password"` + 眼睛图标切换明文（Lucide `Eye`/`EyeOff`）
  - "记住此设备" Checkbox
  - 主按钮：`登录控制台`；次按钮：`查看公开文档`
  - 底部说明文字：仅限内网访问
  - 登录失败：输入框下方 inline 红色错误提示（不用 Toast）
  - 登录成功：跳转 `/dashboard`
- [ ] 创建 `src/api/auth.ts`：`POST /admin/auth/login`

---

## Phase 5：Dashboard 页

> 目标：展示平台实时总览，含 Stat 卡片、请求趋势图、告警区。

- [ ] 创建 `src/pages/Dashboard.tsx`
- [ ] **Stat 卡片区**（三列等宽）：
  - 活跃 API Keys 数
  - 活跃并发（当前 / 最大）
  - P99 延迟
  - 每张卡片：`glass-card`，大数字 Light 300，副标题小字
  - 数据来源：`GET /admin/metrics/summary`，`refetchInterval: 30_000`
- [ ] **请求趋势图**（左侧宽列）：
  - 使用 `<LineChart>`，展示近 1 小时 QPS
  - 数据来源：`GET /admin/metrics/timeseries?range=1h`，`refetchInterval: 30_000`
- [ ] **平台摘要**（右侧窄列）：
  - 静态文本展示：模型名、量化方式、部署组件
  - 数据来源：`GET /admin/models`（取第一个 chat 模型）
- [ ] **告警区**：
  - 数据来源：`GET /admin/alerts`，`refetchInterval: 30_000`
  - 无告警时隐藏该区块
  - 有告警时每条显示 ⚠ 图标 + 告警内容

---

## Phase 6：Models & Instances 页

> 目标：模型配置管理 + 实例启停控制 + 实时健康状态。这是功能最复杂的页面。

### 6.1 模型配置卡片区

- [ ] 创建 `src/pages/Models/index.tsx`
- [ ] 渲染模型卡片列表（`GET /admin/models`，`refetchInterval: 10_000`）
- [ ] 每张卡片（`glass-card`）显示：
  - 模型名、量化方式、tensor_parallel、max_model_len
  - 模型路径
  - 当前活跃请求数
  - `<StatusDot>` + 状态文字
- [ ] 卡片操作按钮（根据状态动态显示）：
  - `healthy` → `[ ⏸ 暂停 ]`
  - `paused / offline / configured` → `[ ▶ 启动 ]`
  - `starting` → `[ ⏳ 启动中... ]`（disabled）
  - 所有状态 → `[ ✎ 编辑 ]` + `[ ⋯ ]` 下拉菜单（重启 / 强制停止 / 删除）
- [ ] Header 右侧：`[ + 添加模型 ]` 按钮

### 6.2 ModelConfigPanel（新增 / 编辑）

- [ ] 创建 `src/pages/Models/ModelConfigPanel.tsx`（使用 `<ConfigPanel>` 组件）
- [ ] 表单字段（使用 React Hook Form）：
  - 模型名称（对外）、显示名称
  - 模型类型（Chat / Embedding / Rerank）Radio
  - 模型路径 / HuggingFace ID
  - 量化方式 Select：无 / FP8 / INT8 / AWQ / GPTQ
  - 基础精度 Select：bfloat16 / float16
  - Tensor Parallel Size 数字输入
  - Max Model Length 数字输入
  - GPU Memory Utilization 数字输入（0.0~1.0）
  - 启用 Prefix KV Cache Checkbox
  - 禁用 vLLM 内置请求日志 Checkbox
  - vLLM 额外参数 Textarea（每行一个参数）
  - 监听地址 + 端口
  - CUDA_VISIBLE_DEVICES 输入框
  - 最大并发数数字输入
- [ ] 保存：`POST /admin/models`（新增）或 `PATCH /admin/models/:id`（编辑）
- [ ] 保存后提示："配置已保存，点击 ▶ 启动 使实例上线"

### 6.3 实例控制 Mutations

- [ ] 创建 `src/hooks/useInstanceControl.ts`：
  - `pause(instanceId)` → `POST /admin/instances/:id/pause` + 乐观更新状态为 `pausing`
  - `start(instanceId)` → `POST /admin/instances/:id/start` + 乐观更新状态为 `starting`
  - `restart(instanceId)` → `POST /admin/instances/:id/restart`
  - `stop(instanceId)` → `POST /admin/instances/:id/stop`
  - 所有操作完成后 `invalidateQueries(['instances'])`

### 6.4 实例列表区

- [ ] 实例列表（`GET /admin/instances`，`refetchInterval: 10_000`）
- [ ] Filter chips：按 model 名称 / 按 status 筛选
- [ ] 每行显示：
  - `<StatusDot>` + 实例 ID + 地址
  - 活跃请求 / 最大并发、队列长度、P95 延迟
  - 最后健康检查时间（`date-fns` 相对时间，如 "3s 前"）
  - `<ControlButton>` 操作按钮组
  - `[ 查看日志 ]` → 跳转 `/logs?instance=:id`

---

## Phase 7：API Keys 页

> 目标：Key 的增删改查 + 吊销 + 一次性展示完整 Key。

- [ ] 创建 `src/pages/Keys/index.tsx`
- [ ] **筛选栏**：状态 / 项目 / 模型 三个 Select 筛选器
- [ ] **Key 列表表格**（`<DataTable>`）：
  - 列：Key 名称 / 脱敏 Key（`sk-Xk9m****NLu`）/ 项目 / 状态 / 今日用量 / 到期时间 / 操作
  - 操作列：`[ 编辑 ]` `[ 吊销 ]`
- [ ] **创建 Key 按钮** → 打开 `<KeyForm>`（`<ConfigPanel>`）
- [ ] 创建 `src/pages/Keys/KeyForm.tsx`：
  - 字段：名称、项目、负责人、允许访问的模型（多选 Checkbox）、QPS/并发限制、日 Token 配额、到期时间
  - 提交：`POST /admin/keys`
- [ ] **一次性 Key 展示 Modal**：
  - 创建成功后弹出，显示完整 Key 字符串
  - `[ 复制 ]` 按钮（`navigator.clipboard.writeText`）
  - `[ 我已保存，关闭 ]` 按钮（关闭后 Key 不再可查）
- [ ] 吊销 Key：`<ConfirmDialog>` 二次确认 → `POST /admin/keys/:id/revoke` → 行状态即时变"已吊销"

---

## Phase 8：请求日志页

> 目标：查询历史请求，支持过滤，点击查看详情。

- [ ] 创建 `src/pages/Logs.tsx`
- [ ] **筛选栏**：Key ID 输入 / 模型 Select / 状态码 Select / `[ 查询 ]`
- [ ] **日志表格**（`<DataTable>`，服务端分页）：
  - 列：时间 / Key ID / 模型 / 状态码（`<Badge>`）/ 耗时 / Tokens / `[ 详情 ]`
  - 分页：每页 20 条，显示总条数
  - 状态码 200 → `success`，429 → `warning`，5xx → `error`
- [ ] **详情 Side Panel**（点击行内`详情`打开）：
  - 展示：request_id、backend_instance、client_ip、error_code、耗时、TTFT
  - 不显示 prompt 正文

---

## Phase 9：用量统计页

> 目标：可视化 Token 消耗趋势，支持时间范围和维度切换。

- [ ] 创建 `src/pages/Usage.tsx`
- [ ] **筛选器**（Header 右侧）：时间范围（今天/近7天/近30天/自定义）、维度（按项目/按 Key/按模型）
- [ ] **Token 趋势图**（`<LineChart>`，多线）：
  - 每条线代表一个项目或 Key
  - 图例点击可显示/隐藏某条线
- [ ] **排行表格**（`<DataTable>`）：
  - 列：排名 / 项目（或 Key）/ 请求数 / Prompt Tokens / Completion Tokens

---

## Phase 10：审计日志页

> 目标：只读展示管理员操作记录。

- [ ] 创建 `src/pages/Audit.tsx`
- [ ] **审计日志表格**（`<DataTable>`，服务端分页）：
  - 列：时间 / 操作人 / 事件描述
  - 时间用 `date-fns` 相对格式（"10 分钟前" / "昨天 09:32"）

---

## Phase 11：对接真实后端 API

> 目标：关闭 MSW，所有页面接真实 `/admin/*` 接口，完成端到端联调。

### 11.1 补全 API 模块

- [ ] `src/api/auth.ts`：login
- [ ] `src/api/keys.ts`：list / create / update / revoke / delete
- [ ] `src/api/models.ts`：list / create / update / delete
- [ ] `src/api/instances.ts`：list / pause / start / restart / stop
- [ ] `src/api/metrics.ts`：summary / timeseries / latency / hardware
- [ ] `src/api/requests.ts`：list（分页 + 过滤）
- [ ] `src/api/usage.ts`：list（按维度 + 时间）
- [ ] `src/api/audit.ts`：list（分页）
- [ ] `src/api/alerts.ts`：list

### 11.2 联调验收清单

- [ ] 登录 / 退出 / JWT 过期自动跳登录页
- [ ] Dashboard 指标正常显示，10s 自动刷新
- [ ] Node Monitor 硬件指标正常显示
- [ ] 创建 Key → 一次性 Key 展示 → 列表刷新
- [ ] 吊销 Key → 列表行即时更新状态
- [ ] 添加模型配置 → 量化参数正确保存
- [ ] 点击启动实例 → 状态变 starting → 变 healthy
- [ ] 点击暂停实例 → 状态变 paused → 新请求不再路由到该实例
- [ ] 请求日志分页正常，详情面板正常
- [ ] 用量趋势图数据正确

---

## 附：文件创建清单

按创建顺序排列：

```
src/
├── index.css                          Phase 1.2
├── main.tsx                           Phase 1.4（QueryClient + MSW）
├── App.tsx                            Phase 1.3（路由）
├── lib/
│   ├── utils.ts                       Phase 1（cn() 工具）
│   └── constants.ts                   Phase 1
├── api/
│   ├── client.ts                      Phase 1.5
│   ├── auth.ts                        Phase 4 / Phase 11
│   ├── keys.ts                        Phase 7 / Phase 11
│   ├── models.ts                      Phase 6 / Phase 11
│   ├── instances.ts                   Phase 6 / Phase 11
│   ├── metrics.ts                     Phase 5 / Phase 11
│   ├── requests.ts                    Phase 8 / Phase 11
│   ├── usage.ts                       Phase 9 / Phase 11
│   ├── audit.ts                       Phase 10 / Phase 11
│   └── alerts.ts                      Phase 5 / Phase 11
├── mocks/
│   └── handlers.ts                    Phase 1.6
├── hooks/
│   ├── useAuth.ts                     Phase 1.7
│   ├── useHardwareMetrics.ts          Phase 3.3
│   └── useInstanceControl.ts         Phase 6.3
├── components/
│   ├── layout/
│   │   ├── Shell.tsx                  Phase 3.1
│   │   ├── NodeMonitor.tsx            Phase 3.3
│   │   ├── TabNav.tsx                 Phase 3.2
│   │   └── PageLayout.tsx             Phase 3.1
│   └── ui/
│       ├── Button.tsx                 Phase 2.1
│       ├── Input.tsx                  Phase 2.1
│       ├── Select.tsx                 Phase 2.1
│       ├── Spinner.tsx                Phase 2.1
│       ├── Skeleton.tsx               Phase 2.1
│       ├── Badge.tsx                  Phase 2.1
│       ├── StatusDot.tsx              Phase 2.2
│       ├── Modal.tsx                  Phase 2.3
│       ├── ConfirmDialog.tsx          Phase 2.3
│       ├── ConfigPanel.tsx            Phase 2.3
│       ├── DataTable.tsx              Phase 2.4
│       ├── FilterBar.tsx              Phase 2.4
│       ├── ControlButton.tsx          Phase 2.5
│       ├── LineChart.tsx              Phase 2.6
│       └── BarChart.tsx               Phase 2.6
├── pages/
│   ├── Login.tsx                      Phase 4
│   ├── Dashboard.tsx                  Phase 5
│   ├── Models/
│   │   ├── index.tsx                  Phase 6.1
│   │   └── ModelConfigPanel.tsx       Phase 6.2
│   ├── Keys/
│   │   ├── index.tsx                  Phase 7
│   │   └── KeyForm.tsx                Phase 7
│   ├── Logs.tsx                       Phase 8
│   ├── Usage.tsx                      Phase 9
│   └── Audit.tsx                      Phase 10
```

---

## 关键注意事项

1. **毛玻璃 blur 只加在卡片容器层**，不加在表格行、列表行上
2. **乐观更新**：暂停/启动实例时先改本地状态，再等服务器确认，保证 UI 响应快
3. **一次性 Key**：后端只在创建时返回完整 Key，前端 Modal 关闭后不可再查，提示要清晰
4. **Inter 字体离线**：把字体文件放 `public/fonts/`，不要依赖 Google CDN（内网访问不了）
5. **MSW 只在 dev 模式启用**：`if (import.meta.env.DEV)` 判断，不要带到生产构建
