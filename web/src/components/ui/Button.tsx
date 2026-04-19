import { cn } from "@/lib/utils";
import React from "react";
import { Spinner } from "./Spinner";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

const variantMap = {
  primary:
    "bg-[#334455] hover:bg-[#1e2d3d] text-white border border-transparent shadow-glass-sm",
  ghost:
    "bg-white/40 hover:bg-white/60 border border-white/60 text-text-body shadow-glass-sm",
  danger:
    "bg-red-500/90 hover:bg-red-600 text-white border border-transparent shadow-glass-sm",
};

const sizeMap = {
  sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
  md: "px-4 py-2 text-sm rounded-xl gap-2",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "relative inline-flex items-center justify-center font-medium transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#334455]/40",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variantMap[variant],
          sizeMap[size],
          className,
        )}
        {...props}
      >
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Spinner size="sm" />
          </span>
        )}
        <span
          className={cn("inline-flex items-center", sizeMap[size].split(" ").find((c) => c.startsWith("gap")), loading && "opacity-0")}
        >
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </span>
      </button>
    );
  },
);

Button.displayName = "Button";
