"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/lib/api/client";
import { apiEndpoints } from "@/lib/api/endpoints";
import { writeSessionIdentity } from "@/lib/auth/session-store";
import type { ProfileResponse } from "@/lib/types/contracts";
import { ME_QUERY_KEY } from "@/hooks/api/use-auth";

export interface SaveProfilePayload {
  name?: string;
  logoFile?: File | null;
}

export function useSaveProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SaveProfilePayload) => {
      const formData = new FormData();
      if (typeof payload.name === "string") {
        formData.append("name", payload.name);
      }
      if (payload.logoFile) {
        formData.append("logo", payload.logoFile);
      }
      return apiRequest<ProfileResponse>(apiEndpoints.profile, {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: async (profile) => {
      writeSessionIdentity({
        userId: profile.user_id,
        email: profile.email,
        name: profile.name ?? undefined,
        logoUrl: profile.logo_url ?? undefined,
      });
      await queryClient.invalidateQueries({
        queryKey: ME_QUERY_KEY,
      });
    },
  });
}

