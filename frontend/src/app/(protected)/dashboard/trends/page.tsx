"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/state";
import { useMeQuery } from "@/hooks/api/use-auth";
import { useDashboardCombinedTrendsQuery } from "@/hooks/api/use-dashboard";
import { useAuthErrorRedirect } from "@/hooks/use-auth-error-redirect";
import { isApiRequestError } from "@/lib/api/errors";

const CombinedTrendLineChart = dynamic(
  () =>
    import("@/components/dashboard/charts").then((module) => module.CombinedTrendLineChart),
  { ssr: false }
);

const WINDOW_OPTIONS = ["7d", "14d", "30d", "60d", "90d"] as const;

export default function TrendsPage() {
  const [windowValue, setWindowValue] = useState<string>("30d");
  const meQuery = useMeQuery();
  const trendsQuery = useDashboardCombinedTrendsQuery(meQuery.data?.user_id ?? null, windowValue);

  useAuthErrorRedirect(meQuery.error);
  useAuthErrorRedirect(trendsQuery.error);

  if (meQuery.isPending || trendsQuery.isPending) {
    return <LoadingState label="Loading trends..." />;
  }

  const error = [meQuery.error, trendsQuery.error].find((entry) => Boolean(entry));
  if (error && isApiRequestError(error)) {
    return <ErrorState message={error.message} requestId={error.requestId} />;
  }

  const points = trendsQuery.data?.points ?? [];

  return (
    <div className="space-y-6">
      <GlassCard className="space-y-3">
        <h1 className="headline text-4xl">Trends</h1>
        <p className="text-text-secondary">
          Track Share of Voice and Visibility Score in one timeline.
        </p>
        <div className="flex flex-wrap gap-3">
          <label className="grid gap-1 text-sm text-text-secondary">
            Window
            <select
              value={windowValue}
              onChange={(event) => setWindowValue(event.target.value)}
              className="h-10 rounded-md border border-white/20 bg-white/5 px-3 text-sm text-text-primary"
            >
              {WINDOW_OPTIONS.map((option) => (
                <option key={option} value={option} className="bg-bg-surface text-text-primary">
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </GlassCard>

      <GlassCard>
        {points.length > 0 ? (
          <CombinedTrendLineChart points={points} />
        ) : (
          <EmptyState
            title="No trend points available"
            description="Run more scans to populate trend data."
          />
        )}
      </GlassCard>
    </div>
  );
}
