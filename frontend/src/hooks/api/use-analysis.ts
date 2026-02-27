"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { apiRequest } from "@/lib/api/client";
import { apiEndpoints } from "@/lib/api/endpoints";
import type {
  AnalysisStatusResponse,
  RunAnalysisAsyncResponse,
} from "@/lib/types/contracts";

export const ANALYSIS_POLL_INTERVAL_MS = 2_000;

export function getAnalysisStatusRefetchInterval(
  data: AnalysisStatusResponse | undefined
) {
  if (!data) {
    return ANALYSIS_POLL_INTERVAL_MS;
  }
  // Stop polling terminal states to avoid redundant load and flickering status UI.
  const status = data.status.toLowerCase();
  if (status === "completed" || status === "failed") {
    return false;
  }
  return ANALYSIS_POLL_INTERVAL_MS;
}

interface RunAnalysisPayload {
  keyword: string;
  url: string;
}

export function useRunAnalysisAsyncMutation() {
  return useMutation({
    mutationFn: (payload: RunAnalysisPayload) =>
      apiRequest<RunAnalysisAsyncResponse>(apiEndpoints.runAnalysisAsync, {
        method: "POST",
        body: payload,
      }),
  });
}

export function useAnalysisStatusQuery(jobId: string | null) {
  return useQuery({
    queryKey: ["analysis-status", jobId],
    queryFn: () =>
      apiRequest<AnalysisStatusResponse>(apiEndpoints.analysisStatus(jobId as string)),
    enabled: typeof jobId === "string" && jobId.length > 0,
    // Server drives progression; client polls until status transitions to completed/failed.
    refetchInterval: (query) =>
      getAnalysisStatusRefetchInterval(query.state.data as AnalysisStatusResponse | undefined),
    refetchIntervalInBackground: true,
    retry: false,
  });
}
