import { Pause, Play, RefreshCw, Square } from "lucide-react";
import { Button } from "./Button";

export type ControlAction = "pause" | "start" | "restart" | "stop";

type ControlButtonProps = {
  action: ControlAction;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
};

const actionConfig: Record<
  ControlAction,
  { label: string; icon: React.ReactNode; variant: "primary" | "ghost" | "danger" }
> = {
  start: { label: "启动", icon: <Play className="h-3.5 w-3.5" />, variant: "primary" },
  pause: { label: "暂停", icon: <Pause className="h-3.5 w-3.5" />, variant: "ghost" },
  restart: { label: "重启", icon: <RefreshCw className="h-3.5 w-3.5" />, variant: "ghost" },
  stop: { label: "停止", icon: <Square className="h-3.5 w-3.5" />, variant: "danger" },
};

export function ControlButton({ action, loading, disabled, onClick }: ControlButtonProps) {
  const config = actionConfig[action];
  return (
    <Button
      variant={config.variant}
      size="sm"
      loading={loading}
      disabled={disabled}
      leftIcon={config.icon}
      onClick={onClick}
    >
      {config.label}
    </Button>
  );
}
