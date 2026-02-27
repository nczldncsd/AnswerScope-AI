"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/lib/api/client";
import { apiEndpoints } from "@/lib/api/endpoints";
import type {
  BrandCategory,
  BrandResponse,
  SaveBrandResponse,
} from "@/lib/types/contracts";

export interface SaveBrandPayload {
  brand_name: string;
  website_url: string;
  competitors: string[];
  brand_category: BrandCategory;
}

export const BRAND_QUERY_KEY = (userId: number) => ["brand", userId] as const;

export function useBrandProfileQuery(userId: number | null) {
  return useQuery({
    queryKey: userId ? BRAND_QUERY_KEY(userId) : ["brand", "idle"],
    queryFn: () => apiRequest<BrandResponse>(apiEndpoints.brandByUserId(userId as number)),
    enabled: typeof userId === "number" && Number.isFinite(userId),
    retry: false,
  });
}

export function useSaveBrandMutation(userId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveBrandPayload) =>
      apiRequest<SaveBrandResponse>(apiEndpoints.brand, {
        method: "POST",
        body: payload,
      }),
    onSuccess: async () => {
      if (typeof userId === "number") {
        await queryClient.invalidateQueries({
          queryKey: BRAND_QUERY_KEY(userId),
        });
      }
    },
  });
}
