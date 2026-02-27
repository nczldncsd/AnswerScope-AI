import { AlertTriangle, Loader2 } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <GlassCard className="flex items-center gap-2 text-text-secondary">
      <Loader2 className="size-4 animate-spin" />
      <span>{label}</span>
    </GlassCard>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <GlassCard className="space-y-1">
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="text-sm text-text-secondary">{description}</p>
    </GlassCard>
  );
}

export function ErrorState({
  title = "Request failed",
  message,
  requestId,
}: {
  title?: string;
  message: string;
  requestId?: string;
}) {
  return (
    <GlassCard className="space-y-2 border border-error/40">
      <div className="flex items-center gap-2 text-error">
        <AlertTriangle className="size-4" />
        <h3 className="text-lg font-medium">{title}</h3>
      </div>
      <p className="text-sm text-text-secondary">{message}</p>
      {requestId ? (
        <p className="font-mono text-xs text-text-secondary">request_id: {requestId}</p>
      ) : null}
    </GlassCard>
  );
}
