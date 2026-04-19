import { cn } from "@/lib/utils";

export type Status = "healthy" | "degraded" | "offline" | "starting" | "paused" | "error";

type StatusDotProps = {
  status: Status;
  withLabel?: boolean;
  label?: string;
  className?: string;
};

const statusConfig: Record<Status, { dot: string; defaultLabel: string; pulse: boolean }> = {
  healthy: { dot: "bg-status-healthy", defaultLabel: "健康", pulse: false },
  degraded: { dot: "bg-status-degraded", defaultLabel: "降级", pulse: false },
  offline: { dot: "bg-status-offline", defaultLabel: "离线", pulse: false },
  starting: { dot: "bg-status-starting", defaultLabel: "启动中", pulse: true },
  paused: { dot: "bg-status-paused", defaultLabel: "已暂停", pulse: false },
  error: { dot: "bg-status-error", defaultLabel: "错误", pulse: false },
};

export function StatusDot({ status, withLabel = false, label, className }: StatusDotProps) {
  const config = statusConfig[status];
  const displayLabel = label ?? config.defaultLabel;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "h-2 w-2 rounded-full shrink-0",
          config.dot,
          config.pulse && "animate-pulse",
        )}
      />
      {withLabel && (
        <span className="text-sm text-text-secondary">{displayLabel}</span>
      )}
    </span>
  );
}
