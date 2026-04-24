import { deleteModel, listModels, type Model } from '@/api/models'
import { listInstances, type Instance } from '@/api/instances'
import { useInstanceControl } from '@/hooks/useInstanceControl'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ControlButton } from '@/components/ui/ControlButton'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatusDot } from '@/components/ui/StatusDot'
import { useShellActions } from '@/hooks/useShellActions'
import { POLL_INTERVALS } from '@/lib/constants'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { BrainCircuit, Layers3, ListOrdered, MoreHorizontal, Pencil, Plus, RefreshCw, ServerCrash, Square } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ModelConfigPanel } from './ModelConfigPanel'

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatLatency(ms: number | null) {
  if (ms == null) return '--'
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`
}

function relativeTime(iso: string) {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: zhCN })
}

const QUANT_LABEL: Record<string, string> = {
  none: '全精度',
  fp8: 'FP8',
  int8: 'INT8',
  awq: 'AWQ',
  gptq: 'GPTQ',
}

// ─── ModelCard ────────────────────────────────────────────────────────────────

type CardProps = {
  model: Model
  instance?: Instance
  control: ReturnType<typeof useInstanceControl>
  onEdit: (m: Model) => void
  onDeleteModel: (m: Model) => void
  onStopInstance: (i: Instance) => void
}

function ModelCard({ model, instance, control, onEdit, onDeleteModel, onStopInstance }: CardProps) {
  const isPausing = control.pause.isPending && control.pause.variables === instance?.id
  const isStarting = control.start.isPending && control.start.variables === instance?.id
  const isRestarting = control.restart.isPending && control.restart.variables === instance?.id
  const instStatus = instance?.status

  function PrimaryAction() {
    if (!instance) return null
    if (instStatus === 'starting' || instStatus === 'pausing') {
      return (
        <Button variant="ghost" size="sm" disabled>
          {instStatus === 'starting' ? '启动中...' : '暂停中...'}
        </Button>
      )
    }
    if (instStatus === 'healthy' || instStatus === 'degraded') {
      return (
        <ControlButton
          action="pause"
          loading={isPausing}
          onClick={() => control.pause.mutate(instance.id)}
        />
      )
    }
    return (
      <ControlButton
        action="start"
        loading={isStarting}
        onClick={() => control.start.mutate(instance.id)}
      />
    )
  }

  const TypeIcon = model.type === 'chat' ? BrainCircuit : model.type === 'embedding' ? Layers3 : ListOrdered
  const typeLabel = model.type === 'chat' ? 'Chat' : model.type === 'embedding' ? 'Embedding' : 'Rerank'

  return (
    <article className="glass-card flex flex-col gap-4 p-5">
      {/* Header: icon + name + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="glass-round-icon h-10 w-10 shrink-0">
            <TypeIcon className="h-4 w-4 text-text-secondary" />
          </div>
          <div className="min-w-0">
            <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-text-subtle">
              {typeLabel}
            </p>
            <h3 className="mt-0.5 truncate text-base font-semibold text-text-primary">
              {model.display_name || model.name}
            </h3>
          </div>
        </div>
        <StatusDot
          status={model.status as Parameters<typeof StatusDot>[0]['status']}
          withLabel
          className="shrink-0 pt-1"
        />
      </div>

      {/* Param chips */}
      <div className="flex flex-wrap gap-2">
        <span className="glass-chip text-xs">{QUANT_LABEL[model.quantization] ?? model.quantization}</span>
        <span className="glass-chip text-xs">TP {model.tensor_parallel}</span>
        <span className="glass-chip text-xs">max {model.max_model_len.toLocaleString()}</span>
      </div>

      {/* Metrics inner block */}
      <div className="glass-inner flex items-center justify-between px-3 py-2.5 text-xs">
        <span className="text-text-muted">当前并发</span>
        <span className="font-semibold text-text-primary">
          {model.active_requests}&thinsp;/&thinsp;{model.max_concurrency}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <PrimaryAction />
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Pencil className="h-3.5 w-3.5" />}
          onClick={() => onEdit(model)}
        >
          编辑
        </Button>
        <ModelMoreMenu
          instance={instance}
          isRestarting={isRestarting}
          onRestart={() => instance && control.restart.mutate(instance.id)}
          onStop={() => instance && onStopInstance(instance)}
          onDelete={() => onDeleteModel(model)}
        />
      </div>
    </article>
  )
}

// ─── ModelMoreMenu ────────────────────────────────────────────────────────────

const MENU_ITEM =
  'flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-body outline-none transition-colors hover:bg-white/50 focus:bg-white/50'

type MoreMenuProps = {
  instance?: Instance
  isRestarting: boolean
  onRestart: () => void
  onStop: () => void
  onDelete: () => void
}

function ModelMoreMenu({ instance, isRestarting, onRestart, onStop, onDelete }: MoreMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="sm" aria-label="更多操作">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-37 glass-card-sm p-1.5 shadow-glass"
        >
          {instance && (
            <>
              <DropdownMenu.Item
                className={MENU_ITEM}
                onSelect={onRestart}
                disabled={isRestarting}
              >
                <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                {isRestarting ? '重启中...' : '重启'}
              </DropdownMenu.Item>
              <DropdownMenu.Item className={MENU_ITEM} onSelect={onStop}>
                <Square className="h-3.5 w-3.5 shrink-0" />
                强制停止
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-glass-divider" />
            </>
          )}
          <DropdownMenu.Item
            className={`${MENU_ITEM} text-red-600 hover:bg-red-50/70 focus:bg-red-50/70`}
            onSelect={onDelete}
          >
            删除配置
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

// ─── InstanceRow ─────────────────────────────────────────────────────────────

type RowProps = {
  instance: Instance
  control: ReturnType<typeof useInstanceControl>
  onStop: (i: Instance) => void
}

function InstanceRow({ instance, control, onStop }: RowProps) {
  const navigate = useNavigate()
  const isPausing = control.pause.isPending && control.pause.variables === instance.id
  const isStarting = control.start.isPending && control.start.variables === instance.id
  const isRestarting = control.restart.isPending && control.restart.variables === instance.id

  const canPause = instance.status === 'healthy' || instance.status === 'degraded'
  const canStart =
    instance.status === 'paused' ||
    instance.status === 'offline' ||
    instance.status === 'error'
  const busy = instance.status === 'starting' || instance.status === 'pausing'

  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <StatusDot status={instance.status as Parameters<typeof StatusDot>[0]['status']} />
        <span className="text-sm font-medium text-text-primary">{instance.id}</span>
        <span className="text-xs text-text-muted">{instance.address}</span>
        <span className="ml-auto text-xs text-text-muted">
          检查 {relativeTime(instance.last_health_check)}
        </span>
      </div>

      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-text-muted">
        <span>
          活跃请求{' '}
          <strong className="text-text-body">
            {instance.active_requests}/{instance.max_concurrency}
          </strong>
        </span>
        <span>
          队列 <strong className="text-text-body">{instance.queue_length}</strong>
        </span>
        <span>
          P95 <strong className="text-text-body">{formatLatency(instance.p95_latency_ms)}</strong>
        </span>
        {instance.ttft_p50_ms != null && (
          <span>
            TTFT P50{' '}
            <strong className="text-text-body">{formatLatency(instance.ttft_p50_ms)}</strong>
          </span>
        )}
        <span>
          今日请求{' '}
          <strong className="text-text-body">{instance.requests_today.toLocaleString()}</strong>
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {busy ? (
          <Button variant="ghost" size="sm" disabled>
            {instance.status === 'starting' ? '启动中...' : '暂停中...'}
          </Button>
        ) : canPause ? (
          <ControlButton
            action="pause"
            loading={isPausing}
            onClick={() => control.pause.mutate(instance.id)}
          />
        ) : canStart ? (
          <ControlButton
            action="start"
            loading={isStarting}
            onClick={() => control.start.mutate(instance.id)}
          />
        ) : null}

        <ControlButton
          action="restart"
          loading={isRestarting}
          disabled={busy}
          onClick={() => control.restart.mutate(instance.id)}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/logs?instance=${instance.id}`)}
        >
          查看日志
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => onStop(instance)}
        >
          <Square className="h-3.5 w-3.5 text-red-500" />
        </Button>
      </div>
    </div>
  )
}

