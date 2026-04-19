import apiClient from "@/api/client";

export type MetricsSummaryResponse = {
  active_keys: number;
  active_concurrency: number;
  max_concurrency: number;
  p99_latency_ms: number;
  ttft_p50_ms: number;
  new_keys_today: number;
  total_keys: number;
  error_rate_5xx_pct?: number;
  rate_limit_429_pct?: number;
  concurrency_utilization_pct?: number;
  gpu_vram_peak_pct?: number;
  anomaly_summary?: string;
};

export type MetricsTimeseriesRange = "1h";

export type MetricsTimeseriesPoint = {
  timestamp: string;
  qps: number;
};

export async function getMetricsSummary() {
  const { data } = await apiClient.get<MetricsSummaryResponse>("/metrics/summary");
  return data;
}

export async function getMetricsTimeseries(range: MetricsTimeseriesRange) {
  const { data } = await apiClient.get<MetricsTimeseriesPoint[]>("/metrics/timeseries", {
    params: { range },
  });
  return data;
}
