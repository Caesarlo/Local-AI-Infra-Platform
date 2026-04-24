import { createModel, updateModel, type Model, type ModelFormValues } from '@/api/models'
import { Button } from '@/components/ui/Button'
import { ConfigPanel } from '@/components/ui/ConfigPanel'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

const QUANTIZATION_OPTIONS = [
  { value: 'none', label: '无（全精度）' },
  { value: 'fp8', label: 'FP8' },
  { value: 'int8', label: 'INT8' },
  { value: 'awq', label: 'AWQ' },
  { value: 'gptq', label: 'GPTQ' },
]

const DTYPE_OPTIONS = [
  { value: 'bfloat16', label: 'bfloat16（推荐）' },
  { value: 'float16', label: 'float16' },
]

const TYPE_OPTIONS: { value: Model['type']; label: string }[] = [
  { value: 'chat', label: 'Chat（文本生成）' },
  { value: 'embedding', label: 'Embedding' },
  { value: 'rerank', label: 'Rerank' },
]

function getDefaultValues(model?: Model | null): ModelFormValues {
  return {
    name: model?.name ?? '',
    display_name: model?.display_name ?? '',
    type: model?.type ?? 'chat',
    model_path: model?.model_path ?? '',
    quantization: model?.quantization ?? 'none',
    dtype: model?.dtype ?? 'bfloat16',
    tensor_parallel: model?.tensor_parallel ?? 1,
    max_model_len: model?.max_model_len ?? 4096,
    gpu_memory_utilization: model?.gpu_memory_utilization ?? 0.9,
    enable_prefix_caching: model?.enable_prefix_caching ?? true,
    disable_log_requests: model?.disable_log_requests ?? false,
    extra_args: model?.extra_args ?? '',
    host: model?.host ?? '127.0.0.1',
    port: model?.port ?? 8001,
    cuda_visible_devices: model?.cuda_visible_devices ?? '0',
    max_concurrency: model?.max_concurrency ?? 8,
  }
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingModel?: Model | null
}

