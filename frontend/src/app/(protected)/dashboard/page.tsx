"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Activity,
  Clock3,
  LineChart,
  Layers3,
  MoveRight,
  Radar,
  Search,
  ShieldCheck,
  Smile,
  Sparkles,
  Wrench,
} from "lucide-react";

import { MetricCard } from "@/components/dashboard/metric-card";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/state";
import { useMeQuery } from "@/hooks/api/use-auth";
import {
  useDashboardCombinedTrendsQuery,
  usePillarAveragesQuery,
  useDashboardStatsQuery,
  useScanResultQuery,
  useScanHistoryQuery,
} from "@/hooks/api/use-dashboard";
import { useAuthErrorRedirect } from "@/hooks/use-auth-error-redirect";
import { isApiRequestError } from "@/lib/api/errors";
import { normalizeAnalysisResult } from "@/lib/normalizers/analysis";

const CombinedTrendLineChart = dynamic(
  () =>
    import("@/components/dashboard/charts").then((module) => module.CombinedTrendLineChart),
  { ssr: false }
);

export default function DashboardOverviewPage() {
  const meQuery = useMeQuery();
  const userId = meQuery.data?.user_id ?? null;
  const statsQuery = useDashboardStatsQuery(userId);
  const historyQuery = useScanHistoryQuery(userId);
  const trendsQuery = useDashboardCombinedTrendsQuery(userId, "30d");
  const pillarAveragesQuery = usePillarAveragesQuery(userId);
  const latestScanId = historyQuery.data?.scans?.[0]?.scan_id ?? null;
  const latestScanResultQuery = useScanResultQuery(latestScanId);

  useAuthErrorRedirect(meQuery.error);
  useAuthErrorRedirect(statsQuery.error);
  useAuthErrorRedirect(historyQuery.error);
  useAuthErrorRedirect(trendsQuery.error);
  useAuthErrorRedirect(pillarAveragesQuery.error);
  useAuthErrorRedirect(latestScanResultQuery.error);

  if (
    meQuery.isPending ||
    statsQuery.isPending ||
    historyQuery.isPending ||
    trendsQuery.isPending ||
    pillarAveragesQuery.isPending
  ) {
    return <LoadingState label="Loading dashboard..." />;
  }

  const firstError = [
    meQuery.error,
    statsQuery.error,
    historyQuery.error,
    trendsQuery.error,
    pillarAveragesQuery.error,
    latestScanResultQuery.error,
  ].find((error) => Boolean(error));
  if (firstError && isApiRequestError(firstError)) {
    return <ErrorState message={firstError.message} requestId={firstError.requestId} />;
  }

  const stats = statsQuery.data?.stats;
  const recent = historyQuery.data?.scans ?? [];
  const latestScan = latestScanResultQuery.data
    ? normalizeAnalysisResult(latestScanResultQuery.data)
    : null;

  const lasAvg = Math.round(stats?.avg_las_score ?? 0);
  const authorityAvg = Math.round(stats?.avg_citation_authority ?? stats?.avg_trust_score ?? 0);
  const sentimentLabel = latestScan?.sentiment.label ?? "N/A";
  const sentimentScore = Math.round(latestScan?.sentiment.score ?? 0);

  const averages = pillarAveragesQuery.data?.pillar_averages;
  const pillarRows = [
    {
      label: "Visibility",
      value: Math.round(averages?.visibility ?? 0),
      color: "var(--score-visibility)",
      icon: Radar,
    },
    {
      label: "Content",
      value: Math.round(averages?.content ?? 0),
      color: "var(--score-content)",
      icon: Sparkles,
    },
    {
      label: "Technical",
      value: Math.round(averages?.technical ?? 0),
      color: "var(--score-technical)",
      icon: Wrench,
    },
    {
      label: "Visual",
      value: Math.round(averages?.visual ?? 0),
      color: "var(--score-visual)",
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="LAS Score (Avg)"
          value={lasAvg.toString()}
          progress={lasAvg}
          icon={Activity}
          learnMoreHref="/knowledge/las"
        />
        <MetricCard
          label="Citation Authority (Avg)"
          value={authorityAvg.toString()}
          progress={authorityAvg}
          icon={ShieldCheck}
          learnMoreHref="/knowledge/improvement"
        />
        <MetricCard
          label="Sentiment"
          value={sentimentLabel}
          description={latestScan ? `Latest score: ${sentimentScore}` : "No sentiment yet"}
          icon={Smile}
          learnMoreHref="/knowledge/sentiment"
        />
      </section>

      <section className="grid items-stretch gap-4 xl:grid-cols-2">
        <GlassCard className="flex h-full flex-col space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="headline flex items-center gap-2 text-2xl">
              <Clock3 className="size-5 text-accent" />
              Recent Scans
            </h2>
            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-text-secondary">
              Total: {stats?.total_scans ?? 0}
            </span>
          </div>
          {recent.length > 0 ? (
            <ul className="grid gap-2">
              {recent.slice(0, 3).map((scan) => {
                const las = Math.round(scan.las_score);
                const authority = Math.round(scan.citation_authority ?? scan.trust_score);
                return (
                <li key={scan.scan_id} className="rounded-xl border border-white/10 bg-white/5 p-3 transition-colors hover:bg-white/10">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-accent">
                        <Search className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-text-primary">{scan.keyword}</p>
                        <p className="text-xs text-text-secondary">{scan.timestamp.slice(0, 16)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-text-primary">
                        LAS {las}
                      </p>
                      <p className="text-xs text-text-secondary">
                        CA {authority}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/results/${scan.scan_id}`}
                      className="inline-flex size-8 items-center justify-center rounded-md bg-white/10 text-text-secondary transition-colors hover:text-accent"
                      aria-label="Open result"
                      title="Open result"
                    >
                      <MoveRight className="size-4" />
                    </Link>
                  </div>
                </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              title="No scans yet"
              description="Run your first analysis from the New Analysis button."
            />
          )}
          <div className="mt-auto pt-1">
            <Link href="/dashboard/history">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          </div>
        </GlassCard>

        <GlassCard className="flex h-full flex-col space-y-3">
          <h2 className="headline flex items-center gap-2 text-2xl">
            <Layers3 className="size-5 text-accent" />
            Pillar Breakdown
          </h2>
          {averages ? (
            <div className="grid gap-1.5">
              {pillarRows.map((row) => {
                const Icon = row.icon;
                const tone = row.value >= 70 ? "Strong" : row.value >= 45 ? "Moderate" : "Needs work";
                return (
                  <div key={row.label} className="rounded-lg border border-white/10 bg-white/5 p-2 transition-colors hover:bg-white/10">
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-white/10">
                        <Icon className="size-3.5" style={{ color: row.color }} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-text-primary">{row.label}</p>
                        <p className="text-xs text-text-secondary">{tone}</p>
                      </div>
                      <span className="text-lg font-semibold text-text-primary">{row.value}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.max(0, Math.min(row.value, 100))}%`,
                          backgroundColor: row.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No breakdown yet"
              description="Run a scan to populate visibility/content/technical/visual pillars."
            />
          )}
        </GlassCard>
      </section>

      <section>
        <GlassCard className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="headline flex items-center gap-2 text-2xl">
              <LineChart className="size-5 text-accent" />
              Trends Snapshot
            </h2>
            <Link href="/dashboard/trends">
              <Button variant="ghost" size="sm">
                View trends
              </Button>
            </Link>
          </div>
          <CombinedTrendLineChart points={trendsQuery.data?.points ?? []} />
        </GlassCard>
      </section>
    </div>
  );
}
