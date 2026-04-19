import apiClient from "@/api/client";

export type AlertLevel = "warning" | "error" | "info";

export type AlertItem = {
  id: string;
  message: string;
  level: AlertLevel;
};

export async function getAlerts() {
  const { data } = await apiClient.get<AlertItem[]>("/alerts");
  return data;
}
