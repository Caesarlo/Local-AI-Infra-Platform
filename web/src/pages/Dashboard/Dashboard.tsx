import { getAlerts } from "@/api/alerts";
import apiClient from "@/api/client";
import {
  getMetricsSummary,
  getMetricsTimeseries,
  type MetricsSummaryResponse,
} from "@/api/metrics";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useShellActions } from "@/hooks/useShellActions";
import { POLL_INTERVALS } from "@/lib/constants";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  KeyRound,
  RefreshCw,
  ScrollText,
  ServerCrash,
  TriangleAlert,
} from "lucide-react";
import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";

const LazyLineChart = lazy(async () => {
  const module = await import("@/components/ui/LineChart");
  return { default: module.LineChart };
});

type ModelSummary = {
  id: string;
  name: string;
  display_name: string;
  type: string;
  deployment_summary?: string;
  quantization: string;
  dtype: string;
  tensor_parallel: number;
  max_concurrency: number;
  status: string;
};

function formatLatency(value?: number | null) {
  if (value == null) return "--";
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`;
  return `${Math.round(value)}ms`;
}

function getValueOrFallback(value?: number | string | null) {
  if (value == null || value === "") return "--";
  return value;
}

function formatPercentage(value?: number | null) {
  if (value == null) return "--";
  return `${value.toFixed(1)}%`;
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  isLoading,
  isError,
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof KeyRound;
  isLoading: boolean;
  isError: boolean;
}) {
  return (
    <section className="glass-card min-h-[176px] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_48px_rgba(90,130,190,0.24),0_8px_18px_rgba(90,130,190,0.14)] hover:bg-white/72">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-text-subtle">
            {title}
          </p>
        </div>
        <div className="glass-round-icon h-10 w-10 shrink-0">
          <Icon className="h-8 w-8 text-text-secondary" />
        </div>
      </div>
      {isLoading ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-10 w-28 rounded-2xl" />
          <Skeleton className="h-4 w-40" />
        </div>
      ) : (
        <>
          <p className="mt-4 text-4xl font-medium tracking-tight text-text-primary sm:text-[2.6rem]">
            {value}
          </p>
          <div className="mt-5 h-1.5 w-14 rounded-full bg-accent-gradient" />
          <p className="mt-4 max-w-[24ch] text-sm leading-6 text-text-body">
            {isError ? "指标暂时不可用" : description}
          </p>
        </>
      )}
    </section>
  );
}

function SectionError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-red-200/80 bg-red-50/70 px-3 py-2 text-sm text-red-600">
      <ServerCrash className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function DashboardActions() {
  const queryClient = useQueryClient();

  return (
    <div className="flex items-center gap-2">
      <span className="rounded-full border border-white/70 bg-white/45 px-3 py-1.5 text-xs font-medium text-text-body shadow-glass-sm">
        近 1 小时
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
        onClick={() => {
          void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          void queryClient.invalidateQueries({
            queryKey: ["dashboard-models"],
          });
        }}
      >
        刷新
      </Button>
    </div>
  );
}

function ChartLoadingState() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-[260px] w-full rounded-3xl" />
    </div>
  );
}

function QuickAction({
  to,
  label,
  description,
  icon: Icon,
}: {
  to: string;
  label: string;
  description: string;
  icon: typeof ScrollText;
}) {
  return (
    <Link
      to={to}
      className="glass-card-sm flex items-center justify-between gap-3 p-4 transition-all duration-300 hover:-translate-y-1 hover:bg-white/55 hover:shadow-[0_14px_32px_rgba(90,130,190,0.2),0_6px_14px_rgba(90,130,190,0.1)]"
    >
      <div className="flex items-start gap-3">
        <div className="glass-round-icon h-10 w-10 shrink-0">
          <Icon className="h-4 w-4 text-text-secondary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">{label}</p>
          <p className="mt-1 text-xs text-text-muted">{description}</p>
        </div>
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-text-muted" />
    </Link>
  );
}

export default function Dashboard() {
  useShellActions(<DashboardActions />);

  const summaryQuery = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: getMetricsSummary,
    refetchInterval: POLL_INTERVALS.dashboard,
  });

  const timeseriesQuery = useQuery({
    queryKey: ["dashboard", "timeseries", "1h"],
    queryFn: () => getMetricsTimeseries("1h"),
    refetchInterval: POLL_INTERVALS.dashboard,
  });

  const alertsQuery = useQuery({
    queryKey: ["dashboard", "alerts"],
    queryFn: getAlerts,
    refetchInterval: POLL_INTERVALS.dashboard,
  });

  const modelsQuery = useQuery({
    queryKey: ["dashboard-models"],
    queryFn: async () => {
      const { data } = await apiClient.get<ModelSummary[]>("/models");
      return data;
    },
    refetchInterval: POLL_INTERVALS.dashboard,
  });

  const summary = summaryQuery.data;
  const primaryModel = modelsQuery.data?.find((model) => model.type === "chat");

  return (
    <div className="space-y-5">
      <section className="grid gap-4 xl:grid-cols-5">
        <StatCard
          title="活跃 API Keys"
          value={String(getValueOrFallback(summary?.active_keys))}
          description={getKeysDescription(summary, summaryQuery.isError)}
          icon={KeyRound}
          isLoading={summaryQuery.isLoading}
          isError={summaryQuery.isError}
        />
        <StatCard
          title="活跃并发"
          value={formatConcurrency(summary)}
          description={getConcurrencyDescription(summary, summaryQuery.isError)}
          icon={Boxes}
          isLoading={summaryQuery.isLoading}
          isError={summaryQuery.isError}
        />
        <StatCard
          title="P99 延迟"
          value={formatLatency(summary?.p99_latency_ms)}
          description={getLatencyDescription(summary, summaryQuery.isError)}
          icon={RefreshCw}
          isLoading={summaryQuery.isLoading}
          isError={summaryQuery.isError}
        />
        <StatCard
          title="5xx 错误率"
          value={formatPercentage(summary?.error_rate_5xx_pct)}
          description={getErrorRateDescription(summary, summaryQuery.isError)}
          icon={AlertTriangle}
          isLoading={summaryQuery.isLoading}
          isError={summaryQuery.isError}
        />
        <StatCard
          title="容量压力"
          value={formatPercentage(summary?.concurrency_utilization_pct)}
          description={getCapacityDescription(summary, summaryQuery.isError)}
          icon={TriangleAlert}
          isLoading={summaryQuery.isLoading}
          isError={summaryQuery.isError}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <div className="space-y-5">
          <section className="glass-card p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-text-primary">
                  请求趋势
                </h2>
                <p className="mt-1 text-sm text-text-muted">
                  近 1 小时 QPS 变化，用于快速判断流量是否稳定。
                </p>
              </div>
            </div>

            {timeseriesQuery.isLoading ? (
              <ChartLoadingState />
            ) : timeseriesQuery.isError ? (
              <SectionError message="趋势图加载失败，稍后会自动重试。" />
            ) : (timeseriesQuery.data?.length ?? 0) > 0 ? (
              <Suspense fallback={<ChartLoadingState />}>
                <LazyLineChart
                  data={timeseriesQuery.data ?? []}
                  lines={[{ key: "qps", label: "QPS", color: "#4f46e5" }]}
                  xKey="timestamp"
                  formatX={(value) => format(new Date(String(value)), "HH:mm")}
                  formatTooltipValue={(value) =>
                    `${Number(value).toFixed(1)} req/s`
                  }
                />
              </Suspense>
            ) : (
              <p className="text-sm text-text-muted">
                当前时间范围内暂无请求数据。
              </p>
            )}
          </section>

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="glass-card p-5">
              <div className="flex items-start gap-3">
                <div className="glass-round-icon h-10 w-10 shrink-0">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-text-primary">
                    最近 5 分钟异常摘要
                  </h2>
                  {summaryQuery.isLoading ? (
                    <div className="mt-3 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ) : summaryQuery.isError ? (
                    <div className="mt-3">
                      <SectionError message="异常摘要暂时不可用，但其余指标仍会继续刷新。" />
                    </div>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-text-body">
                      {summary?.anomaly_summary ??
                        "近 5 分钟未发现需要立即处理的异常峰值。"}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {alertsQuery.isSuccess && alertsQuery.data.length > 0 ? (
              <section className="glass-card p-5">
                <div>
                  <h2 className="text-base font-semibold text-text-primary">
                    待处理告警
                  </h2>
                  <p className="mt-1 text-sm text-text-muted">
                    仅展示当前需要管理员关注的 warning / error 事件。
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  {alertsQuery.data.map((alert) => {
                    const isError = alert.level === "error";
                    const Icon = isError ? AlertTriangle : TriangleAlert;

                    return (
                      <div
                        key={alert.id}
                        className={[
                          "rounded-2xl border px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(90,130,190,0.14),0_4px_10px_rgba(90,130,190,0.08)]",
                          isError
                            ? "border-transparent bg-error-gradient text-white shadow-[0_10px_24px_rgba(239,68,68,0.22),0_4px_12px_rgba(220,38,38,0.16)] hover:bg-error-gradient hover:shadow-[0_14px_30px_rgba(239,68,68,0.28),0_6px_14px_rgba(220,38,38,0.2)]"
                            : "border-transparent bg-warning-gradient text-white shadow-[0_10px_24px_rgba(245,158,11,0.2),0_4px_12px_rgba(249,115,22,0.14)] hover:bg-warning-gradient hover:shadow-[0_14px_30px_rgba(245,158,11,0.26),0_6px_14px_rgba(249,115,22,0.18)]",
                        ].join(" ")}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">
                              {alert.level}
                            </p>
                            <p className="mt-1 text-sm leading-6">
                              {alert.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </div>
        </div>

        <div className="space-y-5">
          <section className="glass-card p-5">
            <div>
              <h2 className="text-base font-semibold text-text-primary">
                快捷动作
              </h2>
            </div>

            <div className="mt-4 space-y-3">
              <QuickAction
                to="/logs"
                label="查看请求日志"
                description="定位 5xx、429 与高延迟请求"
                icon={ScrollText}
              />
              <QuickAction
                to="/models"
                label="查看模型实例"
                description="检查实例状态、并发和部署容量"
                icon={Boxes}
              />
              <QuickAction
                to="/keys"
                label="创建 API Key"
                description="管理调用凭证、配额与访问范围"
                icon={KeyRound}
              />
            </div>
          </section>

          <section className="glass-card p-5">
            <div>
              <h2 className="text-base font-semibold text-text-primary">
                平台摘要
              </h2>
            </div>

            {modelsQuery.isLoading ? (
              <div className="mt-5 space-y-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
              </div>
            ) : modelsQuery.isError ? (
              <div className="mt-4">
                <SectionError message="模型摘要加载失败，稍后会自动重试。" />
              </div>
            ) : primaryModel ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-white/60 bg-white/35 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/45 hover:shadow-[0_12px_28px_rgba(90,130,190,0.16),0_4px_10px_rgba(90,130,190,0.08)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    主聊天模型
                  </p>
                  <p className="mt-2 text-xl font-semibold text-text-primary">
                    {primaryModel.display_name || primaryModel.name}
                  </p>
                  <p className="mt-1 text-sm text-text-body">
                    {primaryModel.quantization.toUpperCase()} /{" "}
                    {primaryModel.dtype}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="glass-card-sm p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/50 hover:shadow-[0_12px_28px_rgba(90,130,190,0.16),0_4px_10px_rgba(90,130,190,0.08)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      部署形态
                    </p>
                    <p className="mt-2 text-sm text-text-body">
                      TP {primaryModel.tensor_parallel} / 最大并发{" "}
                      {primaryModel.max_concurrency}
                    </p>
                  </div>
                  <div className="glass-card-sm p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/50 hover:shadow-[0_12px_28px_rgba(90,130,190,0.16),0_4px_10px_rgba(90,130,190,0.08)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      运行状态
                    </p>
                    <p className="mt-2 text-sm capitalize text-text-body">
                      {primaryModel.status}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-text-muted">
                暂未找到可展示的 chat 模型。
              </p>
            )}
          </section>

          {alertsQuery.isError ? (
            <section className="glass-card p-5">
              <h2 className="text-base font-semibold text-text-primary">
                告警状态
              </h2>
              <div className="mt-4">
                <SectionError message="告警信息加载失败，不影响其他 Dashboard 模块。" />
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function formatConcurrency(summary?: MetricsSummaryResponse) {
  if (!summary) return "-- / --";
  return `${getValueOrFallback(summary.active_concurrency)} / ${getValueOrFallback(summary.max_concurrency)}`;
}

function getKeysDescription(
  summary: MetricsSummaryResponse | undefined,
  isError: boolean,
) {
  if (isError || !summary) return "接口异常时保留卡片结构，避免整页抖动。";
  return `今日新增 ${summary.new_keys_today}，总计 ${summary.total_keys} 个。`;
}

function getConcurrencyDescription(
  summary: MetricsSummaryResponse | undefined,
  isError: boolean,
) {
  if (isError || !summary) return "并发指标不可用时仍保留其余区块。";
  return `当前负载 ${summary.active_concurrency}，容量上限 ${summary.max_concurrency}。`;
}

function getLatencyDescription(
  summary: MetricsSummaryResponse | undefined,
  isError: boolean,
) {
  if (isError || !summary) return "延迟接口失败不会影响趋势图和平台摘要。";
  return `TTFT P50 ${formatLatency(summary.ttft_p50_ms)}。`;
}

function getErrorRateDescription(
  summary: MetricsSummaryResponse | undefined,
  isError: boolean,
) {
  if (isError || !summary) return "质量指标不可用时仍保留其他核心统计。";
  return `429 比例 ${formatPercentage(summary.rate_limit_429_pct)}。`;
}

function getCapacityDescription(
  summary: MetricsSummaryResponse | undefined,
  isError: boolean,
) {
  if (isError || !summary) return "容量指标缺失时不影响主流程判断。";
  return `显存峰值 ${formatPercentage(summary.gpu_vram_peak_pct)}。`;
}
