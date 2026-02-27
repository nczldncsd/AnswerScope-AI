"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/lib/api/client";
import { apiEndpoints } from "@/lib/api/endpoints";
import {
  clearSessionIdentity,
  writeSessionIdentity,
} from "@/lib/auth/session-store";
import type { AuthSuccessResponse, MeResponse } from "@/lib/types/contracts";

interface AuthPayload {
  email: string;
  password: string;
}

export const ME_QUERY_KEY = ["auth", "me"] as const;

export function useMeQuery() {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: () => apiRequest<MeResponse>(apiEndpoints.me),
    retry: false,
    staleTime: 30_000,
  });
}

export function useRegisterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AuthPayload) =>
      apiRequest<AuthSuccessResponse>(apiEndpoints.register, {
        method: "POST",
        body: payload,
      }),
    onSuccess: async () => {
      const me = await queryClient.fetchQuery({
        queryKey: ME_QUERY_KEY,
        queryFn: () => apiRequest<MeResponse>(apiEndpoints.me),
      });
      writeSessionIdentity({
        userId: me.user_id,
        email: me.email,
        name: me.name ?? undefined,
        logoUrl: me.logo_url ?? undefined,
      });
    },
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AuthPayload) =>
      apiRequest<AuthSuccessResponse>(apiEndpoints.login, {
        method: "POST",
        body: payload,
      }),
    onSuccess: async () => {
      const me = await queryClient.fetchQuery({
        queryKey: ME_QUERY_KEY,
        queryFn: () => apiRequest<MeResponse>(apiEndpoints.me),
      });
      writeSessionIdentity({
        userId: me.user_id,
        email: me.email,
        name: me.name ?? undefined,
        logoUrl: me.logo_url ?? undefined,
      });
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest<{ success: true; message: string }>(apiEndpoints.logout, {
        method: "POST",
      }),
    onSettled: async () => {
      clearSessionIdentity();
      await queryClient.clear();
    },
  });
}
