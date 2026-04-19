import { cn } from "@/lib/utils";

export type BadgeVariant = "success" | "warning" | "error" | "neutral" | "info";

type BadgeProps = {
  variant?: BadgeVariant;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
};

const variantMap: Record<BadgeVariant, string> = {
  success: "bg-emerald-100/80 text-emerald-700 border-emerald-200/60",
  warning: "bg-amber-100/80 text-amber-700 border-amber-200/60",
  error: "bg-red-100/80 text-red-600 border-red-200/60",
  neutral: "bg-slate-100/80 text-slate-600 border-slate-200/60",
  info: "bg-blue-100/80 text-blue-600 border-blue-200/60",
};

export function Badge({ variant = "neutral", children, icon, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variantMap[variant],
        className,
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
}
