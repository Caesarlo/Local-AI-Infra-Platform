import { cn } from "@/lib/utils";

type FilterBarProps = {
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

export function FilterBar({ children, actions, className }: FilterBarProps) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
