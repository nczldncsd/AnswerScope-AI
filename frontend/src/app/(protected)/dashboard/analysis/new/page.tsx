"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/ui/state";
import { useRunAnalysisAsyncMutation } from "@/hooks/api/use-analysis";
import { useAuthErrorRedirect } from "@/hooks/use-auth-error-redirect";
import { isApiRequestError } from "@/lib/api/errors";

export default function NewAnalysisPage() {
  const router = useRouter();
  const runAsyncMutation = useRunAnalysisAsyncMutation();
  const [keyword, setKeyword] = useState("");
  const [url, setUrl] = useState("");

  useAuthErrorRedirect(runAsyncMutation.error);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <GlassCard className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">Analysis Runner</p>
        <h1 className="headline text-4xl">Run Async Audit</h1>
        <p className="text-text-secondary">
          Start your scan and monitor live status updates every 2 seconds.
        </p>
      </GlassCard>

      <GlassCard className="space-y-4">
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              const response = await runAsyncMutation.mutateAsync({ keyword, url });
              toast.success("Analysis job created");
              router.push(`/dashboard/analysis/live/${response.job_id}`);
            } catch (error) {
              if (isApiRequestError(error)) {
                if (error.status === 404) {
                  toast.error("Brand profile missing. Complete onboarding first.");
                  return;
                }
                toast.error(error.message);
                return;
              }
              toast.error("Failed to start analysis");
            }
          }}
        >
          <Input
            label="Keyword"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="best crm for startups"
            required
          />
          <Input
            label="Target URL"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com"
            required
          />
          <p className="text-xs text-text-secondary">
            Use the exact page URL (full path), not only the domain. The scan checks how this
            specific page ranks for the keyword.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={runAsyncMutation.isPending}>
              Start Analysis
            </Button>
            <Link href="/onboarding/brand" className="text-sm text-accent hover:text-accent-hover">
              Edit brand setup
            </Link>
          </div>
        </form>
      </GlassCard>

      {runAsyncMutation.error && isApiRequestError(runAsyncMutation.error) ? (
        <ErrorState
          title="Unable to start scan"
          message={runAsyncMutation.error.message}
          requestId={runAsyncMutation.error.requestId}
        />
      ) : null}
    </div>
  );
}
