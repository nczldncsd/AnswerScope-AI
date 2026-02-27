"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useMeQuery } from "@/hooks/api/use-auth";
import { useBrandProfileQuery } from "@/hooks/api/use-brand";
import { useAuthErrorRedirect } from "@/hooks/use-auth-error-redirect";
import { isApiRequestError } from "@/lib/api/errors";
import { ErrorState, LoadingState } from "@/components/ui/state";

export function BrandProfileGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const meQuery = useMeQuery();
  const userId = meQuery.data?.user_id ?? null;
  const brandQuery = useBrandProfileQuery(userId);

  useAuthErrorRedirect(meQuery.error);
  useAuthErrorRedirect(brandQuery.error);

  useEffect(() => {
    if (!meQuery.data || brandQuery.isPending) {
      return;
    }
    if (!brandQuery.data?.brand_profile) {
      router.replace("/onboarding/brand");
    }
  }, [brandQuery.data, brandQuery.isPending, meQuery.data, router]);

  if (meQuery.isPending || brandQuery.isPending) {
    return <LoadingState label="Loading workspace..." />;
  }

  const firstError = [meQuery.error, brandQuery.error].find((entry) => Boolean(entry));
  if (firstError && isApiRequestError(firstError)) {
    return <ErrorState message={firstError.message} requestId={firstError.requestId} />;
  }

  if (!brandQuery.data?.brand_profile) {
    return <LoadingState label="Redirecting to onboarding..." />;
  }

  return <>{children}</>;
}
