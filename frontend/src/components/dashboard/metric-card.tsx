import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";

export function MetricCard({
  label,
  value,
  description,
  learnMoreHref,
  icon: Icon,
  progress,
}: {
  label: string;
  value: string;
  description?: string;
  learnMoreHref?: string;
  icon?: LucideIcon;
  progress?: number;
}) {
  const barValue =
    typeof progress === "number" && Number.isFinite(progress)
      ? Math.max(0, Math.min(100, progress))
      : null;

  return (
    <GlassCard variant="interactive" className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-wide text-text-secondary">{label}</p>
        {Icon ? (
          <span className="inline-flex size-8 items-center justify-center rounded-md bg-accent-muted text-accent">
            <Icon className="size-4" />
          </span>
        ) : null}
      </div>
      <p className="headline text-3xl text-text-primary">{value}</p>
      {barValue !== null ? (
        <div className="space-y-1">
          <div className="h-1.5 rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{ width: `${barValue}%`, backgroundColor: "var(--accent-500)" }}
            />
          </div>
          <p className="text-[11px] text-text-secondary">{barValue.toFixed(0)}/100</p>
        </div>
      ) : null}
      {description ? <p className="text-sm text-text-secondary">{description}</p> : null}
      {learnMoreHref ? (
        <Link href={learnMoreHref} className="text-sm text-accent hover:text-accent-hover">
          Learn more
        </Link>
      ) : null}
    </GlassCard>
  );
}
