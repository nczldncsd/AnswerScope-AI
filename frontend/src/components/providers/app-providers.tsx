"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { useState } from "react";

import { isApiRequestError } from "@/lib/api/errors";
import { AppToaster } from "@/components/ui/toaster";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              if (isApiRequestError(error) && error.status < 500) {
                return false;
              }
              return failureCount < 2;
            },
            staleTime: 5_000,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  return (
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        {children}
        <AppToaster />
      </QueryClientProvider>
    </MotionConfig>
  );
}