export function ModelConfigPanel({ open, onOpenChange, editingModel }: Props) {
  const queryClient = useQueryClient()
  const isEdit = !!editingModel

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ModelFormValues>({
    defaultValues: getDefaultValues(editingModel),
  })

  // Reset form when panel opens with new model
  const handleOpenChange = (next: boolean) => {
    if (next) reset(getDefaultValues(editingModel))
    onOpenChange(next)
  }

  const mutation = useMutation({
    mutationFn: (values: ModelFormValues) =>
      isEdit ? updateModel(editingModel!.id, values) : createModel(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['models'] })
      onOpenChange(false)
      toast.success(
        isEdit
          ? '配置已更新，点击 ▶ 启动 使实例上线'
          : '配置已保存，点击 ▶ 启动 使实例上线',
      )
    },
  })

  return (
    <ConfigPanel
      open={open}
      onOpenChange={handleOpenChange}
      title={isEdit ? `编辑模型：${editingModel!.display_name}` : '添加模型'}
      description="配置保存后不会自动启动，需手动点击启动按钮使实例上线。"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            size="sm"
            loading={mutation.isPending}
            onClick={() => void handleSubmit((v) => mutation.mutate(v))()}
          >
            保存配置
          </Button>
        </>
      }
    >
      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        {/* 基本信息 */}
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            基本信息
          </h3>
          <div className="space-y-3">
            <Input
              label="模型名称（对外暴露）"
              placeholder="gemma4-27b"
              error={errors.name?.message}
              {...register('name', { required: '请填写模型名称' })}
            />
            <Input
              label="显示名称"
              placeholder="Gemma 4 27B MoE"
              error={errors.display_name?.message}
              {...register('display_name', { required: '请填写显示名称' })}
            />

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text-secondary">模型类型</span>
              <div className="flex gap-4">
                {TYPE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm text-text-body">
                    <input
                      type="radio"
                      value={opt.value}
                      className="accent-[#334455]"
                      {...register('type')}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <Input
              label="模型路径 / HuggingFace ID"
              placeholder="/models/gemma-4-27b-it"
              error={errors.model_path?.message}
              {...register('model_path', { required: '请填写模型路径' })}
            />
          </div>
        </section>

        {/* 量化配置 */}
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            量化配置
          </h3>
          <div className="space-y-3">
            <Controller
              name="quantization"
              control={control}
              render={({ field }) => (
                <Select
                  label="量化方式"
                  options={QUANTIZATION_OPTIONS}
                  value={field.value}
                  onValueChange={field.onChange}
                />
              )}
            />
            <Controller
              name="dtype"
              control={control}
              render={({ field }) => (
                <Select
                  label="基础精度"
                  options={DTYPE_OPTIONS}
                  value={field.value}
                  onValueChange={field.onChange}
                />
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Tensor Parallel Size"
                type="number"
                min={1}
                error={errors.tensor_parallel?.message}
                {...register('tensor_parallel', {
                  required: true,
                  valueAsNumber: true,
                  min: { value: 1, message: '最小为 1' },
                })}
              />
              <Input
                label="Max Model Length"
                type="number"
                min={1}
                error={errors.max_model_len?.message}
                {...register('max_model_len', {
                  required: true,
                  valueAsNumber: true,
                  min: { value: 1, message: '最小为 1' },
                })}
              />
            </div>
            <Input
              label="GPU Memory Utilization（0.0 ~ 1.0）"
              type="number"
              min={0.1}
              max={1}
              step={0.05}
              error={errors.gpu_memory_utilization?.message}
              {...register('gpu_memory_utilization', {
                required: true,
                valueAsNumber: true,
                min: { value: 0.1, message: '最小 0.1' },
                max: { value: 1, message: '最大 1.0' },
              })}
            />

            <div className="space-y-2 pt-1">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-text-body">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-[#334455]"
                  {...register('enable_prefix_caching')}
                />
                启用 Prefix KV Cache
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-text-body">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-[#334455]"
                  {...register('disable_log_requests')}
                />
                禁用 vLLM 内置请求日志
              </label>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">
                vLLM 额外参数（高级）
              </label>
              <textarea
                rows={3}
                placeholder="--trust-remote-code&#10;--max-num-seqs 256"
                className="glass-input resize-none px-3 py-2 text-sm font-mono leading-relaxed"
                {...register('extra_args')}
              />
              <p className="text-xs text-text-muted">每行一个参数，直接透传给 vllm serve</p>
            </div>
          </div>
        </section>

        {/* 部署配置 */}
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            部署配置
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_100px] gap-3">
              <Input
                label="监听地址"
                placeholder="127.0.0.1"
                {...register('host')}
              />
              <Input
                label="端口"
                type="number"
                min={1}
                max={65535}
                error={errors.port?.message}
                {...register('port', {
                  required: true,
                  valueAsNumber: true,
                  min: { value: 1, message: '1–65535' },
                  max: { value: 65535, message: '1–65535' },
                })}
              />
            </div>
            <Input
              label="CUDA_VISIBLE_DEVICES"
              placeholder="0,1,2,3"
              hint="逗号分隔的 GPU 编号"
              {...register('cuda_visible_devices')}
            />
            <Input
              label="最大并发数（调度层限制）"
              type="number"
              min={1}
              error={errors.max_concurrency?.message}
              {...register('max_concurrency', {
                required: true,
                valueAsNumber: true,
                min: { value: 1, message: '最小为 1' },
              })}
            />
          </div>
        </section>

        {mutation.isError && (
          <p className="rounded-xl border border-red-200/80 bg-red-50/70 px-3 py-2 text-sm text-red-600">
            保存失败，请稍后重试。
          </p>
        )}
      </form>
    </ConfigPanel>
  )
}
