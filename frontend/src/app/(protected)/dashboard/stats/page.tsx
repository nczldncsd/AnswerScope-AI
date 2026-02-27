"use client";

import { MetricCard } from "@/components/dashboard/metric-card";
import { GlassCard } from "@/components/ui/glass-card";
import { ErrorState, LoadingState } from "@/components/ui/state";
import { useMeQuery } from "@/hooks/api/use-auth";
import { useDashboardStatsQuery } from "@/hooks/api/use-dashboard";
import { useAuthErrorRedirect } from "@/hooks/use-auth-error-redirect";
import { isApiRequestError } from "@/lib/api/errors";

export default function StatsPage() {
  const meQuery = useMeQuery();
  const statsQuery = useDashboardStatsQuery(meQuery.data?.user_id ?? null);

  useAuthErrorRedirect(meQuery.error);
  useAuthErrorRedirect(statsQuery.error);

  if (meQuery.isPending || statsQuery.isPending) {
    return <LoadingState label="Loading dashboard stats..." />;
  }

  const error = [meQuery.error, statsQuery.error].find((entry) => Boolean(entry));
  if (error && isApiRequestError(error)) {
    return <ErrorState message={error.message} requestId={error.requestId} />;
  }

  const stats = statsQuery.data?.stats;

  return (
    <div className="space-y-6">
      <GlassCard className="space-y-2">
        <h1 className="headline text-4xl">Stats</h1>
        <p className="text-text-secondary">Aggregate performance from your stored scans.</p>
      </GlassCard>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Scans" value={(stats?.total_scans ?? 0).toString()} />
        <MetricCard label="Avg LAS Score" value={Math.round(stats?.avg_las_score ?? 0).toString()} />
        <MetricCard
          label="Avg Citation Authority"
          value={Math.round(stats?.avg_citation_authority ?? stats?.avg_trust_score ?? 0).toString()}
        />
        <MetricCard
          label="Last Scan"
          value={stats?.last_scan ? stats.last_scan.slice(0, 10) : "N/A"}
        />
      </section>
    </div>
  );
}
