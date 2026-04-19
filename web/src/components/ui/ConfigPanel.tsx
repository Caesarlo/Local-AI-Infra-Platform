import { cn } from "@/lib/utils";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

type ConfigPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  width?: number;
};

export function ConfigPanel({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  width = 480,
}: ConfigPanelProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <Dialog.Content
          className={cn(
            "fixed right-0 top-0 z-50 h-full",
            "flex flex-col",
            "glass-card rounded-none rounded-l-3xl border-r-0",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
            "duration-300",
          )}
          style={{ width }}
        >
          {/* Header */}
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-glass-divider px-6 py-5">
            <div>
              {title && (
                <Dialog.Title className="text-lg font-semibold text-text-primary">
                  {title}
                </Dialog.Title>
              )}
              {description && (
                <Dialog.Description className="mt-1 text-sm text-text-muted">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close className="shrink-0 rounded-lg p-1 text-text-muted hover:bg-white/40 hover:text-text-secondary transition-colors">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-glass-divider px-6 py-4">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
