"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/state";
import { useMeQuery } from "@/hooks/api/use-auth";
import { useScanHistoryQuery } from "@/hooks/api/use-dashboard";
import { useAuthErrorRedirect } from "@/hooks/use-auth-error-redirect";
import { isApiRequestError } from "@/lib/api/errors";

export default function HistoryPage() {
  const meQuery = useMeQuery();
  const historyQuery = useScanHistoryQuery(meQuery.data?.user_id ?? null);
  const [selectedScreenshot, setSelectedScreenshot] = useState<{
    url: string;
    keyword: string;
  } | null>(null);

  useAuthErrorRedirect(meQuery.error);
  useAuthErrorRedirect(historyQuery.error);

  if (meQuery.isPending || historyQuery.isPending) {
    return <LoadingState label="Loading scan history..." />;
  }

  const error = [meQuery.error, historyQuery.error].find((entry) => Boolean(entry));
  if (error && isApiRequestError(error)) {
    return <ErrorState message={error.message} requestId={error.requestId} />;
  }

  const scans = historyQuery.data?.scans ?? [];

  return (
    <div className="space-y-6">
      <GlassCard className="space-y-2">
        <h1 className="headline text-4xl">Scan History</h1>
        <p className="text-text-secondary">Recent analysis runs and their key metrics.</p>
      </GlassCard>

      <GlassCard>
        {scans.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-text-secondary">
                  <th className="pb-2 pr-4">Keyword</th>
                  <th className="pb-2 pr-4">Timestamp</th>
                  <th className="pb-2 pr-4">LAS</th>
                  <th className="pb-2 pr-4">Citation Authority</th>
                  <th className="pb-2 pr-4">Snapshot</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((scan) => (
                  <tr key={scan.scan_id} className="border-b border-white/5">
                    <td className="py-3 pr-4 text-text-primary">{scan.keyword}</td>
                    <td className="py-3 pr-4 text-text-secondary">{scan.timestamp}</td>
                    <td className="py-3 pr-4">{Math.round(scan.las_score)}</td>
                    <td className="py-3 pr-4">
                      {Math.round(scan.citation_authority ?? scan.trust_score)}
                    </td>
                    <td className="py-3 pr-4">
                      {scan.screenshot_url ? (
                        <button
                          type="button"
                          className="overflow-hidden rounded-md border border-white/10"
                          onClick={() =>
                            setSelectedScreenshot({
                              url: scan.screenshot_url as string,
                              keyword: scan.keyword,
                            })
                          }
                        >
                          <Image
                            src={scan.screenshot_url}
                            alt={`${scan.keyword} screenshot`}
                            width={96}
                            height={54}
                            className="h-[54px] w-[96px] object-cover"
                          />
                        </button>
                      ) : (
                        <span className="text-xs text-text-secondary">No snapshot</span>
                      )}
                    </td>
                    <td className="py-3">
                      <Link href={`/dashboard/results/${scan.scan_id}`}>
                        <Button size="sm" variant="ghost">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No history yet"
            description="Run your first analysis to populate this table."
          />
        )}
      </GlassCard>

      {selectedScreenshot ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="glass-card max-h-[90vh] w-full max-w-5xl space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-text-secondary">
                Snapshot: <span className="text-text-primary">{selectedScreenshot.keyword}</span>
              </p>
              <Button variant="ghost" size="sm" onClick={() => setSelectedScreenshot(null)}>
                Close
              </Button>
            </div>
            <div className="overflow-auto rounded-xl border border-white/10">
              <Image
                src={selectedScreenshot.url}
                alt={`${selectedScreenshot.keyword} snapshot preview`}
                width={1600}
                height={900}
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
