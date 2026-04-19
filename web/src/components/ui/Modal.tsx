import { cn } from "@/lib/utils";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
};

const sizeMap = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  size = "md",
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full p-4",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
            sizeMap[size],
          )}
        >
          <div className="glass-card p-6 flex flex-col gap-4">
            {(title || description) && (
              <div className="flex items-start justify-between gap-4">
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
            )}
            <div>{children}</div>
            {footer && (
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-glass-divider">
                {footer}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
