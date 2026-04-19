import {
  Activity,
  ArrowLeft,
  ChartColumnBig,
  Layers3,
  Palette,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'

type ColorToken = {
  name: string
  token: string
  value: string
  textClass?: string
}

type GradientToken = {
  name: string
  token: string
  value: string
  className: string
}

type StatusToken = {
  name: string
  value: string
}

const textColors: ColorToken[] = [
  { name: '主标题 / 大数字', token: 'text-text-primary', value: '#1e2d3d', textClass: 'text-text-primary' },
  { name: '区块标题', token: 'text-text-secondary', value: '#334455', textClass: 'text-text-secondary' },
  { name: '正文', token: 'text-text-body', value: '#4a5c6e', textClass: 'text-text-body' },
  { name: '次要说明', token: 'text-text-muted', value: '#7a8fa0', textClass: 'text-text-muted' },
  { name: '标签小字', token: 'text-text-subtle', value: '#9eb0c0', textClass: 'text-text-subtle' },
]

const borderColors: ColorToken[] = [
  { name: '毛玻璃外边框', token: 'glass-border', value: 'rgba(255,255,255,0.75)' },
  { name: '内嵌区块边框', token: 'glass-border-inner', value: 'rgba(255,255,255,0.5)' },
  { name: '分割线', token: 'glass-divider', value: 'rgba(160,185,210,0.3)' },
]

const gradients: GradientToken[] = [
  {
    name: '主渐变',
    token: 'bg-accent-gradient',
    value: '#6366f1 → #3b82f6',
    className: 'bg-accent-gradient',
  },
  {
    name: '次渐变',
    token: 'bg-accent-gradient-2',
    value: '#8b5cf6 → #6366f1',
    className: 'bg-accent-gradient-2',
  },
  {
    name: '警告渐变',
    token: 'bg-warn-gradient',
    value: '#f97316 → #ef4444',
    className: 'bg-warn-gradient',
  },
]

const statusColors: StatusToken[] = [
  { name: 'healthy', value: '#34d399' },
  { name: 'degraded', value: '#fbbf24' },
  { name: 'offline', value: '#94a3b8' },
  { name: 'starting', value: '#60a5fa' },
  { name: 'paused', value: '#fb923c' },
  { name: 'error', value: '#f87171' },
]

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Palette
  title: string
  description: string
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="glass-inner flex h-11 w-11 items-center justify-center">
        <Icon className="h-5 w-5 text-text-secondary" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      </div>
    </div>
  )
}

function ColorCard({ item }: { item: ColorToken }) {
  return (
    <div className="glass-card-sm p-4">
      <div
        className="mb-4 h-16 rounded-2xl border border-white/70"
        style={{ backgroundColor: item.value }}
      />
      <p className="text-sm font-semibold text-text-primary">{item.name}</p>
      <p className="mt-1 text-xs text-text-muted">{item.token}</p>
      <p className="mt-3 text-xs text-text-subtle">{item.value}</p>
      {item.textClass ? (
        <p className={`mt-4 text-sm ${item.textClass}`}>The quick brown fox jumps over the lazy dog.</p>
      ) : null}
    </div>
  )
}

function GradientCard({ item }: { item: GradientToken }) {
  return (
    <div className="glass-card-sm overflow-hidden p-0">
      <div className={`h-28 w-full ${item.className}`} />
      <div className="p-4">
        <p className="text-sm font-semibold text-text-primary">{item.name}</p>
        <p className="mt-1 text-xs text-text-muted">{item.token}</p>
        <p className="mt-3 text-xs text-text-subtle">{item.value}</p>
      </div>
    </div>
  )
}

function StatusCard({ item }: { item: StatusToken }) {
  return (
    <div className="glass-card-sm flex items-center justify-between gap-4 p-4">
      <div>
        <p className="text-sm font-semibold text-text-primary">{item.name}</p>
        <p className="mt-1 text-xs text-text-subtle">{item.value}</p>
      </div>
      <div className="flex items-center gap-2 rounded-full bg-white/45 px-3 py-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${item.name === 'starting' ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: item.value }}
        />
        <span className="text-sm font-medium text-text-secondary">{item.name}</span>
      </div>
    </div>
  )
}

