import { cn } from "@/lib/utils";
import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

export type SelectOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

export type SelectGroup = {
  label: string;
  options: SelectOption[];
};

type SelectProps = {
  label?: React.ReactNode;
  error?: React.ReactNode;
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  options?: SelectOption[];
  groups?: SelectGroup[];
  disabled?: boolean;
  className?: string;
};

function SelectItem({ option }: { option: SelectOption }) {
  return (
    <RadixSelect.Item
      value={option.value}
      disabled={option.disabled}
      className="relative flex cursor-default select-none items-center rounded-lg py-2 pl-8 pr-4 text-sm text-text-body outline-none hover:bg-white/50 focus:bg-white/50 data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed transition-colors"
    >
      <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
      <RadixSelect.ItemIndicator className="absolute left-2.5 flex items-center">
        <Check className="h-3.5 w-3.5 text-text-secondary" />
      </RadixSelect.ItemIndicator>
    </RadixSelect.Item>
  );
}

export function Select({
  label,
  error,
  placeholder = "请选择",
  value,
  onValueChange,
  options,
  groups,
  disabled,
  className,
}: SelectProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label className="text-sm font-medium text-text-secondary">{label}</label>
      )}
      <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <RadixSelect.Trigger
          className={cn(
            "glass-input flex w-full items-center justify-between px-3 py-2 text-sm",
            "focus:outline-none",
            error && "border-red-400/70",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown className="h-4 w-4 text-text-muted" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={4}
            className="z-50 min-w-[var(--radix-select-trigger-width)] glass-card-sm p-1.5 shadow-glass"
          >
            <RadixSelect.Viewport>
              {options && options.map((opt) => <SelectItem key={opt.value} option={opt} />)}
              {groups &&
                groups.map((group, i) => (
                  <RadixSelect.Group key={group.label}>
                    {i > 0 && (
                      <RadixSelect.Separator className="my-1 h-px bg-glass-divider" />
                    )}
                    <RadixSelect.Label className="px-3 py-1.5 text-xs font-semibold text-text-subtle uppercase tracking-wide">
                      {group.label}
                    </RadixSelect.Label>
                    {group.options.map((opt) => (
                      <SelectItem key={opt.value} option={opt} />
                    ))}
                  </RadixSelect.Group>
                ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
