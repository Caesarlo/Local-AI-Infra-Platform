import { cn } from "@/lib/utils";
import React from "react";

export type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label?: React.ReactNode;
  error?: React.ReactNode;
  hint?: React.ReactNode;
  prefixIcon?: React.ReactNode;
  suffix?: React.ReactNode;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, prefixIcon, suffix, className, id, ...props }, ref) => {
    const inputId = id ?? (typeof label === "string" ? label : undefined);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefixIcon && (
            <span className="pointer-events-none absolute left-3 text-text-muted">
              {prefixIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "glass-input w-full py-2 text-sm",
              prefixIcon ? "pl-9 pr-3" : "px-3",
              suffix ? "pr-10" : "",
              error && "border-red-400/70 focus:border-red-400",
              className,
            )}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3 flex items-center text-text-muted">
              {suffix}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {!error && hint && <p className="text-xs text-text-muted">{hint}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";
