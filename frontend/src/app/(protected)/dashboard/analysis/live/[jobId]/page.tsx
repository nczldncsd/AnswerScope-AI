"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { ErrorState, LoadingState } from "@/components/ui/state";
import { useAnalysisStatusQuery } from "@/hooks/api/use-analysis";
import { useAuthErrorRedirect } from "@/hooks/use-auth-error-redirect";
import { isApiRequestError } from "@/lib/api/errors";
import { toNumber, toRecord } from "@/lib/utils";

export default function LiveAnalysisStatusPage() {
  const params = useParams<{ jobId: string }>();
  const router = useRouter();
  const jobId = typeof params.jobId === "string" ? params.jobId : null;
  const statusQuery = useAnalysisStatusQuery(jobId);

  useAuthErrorRedirect(statusQuery.error);

  useEffect(() => {
    if (!statusQuery.data) {
      return;
    }
    const status = statusQuery.data.status.toLowerCase();
    if (status === "completed") {
      const result = toRecord(statusQuery.data.result);
      const scanId = toNumber(result.scan_id, 0);
      if (scanId > 0) {
        toast.success("Analysis complete");
        router.replace(`/dashboard/results/${scanId}`);
      }
    }
  }, [router, statusQuery.data]);

  if (statusQuery.isPending) {
    return <LoadingState label="Connecting to analysis job..." />;
  }

  if (statusQuery.error && isApiRequestError(statusQuery.error)) {
    return (
      <ErrorState
        title="Status polling failed"
        message={statusQuery.error.message}
        requestId={statusQuery.error.requestId}
      />
    );
  }

  const payload = statusQuery.data;
  if (!payload) {
    return (
      <ErrorState title="No status" message="No status payload available for this job." />
    );
  }

  const progress = toNumber(payload.progress, 0);
  const isFailed = payload.status.toLowerCase() === "failed";
  const screenshotUrl = payload.screenshot_url ?? "";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <GlassCard className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">Live Scan</p>
        <h1 className="headline text-4xl">Analysis Status</h1>
        <div className="grid gap-2">
          <p className="text-sm text-text-secondary">Job ID</p>
          <code className="w-fit rounded-md bg-white/5 px-2 py-1 font-mono text-xs">{payload.job_id}</code>
        </div>
        <div className="grid gap-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">{payload.stage_label ?? "Running"}</span>
            <span className="font-mono">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-accent transition-all duration-200"
              style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
            />
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          <span className="rounded-md bg-white/5 px-2 py-1 text-xs text-text-secondary">
            source: {payload.overview_source_type ?? "pending"}
          </span>
          <span className="rounded-md bg-white/5 px-2 py-1 text-xs text-text-secondary">
            fetch: {payload.overview_fetch_mode ?? "pending"}
          </span>
          <span className="rounded-md bg-white/5 px-2 py-1 text-xs text-text-secondary">
            extraction: {payload.extraction_method ?? "pending"}
          </span>
        </div>
      </GlassCard>

      {screenshotUrl ? (
        <GlassCard className="space-y-2">
          <h2 className="headline text-2xl">Snapshot</h2>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <Image
              src={screenshotUrl}
              alt="Live screenshot"
              width={1600}
              height={900}
              className="h-auto w-full"
              priority
            />
          </div>
        </GlassCard>
      ) : null}

      {isFailed ? (
        <GlassCard className="space-y-3 border border-error/50">
          <h2 className="headline text-2xl text-error">Scan Failed</h2>
          <p className="text-sm text-text-secondary">{payload.error ?? "Unknown scan failure."}</p>
          <Link href="/dashboard/analysis/new">
            <Button>Retry Analysis</Button>
          </Link>
        </GlassCard>
      ) : null}
    </div>
  );
}
