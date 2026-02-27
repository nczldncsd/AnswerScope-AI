"use client";

import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "@/lib/api/client";
import { apiEndpoints } from "@/lib/api/endpoints";
import type {
  DashboardInsightsResponse,
  PillarAveragesResponse,
  DashboardStatsResponse,
  ScanHistoryResponse,
  ScanResultResponse,
  TrendsResponse,
} from "@/lib/types/contracts";

export interface CombinedTrendPoint {
  recorded_at: string;
  share_of_voice: number;
  visibility_score: number;
}

export interface CombinedTrendsResponse {
  success: true;
  window: string;
  points: CombinedTrendPoint[];
}

const COMBINED_TREND_METRICS = [
  "share_of_voice",
  "visibility_score",
] as const;

export function useScanHistoryQuery(userId: number | null) {
  return useQuery({
    queryKey: ["scan-history", userId],
    queryFn: () => apiRequest<ScanHistoryResponse>(apiEndpoints.scanHistory(userId as number)),
    enabled: typeof userId === "number",
    retry: false,
  });
}

export function useScanResultQuery(scanId: number | null) {
  return useQuery({
    queryKey: ["scan-result", scanId],
    queryFn: () => apiRequest<ScanResultResponse>(apiEndpoints.scanResult(scanId as number)),
    enabled: typeof scanId === "number",
    retry: false,
  });
}

export function useDashboardStatsQuery(userId: number | null) {
  return useQuery({
    queryKey: ["dashboard-stats", userId],
    queryFn: () => apiRequest<DashboardStatsResponse>(apiEndpoints.stats(userId as number)),
    enabled: typeof userId === "number",
    retry: false,
  });
}

export function usePillarAveragesQuery(userId: number | null) {
  return useQuery({
    queryKey: ["dashboard-pillar-averages", userId],
    queryFn: () => apiRequest<PillarAveragesResponse>(apiEndpoints.pillarAverages(userId as number)),
    enabled: typeof userId === "number",
    retry: false,
  });
}

export function useDashboardInsightsQuery(userId: number | null) {
  return useQuery({
    queryKey: ["dashboard-insights", userId],
    queryFn: () => apiRequest<DashboardInsightsResponse>(apiEndpoints.insights(userId as number)),
    enabled: typeof userId === "number",
    retry: false,
  });
}

export function useDashboardTrendsQuery(
  userId: number | null,
  metric: string,
  window: string
) {
  return useQuery({
    queryKey: ["dashboard-trends", userId, metric, window],
    queryFn: () =>
      apiRequest<TrendsResponse>(apiEndpoints.trends(userId as number, metric, window)),
    enabled: typeof userId === "number",
    retry: false,
  });
}

export function useDashboardCombinedTrendsQuery(userId: number | null, window: string) {
  return useQuery({
    queryKey: ["dashboard-trends-combined", userId, window],
    queryFn: async (): Promise<CombinedTrendsResponse> => {
      const responses = await Promise.all(
        COMBINED_TREND_METRICS.map((metric) =>
          apiRequest<TrendsResponse>(apiEndpoints.trends(userId as number, metric, window))
        )
      );

      const pointsByTimestamp = new Map<string, CombinedTrendPoint>();

      responses.forEach((response, index) => {
        const metric = COMBINED_TREND_METRICS[index];
        response.points.forEach((point) => {
          const entry = pointsByTimestamp.get(point.recorded_at) ?? {
            recorded_at: point.recorded_at,
            share_of_voice: 0,
            visibility_score: 0,
          };
          entry[metric] = point.value;
          pointsByTimestamp.set(point.recorded_at, entry);
        });
      });

      const points = Array.from(pointsByTimestamp.values()).sort(
        (left, right) =>
          new Date(left.recorded_at).getTime() - new Date(right.recorded_at).getTime()
      );

      return {
        success: true,
        window,
        points,
      };
    },
    enabled: typeof userId === "number",
    retry: false,
  });
}
