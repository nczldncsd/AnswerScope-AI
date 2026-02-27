import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const glassCardVariants = cva("glass-card p-6", {
  variants: {
    variant: {
      default: "",
      interactive: "glass-card-interactive",
      highlighted: "glass-card-highlighted",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

interface GlassCardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {}

export function GlassCard({ className, variant, ...props }: GlassCardProps) {
  return <div className={cn(glassCardVariants({ variant, className }))} {...props} />;
}
