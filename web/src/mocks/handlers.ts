import { http, HttpResponse } from 'msw'

const mockJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6OTk5OTk5OTk5OX0.mock'

export const handlers = [
  http.post('/admin/auth/login', () => {
    return HttpResponse.json({ token: mockJwt })
  }),

  http.post('/auth/login', () => {
    return HttpResponse.json({ token: mockJwt })
  }),

  http.get('/admin/metrics/summary', () => {
    return HttpResponse.json({
      active_keys: 128,
      active_concurrency: 6,
      max_concurrency: 8,
      p99_latency_ms: 2800,
      ttft_p50_ms: 300,
      new_keys_today: 0,
      total_keys: 8,
    })
  }),

  http.get('/admin/metrics/hardware', () => {
    return HttpResponse.json({
      gpu_utilization: 72,
      vram_used_gb: 13.6,
      vram_total_gb: 16,
      cpu_utilization: 41,
      ram_used_gb: 22,
      ram_total_gb: 64,
      network_mbps: 320,
      server_name: 'GPU Server 01',
      gpu_model: '4x RTX 2000 Ada',
      services: {
        requests: 6,
        queue: 2,
        status: 'healthy',
        p95_latency_ms: 2800,
        error_rate: 0.003,
      },
      alerts: [
        { id: '1', message: '1 instance warming up', level: 'warning' },
        { id: '2', message: '2 keys near quota', level: 'warning' },
      ],
    })
  }),

  http.get('/admin/models', () => {
    return HttpResponse.json([
      {
        id: 'model-1',
        name: 'gemma4-27b',
        display_name: 'Gemma4-27B-MoE',
        type: 'chat',
        quantization: 'fp8',
        dtype: 'bfloat16',
        tensor_parallel: 4,
        max_model_len: 32768,
        gpu_memory_utilization: 0.85,
        model_path: '/models/gemma-4-27b-it',
        status: 'healthy',
        active_requests: 6,
        max_concurrency: 8,
      },
      {
        id: 'model-2',
        name: 'bge-m3',
        display_name: 'BGE-M3 Embedding',
        type: 'embedding',
        quantization: 'none',
        dtype: 'float16',
        tensor_parallel: 1,
        max_model_len: 8192,
        gpu_memory_utilization: 0.5,
        model_path: 'BAAI/bge-m3',
        status: 'healthy',
        active_requests: 5,
        max_concurrency: 32,
      },
    ])
  }),

  http.get('/admin/instances', () => {
    return HttpResponse.json([
      {
        id: 'gemma4-inst-1',
        model_id: 'model-1',
        model_name: 'gemma4-27b',
        address: '127.0.0.1:8001',
        status: 'healthy',
        active_requests: 6,
        max_concurrency: 8,
        queue_length: 0,
        p95_latency_ms: 2800,
        last_health_check: new Date(Date.now() - 3000).toISOString(),
        requests_today: 1203,
        ttft_p50_ms: 680,
      },
      {
        id: 'emb-inst-1',
        model_id: 'model-2',
        model_name: 'bge-m3',
        address: '127.0.0.1:8010',
        status: 'healthy',
        active_requests: 5,
        max_concurrency: 32,
        queue_length: 0,
        p95_latency_ms: 80,
        last_health_check: new Date(Date.now() - 2000).toISOString(),
        requests_today: 12304,
        ttft_p50_ms: null,
      },
    ])
  }),

  http.get('/admin/keys', () => {
    return HttpResponse.json([
      {
        id: 'key-1',
        name: 'Production App',
        key_preview: 'sk-Xk9m****NLu',
        project: 'team-prod',
        status: 'active',
        tokens_today: 45230,
        expires_at: null,
        created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
      },
      {
        id: 'key-2',
        name: 'Dev Testing',
        key_preview: 'sk-AbCd****XyZ',
        project: 'team-dev',
        status: 'active',
        tokens_today: 1200,
        expires_at: new Date(Date.now() + 86400000 * 30).toISOString(),
        created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
      },
    ])
  }),
]
