import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/client";

type RawHardwareMetrics = {
  gpu_utilization: number;
  vram_used_gb: number;
  vram_total_gb: number;
  cpu_utilization: number;
  ram_used_gb: number;
  ram_total_gb: number;
  network_mbps: number;
  server_name: string;
  gpu_model: string;
  services: {
    requests: number;
    queue: number;
    status: string;
    p95_latency_ms: number;
    error_rate: number;
  };
  alerts: { id: string; message: string; level: string }[];
};

export type HardwareMetrics = {
  server: {
    name: string;
    subtitle: string;
  };
  resources: {
    gpu: string;
    vram: string;
    cpu: string;
    ram: string;
    network: string;
  };
  services: {
    requests: string;
    queue: string;
    status: string;
    latencyP95: string;
    errorRate: string;
  };
  alerts: { id: string; message: string; level: string }[];
};

function fmt(value: number, unit: string) {
  return `${value}${unit}`;
}

function mapMetrics(raw: RawHardwareMetrics): HardwareMetrics {
  return {
    server: {
      name: raw.server_name,
      subtitle: raw.gpu_model,
    },
    resources: {
      gpu: fmt(raw.gpu_utilization, "%"),
      vram: `${raw.vram_used_gb.toFixed(1)} / ${raw.vram_total_gb} GB`,
      cpu: fmt(raw.cpu_utilization, "%"),
      ram: `${raw.ram_used_gb} / ${raw.ram_total_gb} GB`,
      network: `${raw.network_mbps} Mbps`,
    },
    services: {
      requests: String(raw.services.requests),
      queue: String(raw.services.queue),
      status: raw.services.status,
      latencyP95: `${raw.services.p95_latency_ms} ms`,
      errorRate: `${(raw.services.error_rate * 100).toFixed(2)}%`,
    },
    alerts: raw.alerts,
  };
}

export function useHardwareMetrics() {
  return useQuery({
    queryKey: ["hardware-metrics"],
    queryFn: async () => {
      const { data } = await apiClient.get<RawHardwareMetrics>("/metrics/hardware");
      return mapMetrics(data);
    },
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}