// ─── Header actions ───────────────────────────────────────────────────────────

function ModelsHeaderActions({ onAdd }: { onAdd: () => void }) {
  return (
    <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={onAdd}>
      添加模型
    </Button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Models() {
  const queryClient = useQueryClient()

  const [panelOpen, setPanelOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<Model | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Model | null>(null)
  const [stopTarget, setStopTarget] = useState<Instance | null>(null)
  const [modelFilter, setModelFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useShellActions(
    <ModelsHeaderActions
      onAdd={() => {
        setEditingModel(null)
        setPanelOpen(true)
      }}
    />,
  )

  const modelsQuery = useQuery({
    queryKey: ['models'],
    queryFn: listModels,
    refetchInterval: POLL_INTERVALS.instances,
  })

  const instancesQuery = useQuery({
    queryKey: ['instances'],
    queryFn: listInstances,
    refetchInterval: POLL_INTERVALS.instances,
  })

  const control = useInstanceControl()

  const deleteMutation = useMutation({
    mutationFn: deleteModel,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['models'] })
      void queryClient.invalidateQueries({ queryKey: ['instances'] })
      toast.success('模型配置已删除')
      setDeleteTarget(null)
    },
  })

  const stopConfirmMutation = useMutation({
    mutationFn: (id: string) => control.stop.mutateAsync(id),
    onSuccess: () => setStopTarget(null),
  })

  const models = modelsQuery.data ?? []
  const instances = instancesQuery.data ?? []

  const modelNames = [...new Set(instances.map((i) => i.model_name))].sort()
  const statusValues = [...new Set(instances.map((i) => i.status))].sort()

  const filteredInstances = instances.filter((i) => {
    if (modelFilter && i.model_name !== modelFilter) return false
    if (statusFilter && i.status !== statusFilter) return false
    return true
  })

  const hasFilter = !!(modelFilter || statusFilter)

  function handleEdit(model: Model) {
    setEditingModel(model)
    setPanelOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Model cards */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
          模型配置
        </h2>

        {modelsQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="glass-card flex flex-col gap-4 p-5">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2 pt-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-7 w-12 rounded-full" />
                  <Skeleton className="h-7 w-10 rounded-full" />
                  <Skeleton className="h-7 w-16 rounded-full" />
                </div>
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : modelsQuery.isError ? (
          <div className="flex items-start gap-2 rounded-2xl border border-red-200/80 bg-red-50/70 px-4 py-3 text-sm text-red-600">
            <ServerCrash className="mt-0.5 h-4 w-4 shrink-0" />
            <span>模型列表加载失败，稍后会自动重试。</span>
          </div>
        ) : models.length === 0 ? (
          <div className="glass-card flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm text-text-muted">暂无模型配置</p>
            <Button
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => {
                setEditingModel(null)
                setPanelOpen(true)
              }}
            >
              添加第一个模型
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {models.map((model) => (
              <ModelCard
                key={model.id}
                model={model}
                instance={instances.find((i) => i.model_id === model.id)}
                control={control}
                onEdit={handleEdit}
                onDeleteModel={setDeleteTarget}
                onStopInstance={setStopTarget}
              />
            ))}
          </div>
        )}
      </section>

      {/* Instance pool */}
      <section>
        <div className="glass-card p-4">
          {/* Section header */}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#2A2A2A]">实例池与健康状态</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void instancesQuery.refetch()
              }}
            >
              刷新
            </Button>
          </div>

          {/* Filters */}
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Select
              placeholder="全部模型"
              value={modelFilter || '__all__'}
              onValueChange={(v) => setModelFilter(v === '__all__' ? '' : v)}
              options={[
                { value: '__all__', label: '全部模型' },
                ...modelNames.map((n) => ({ value: n, label: n })),
              ]}
              className="w-44"
            />
            <Select
              placeholder="健康状况"
              value={statusFilter || '__all__'}
              onValueChange={(v) => setStatusFilter(v === '__all__' ? '' : v)}
              options={[
                { value: '__all__', label: '全部状态' },
                ...statusValues.map((s) => ({ value: s, label: s })),
              ]}
              className="w-36"
            />
            {hasFilter && (
              <button
                onClick={() => { setModelFilter(''); setStatusFilter('') }}
                className="cursor-pointer rounded-full border border-white/60 bg-white/40 px-3 py-1 text-xs font-medium text-text-muted shadow-glass-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-white/60 hover:shadow-glass active:translate-y-0"
              >
                清除
              </button>
            )}
          </div>

          {/* Inner content area */}
          <div className="glass-card-sm overflow-hidden p-0">

          {instancesQuery.isLoading ? (
            <div className="space-y-4 p-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-4 w-80" />
                </div>
              ))}
            </div>
          ) : instancesQuery.isError ? (
            <div className="flex items-start gap-2 px-4 py-4 text-sm text-red-600">
              <ServerCrash className="mt-0.5 h-4 w-4 shrink-0" />
              <span>实例数据加载失败，稍后会自动重试。</span>
            </div>
          ) : filteredInstances.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-text-muted">
              {hasFilter ? '没有匹配的实例' : '暂无运行中的实例'}
            </p>
          ) : (
            <div className="divide-y divide-glass-divider">
              {filteredInstances.map((inst) => (
                <InstanceRow
                  key={inst.id}
                  instance={inst}
                  control={control}
                  onStop={setStopTarget}
                />
              ))}
            </div>
          )}
          </div>{/* end inner grey area */}
        </div>
      </section>

      {/* Config panel */}
      <ModelConfigPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        editingModel={editingModel}
      />

      {/* Confirm: delete model */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`删除模型：${deleteTarget?.display_name ?? ''}`}
        description="此操作不可恢复，相关实例将被停止并移除。"
        confirmText="确认删除"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
        }}
      />

      {/* Confirm: force stop instance */}
      <ConfirmDialog
        open={!!stopTarget}
        onOpenChange={(open) => !open && setStopTarget(null)}
        title={`强制停止实例：${stopTarget?.id ?? ''}`}
        description="vLLM 进程将被终止，GPU 显存释放。下次启动需要重新加载模型，耗时约数分钟。"
        confirmText="确认停止"
        loading={stopConfirmMutation.isPending}
        onConfirm={() => {
          if (stopTarget) stopConfirmMutation.mutate(stopTarget.id)
        }}
      />
    </div>
  )
}
