import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, helperText, error, id, ...props }, ref) => {
    const autoId = React.useId();
    const inputId = id ?? autoId;
    return (
      <div className="grid gap-2">
        {label ? (
          <label htmlFor={inputId} className="text-sm text-text-secondary">
            {label}
          </label>
        ) : null}
        <input
          id={inputId}
          type={type}
          className={cn(
            "h-10 rounded-md border bg-white/5 px-3 text-sm text-text-primary placeholder:text-text-secondary/70 transition-all duration-200",
            error
              ? "border-error focus-visible:border-error focus-visible:ring-2 focus-visible:ring-error/40"
              : "border-white/20 focus-visible:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent/30",
            "outline-none",
            className
          )}
          ref={ref}
          {...props}
        />
        {error ? <p className="text-xs text-error">{error}</p> : null}
        {!error && helperText ? <p className="text-xs text-text-secondary">{helperText}</p> : null}
      </div>
    );
  }
);
Input.displayName = "Input";
