import apiClient from '@/api/client'

export type ModelStatus = 'healthy' | 'degraded' | 'offline' | 'starting' | 'paused' | 'error' | 'configured'
export type ModelType = 'chat' | 'embedding' | 'rerank'
export type QuantizationType = 'none' | 'fp8' | 'int8' | 'awq' | 'gptq'
export type DtypeType = 'bfloat16' | 'float16'

export type Model = {
  id: string
  name: string
  display_name: string
  type: ModelType
  deployment_summary?: string
  quantization: QuantizationType
  dtype: DtypeType
  tensor_parallel: number
  max_model_len: number
  gpu_memory_utilization: number
  model_path: string
  status: ModelStatus
  active_requests: number
  max_concurrency: number
  host?: string
  port?: number
  cuda_visible_devices?: string
  enable_prefix_caching?: boolean
  disable_log_requests?: boolean
  extra_args?: string
}

export type ModelFormValues = {
  name: string
  display_name: string
  type: ModelType
  model_path: string
  quantization: QuantizationType
  dtype: DtypeType
  tensor_parallel: number
  max_model_len: number
  gpu_memory_utilization: number
  enable_prefix_caching: boolean
  disable_log_requests: boolean
  extra_args: string
  host: string
  port: number
  cuda_visible_devices: string
  max_concurrency: number
}

export async function listModels(): Promise<Model[]> {
  const { data } = await apiClient.get<Model[]>('/models')
  return data
}

export async function createModel(payload: ModelFormValues): Promise<Model> {
  const { data } = await apiClient.post<Model>('/models', payload)
  return data
}

export async function updateModel(id: string, payload: Partial<ModelFormValues>): Promise<Model> {
  const { data } = await apiClient.patch<Model>(`/models/${id}`, payload)
  return data
}

export async function deleteModel(id: string): Promise<void> {
  await apiClient.delete(`/models/${id}`)
}