export default function CardExample() {
  return (
    <div className="min-h-screen bg-page-gradient px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="glass-card relative overflow-hidden p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-12 top-10 h-32 w-32 rounded-full bg-white/45 blur-3xl" />
            <div className="absolute right-12 top-6 h-40 w-40 rounded-full bg-sky-200/40 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-36 w-36 rounded-full bg-violet-200/35 blur-3xl" />
          </div>

          <div className="relative flex flex-col gap-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <Link
                  to="/dashboard"
                  className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/45 px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-white/60"
                >
                  <ArrowLeft className="h-4 w-4" />
                  返回 Dashboard
                </Link>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/35 px-4 py-2 text-xs font-semibold tracking-[0.18em] text-text-secondary uppercase">
                  <Sparkles className="h-4 w-4" />
                  Card Example
                </div>
                <h1 className="max-w-xl text-4xl font-light tracking-tight text-text-primary sm:text-5xl">
                  冷色毛玻璃管理台配色样例
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-text-body">
                  这个页面把设计文档里的语义色、渐变、状态色和三层玻璃卡片集中展示出来，方便你直接对照视觉与实现是否一致。
                </p>
              </div>

              <div className="relative min-h-[260px] flex-1">
                <div className="absolute left-0 top-10 hidden h-52 w-52 rounded-[2rem] border border-white/70 bg-white/20 backdrop-blur-lg lg:block" />
                <div className="glass-card absolute left-8 top-0 hidden w-64 -rotate-6 p-5 lg:block">
                  <div className="mb-6 flex items-start justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-text-subtle">Traffic</p>
                      <p className="mt-2 text-3xl font-light text-text-primary">2,589</p>
                    </div>
                    <div className="glass-inner flex h-10 w-10 items-center justify-center rounded-full">
                      <ChartColumnBig className="h-4 w-4 text-text-secondary" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-28 rounded-full bg-accent-gradient" />
                    <div className="h-3 w-20 rounded-full bg-accent-gradient-2" />
                    <div className="h-3 w-16 rounded-full bg-warn-gradient" />
                  </div>
                </div>
                <div className="glass-card absolute right-0 top-14 w-full max-w-sm p-6 lg:right-6 lg:top-16 lg:rotate-[5deg]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-text-subtle">Visitors Insights</p>
                      <h2 className="mt-3 text-2xl font-light text-text-primary">Traffic Overview</h2>
                      <p className="mt-2 text-sm text-text-muted">In last 7 days</p>
                    </div>
                    <div className="glass-inner flex h-12 w-12 items-center justify-center rounded-full">
                      <Layers3 className="h-5 w-5 text-text-secondary" />
                    </div>
                  </div>
                  <div className="mt-8 grid grid-cols-2 gap-3">
                    <div className="glass-card-sm p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-text-subtle">Conversion</p>
                      <p className="mt-3 text-2xl font-light text-text-primary">40.18%</p>
                      <div className="mt-4 h-2 rounded-full bg-warn-gradient" />
                    </div>
                    <div className="glass-card-sm p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-text-subtle">Engagement</p>
                      <p className="mt-3 text-2xl font-light text-text-primary">439</p>
                      <div className="mt-4 h-2 rounded-full bg-accent-gradient-2" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <section className="glass-card p-6">
                <SectionTitle
                  icon={Palette}
                  title="文字色与边框色"
                  description="覆盖标题、正文、辅助说明，以及毛玻璃卡片三类边界。"
                />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {textColors.map((item) => (
                    <ColorCard key={item.token} item={item} />
                  ))}
                  {borderColors.map((item) => (
                    <ColorCard key={item.token} item={item} />
                  ))}
                </div>
              </section>

              <section className="glass-card p-6">
                <SectionTitle
                  icon={Sparkles}
                  title="渐变点缀"
                  description="这三组渐变建议只做视觉焦点，不大面积铺满整个后台。"
                />
                <div className="grid gap-4">
                  {gradients.map((item) => (
                    <GradientCard key={item.token} item={item} />
                  ))}
                </div>
              </section>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
              <section className="glass-card p-6">
                <SectionTitle
                  icon={Activity}
                  title="状态语义色"
                  description="健康态保持降饱和，避免后台里出现过于刺眼的原色。"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  {statusColors.map((item) => (
                    <StatusCard key={item.name} item={item} />
                  ))}
                </div>
              </section>

              <section className="glass-card p-6">
                <SectionTitle
                  icon={Layers3}
                  title="卡片层级"
                  description="同一页里通过透明度、模糊强度和阴影差异，建立主卡片、次卡片、内嵌块三层结构。"
                />
                <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                  <div className="glass-card min-h-[240px] p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-text-subtle">Main Card</p>
                        <h3 className="mt-3 text-3xl font-light text-text-primary">主卡片</h3>
                        <p className="mt-3 max-w-sm text-sm leading-6 text-text-body">
                          用于顶层 KPI、模型卡或重要摘要模块。透明度更高，阴影也更明显。
                        </p>
                      </div>
                      <button type="button" className="btn-primary min-w-28">
                        Primary
                      </button>
                    </div>
                    <div className="mt-8 flex flex-wrap gap-3">
                      <span className="rounded-full bg-white/55 px-4 py-2 text-sm font-medium text-text-secondary">
                        bg-white/60
                      </span>
                      <span className="rounded-full bg-white/55 px-4 py-2 text-sm font-medium text-text-secondary">
                        backdrop-blur-xl
                      </span>
                      <span className="rounded-full bg-white/55 px-4 py-2 text-sm font-medium text-text-secondary">
                        shadow-glass
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="glass-card-sm p-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-text-subtle">Secondary Card</p>
                      <h3 className="mt-3 text-xl font-semibold text-text-primary">次卡片</h3>
                      <p className="mt-2 text-sm leading-6 text-text-body">
                        更适合列表容器、筛选区和图表面板。
                      </p>
                      <button type="button" className="btn-ghost mt-5 min-w-28">
                        Ghost
                      </button>
                    </div>
                    <div className="glass-inner p-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-text-subtle">Inner Block</p>
                      <h3 className="mt-3 text-lg font-semibold text-text-primary">内嵌块</h3>
                      <p className="mt-2 text-sm leading-6 text-text-body">
                        用于告警摘要、轻量分组和图例区，不再叠加强阴影。
                      </p>
                      <div className="mt-5 flex gap-2">
                        <span className="tab-active">Active</span>
                        <span className="tab-inactive">Inactive</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
