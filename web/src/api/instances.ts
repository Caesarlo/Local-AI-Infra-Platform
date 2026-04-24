import apiClient from '@/api/client'

export type InstanceStatus =
  | 'healthy'
  | 'degraded'
  | 'offline'
  | 'starting'
  | 'paused'
  | 'pausing'
  | 'error'

export type Instance = {
  id: string
  model_id: string
  model_name: string
  address: string
  status: InstanceStatus
  active_requests: number
  max_concurrency: number
  queue_length: number
  p95_latency_ms: number | null
  last_health_check: string
  requests_today: number
  ttft_p50_ms: number | null
}

export async function listInstances(): Promise<Instance[]> {
  const { data } = await apiClient.get<Instance[]>('/instances')
  return data
}

export async function pauseInstance(id: string): Promise<void> {
  await apiClient.post(`/instances/${id}/pause`)
}

export async function startInstance(id: string): Promise<void> {
  await apiClient.post(`/instances/${id}/start`)
}

export async function restartInstance(id: string): Promise<void> {
  await apiClient.post(`/instances/${id}/restart`)
}

export async function stopInstance(id: string): Promise<void> {
  await apiClient.post(`/instances/${id}/stop`)
}
