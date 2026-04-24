import {
  pauseInstance,
  restartInstance,
  startInstance,
  stopInstance,
  type Instance,
} from '@/api/instances'
import { useMutation, useQueryClient } from '@tanstack/react-query'

type MutationContext = { previous: Instance[] | undefined }

export function useInstanceControl() {
  const queryClient = useQueryClient()

  function buildContext(instanceId: string, status: Instance['status']): Promise<MutationContext> {
    return queryClient.cancelQueries({ queryKey: ['instances'] }).then(() => {
      const previous = queryClient.getQueryData<Instance[]>(['instances'])
      queryClient.setQueryData<Instance[]>(['instances'], (old) =>
        old?.map((inst) => (inst.id === instanceId ? { ...inst, status } : inst))
      )
      return { previous }
    })
  }

  function rollback(_err: unknown, _vars: unknown, context: MutationContext | undefined) {
    if (context?.previous) queryClient.setQueryData(['instances'], context.previous)
  }

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['instances'] })
    void queryClient.invalidateQueries({ queryKey: ['models'] })
  }

  const pause = useMutation({
    mutationFn: pauseInstance,
    onMutate: (id) => buildContext(id, 'pausing'),
    onError: rollback,
    onSettled: invalidate,
  })

  const start = useMutation({
    mutationFn: startInstance,
    onMutate: (id) => buildContext(id, 'starting'),
    onError: rollback,
    onSettled: invalidate,
  })

  const restart = useMutation({
    mutationFn: restartInstance,
    onMutate: (id) => buildContext(id, 'starting'),
    onError: rollback,
    onSettled: invalidate,
  })

  const stop = useMutation({
    mutationFn: stopInstance,
    onMutate: (id) => buildContext(id, 'offline'),
    onError: rollback,
    onSettled: invalidate,
  })

  return { pause, start, restart, stop }
}
