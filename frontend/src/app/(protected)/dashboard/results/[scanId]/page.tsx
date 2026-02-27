"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";

import { MetricCard } from "@/components/dashboard/metric-card";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/state";
import { useScanResultQuery } from "@/hooks/api/use-dashboard";
import { usePdfDownloadMutation } from "@/hooks/api/use-pdf";
import { useAuthErrorRedirect } from "@/hooks/use-auth-error-redirect";
import { normalizeAnalysisResult } from "@/lib/normalizers/analysis";
import { isApiRequestError } from "@/lib/api/errors";
import { toNumber } from "@/lib/utils";

const PillarBarChart = dynamic(
  () => import("@/components/dashboard/charts").then((module) => module.PillarBarChart),
  { ssr: false }
);
const SentimentDonutChart = dynamic(
  () => import("@/components/dashboard/charts").then((module) => module.SentimentDonutChart),
  { ssr: false }
);
const PriorityStackChart = dynamic(
  () => import("@/components/dashboard/charts").then((module) => module.PriorityStackChart),
  { ssr: false }
);

export default function ResultPage() {
  const params = useParams<{ scanId: string }>();
  const scanId = toNumber(params.scanId, 0);
  const scanResultQuery = useScanResultQuery(scanId > 0 ? scanId : null);
  const pdfMutation = usePdfDownloadMutation();

  useAuthErrorRedirect(scanResultQuery.error);
  useAuthErrorRedirect(pdfMutation.error);

  const normalized = useMemo(() => {
    if (!scanResultQuery.data) {
      return null;
    }
    return normalizeAnalysisResult(scanResultQuery.data);
  }, [scanResultQuery.data]);

  if (scanResultQuery.isPending) {
    return <LoadingState label="Loading scan result..." />;
  }

  if (scanResultQuery.error && isApiRequestError(scanResultQuery.error)) {
    return (
      <ErrorState
        title="Failed to load result"
        message={scanResultQuery.error.message}
        requestId={scanResultQuery.error.requestId}
      />
    );
  }

  if (!normalized) {
    return <EmptyState title="No result found" description="This scan payload is empty." />;
  }

  const screenshotUrl = scanResultQuery.data?.screenshot_url ?? null;

  return (
    <div className="space-y-6">
      <GlassCard className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-accent">Scan Result</p>
            <h1 className="headline text-4xl">{normalized.keyword || "Analysis Result"}</h1>
            <p className="text-sm text-text-secondary">
              URL: {normalized.url || "Not provided"} | Language: {normalized.analysisLanguage}
            </p>
          </div>
          <Button
            onClick={async () => {
              try {
                await pdfMutation.mutateAsync(scanId);
                toast.success("PDF download started");
              } catch (error) {
                if (isApiRequestError(error)) {
                  toast.error(error.message);
                } else {
                  toast.error("PDF download failed");
                }
              }
            }}
            loading={pdfMutation.isPending}
          >
            PDF Export
          </Button>
        </div>
      </GlassCard>

      {screenshotUrl ? (
        <GlassCard className="space-y-3">
          <h2 className="headline text-2xl">Captured Snapshot</h2>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <Image
              src={screenshotUrl}
              alt={`${normalized.keyword || "scan"} screenshot`}
              width={1600}
              height={900}
              className="h-auto w-full"
            />
          </div>
        </GlassCard>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="LAS Score"
          value={Math.round(normalized.lasScore).toString()}
          description="Weighted score across visibility, content, technical, and visual pillars."
          learnMoreHref="/knowledge/las"
        />
        <MetricCard
          label="Citation Authority"
          value={Math.round(normalized.citationAuthority).toString()}
          description="Confidence and authority-readiness score."
          learnMoreHref="/knowledge/improvement"
        />
        <MetricCard
          label="Sentiment"
          value={normalized.sentiment.label}
          description={`Score ${Math.round(normalized.sentiment.score)}`}
          learnMoreHref="/knowledge/sentiment"
        />
      </section>

      <GlassCard className="space-y-4">
        <h2 className="headline text-3xl">Overview</h2>
        <div className="grid gap-4 xl:grid-cols-2">
          <GlassCard className="space-y-2">
            <h3 className="headline text-2xl">Pillar Breakdown</h3>
            <PillarBarChart series={normalized.charts.pillarBar} />
          </GlassCard>
          <GlassCard className="space-y-2">
            <h3 className="headline text-2xl">Sentiment</h3>
            <SentimentDonutChart series={normalized.charts.sentimentDonut} />
          </GlassCard>
          <GlassCard className="space-y-2 xl:col-span-2">
            <h3 className="headline text-2xl">Priority Stack</h3>
            <PriorityStackChart series={normalized.charts.priorityStack} />
          </GlassCard>
          <GlassCard className="space-y-2 xl:col-span-2">
            <h3 className="headline text-2xl">Executive Summary</h3>
            {normalized.executiveSummary.length > 0 ? (
              <ul className="grid gap-2 text-sm text-text-secondary">
                {normalized.executiveSummary.map((item) => (
                  <li key={item} className="rounded-md bg-white/5 px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-secondary">
                No executive summary was returned for this scan.
              </p>
            )}
          </GlassCard>
        </div>
      </GlassCard>

      <GlassCard className="space-y-3">
        <h2 className="headline text-3xl">Action Plan</h2>
        {normalized.actionPlan.length > 0 ? (
          <div className="grid gap-3">
            {normalized.actionPlan.map((action) => (
              <div
                key={`${action.title}-${action.priority}`}
                className="rounded-lg border border-white/10 bg-white/5 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-sm bg-accent-muted px-2 py-1 text-xs">
                    {action.priority}
                  </span>
                  <h3 className="text-lg text-text-primary">{action.title}</h3>
                </div>
                <p className="mt-2 text-sm text-text-secondary">Owner: {action.ownerHint}</p>
                <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-text-secondary">
                  {action.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
                <div className="mt-3 grid gap-1 text-sm text-text-secondary">
                  <p>
                    <span className="text-text-primary">Why this matters:</span>{" "}
                    {action.whyThisMatters}
                  </p>
                  <p>
                    <span className="text-text-primary">Evidence:</span>{" "}
                    {action.evidenceReference}
                  </p>
                  <p>
                    <span className="text-text-primary">Success metric:</span>{" "}
                    {action.successMetric}
                  </p>
                  {action.etaDays ? (
                    <p>
                      <span className="text-text-primary">ETA:</span> {action.etaDays} days
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No action plan provided"
            description="Legacy actions fallback is empty for this scan."
          />
        )}
      </GlassCard>

      <GlassCard className="space-y-3">
        <h2 className="headline text-3xl">Technical Audit</h2>
        {normalized.technicalAudit.length > 0 ? (
          <ul className="grid gap-2">
            {normalized.technicalAudit.map((item) => (
              <li
                key={`${item.check}-${item.status}`}
                className="rounded-md border border-white/10 bg-white/5 p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-text-primary">{item.check}</p>
                  <span className="rounded-sm bg-white/10 px-2 py-1 text-xs uppercase">
                    {item.status}
                  </span>
                </div>
                <p className="mt-2 text-text-secondary">{item.evidence}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No technical checks" description="No audit rows were returned." />
        )}
      </GlassCard>

      <GlassCard className="space-y-3">
        <h2 className="headline text-3xl">Playbook</h2>
        {normalized.recommendedPlaybook.length > 0 ? (
          <div className="grid gap-3">
            {normalized.recommendedPlaybook.map((item) => (
              <div key={item.title} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <h3 className="text-lg text-text-primary">{item.title}</h3>
                <p className="text-sm text-text-secondary">Owner: {item.ownerHint}</p>
                <p className="mt-2 text-sm text-text-secondary">{item.reason}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No playbook items"
            description="No playbook recommendations were generated."
          />
        )}
      </GlassCard>

      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="ghost">Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
