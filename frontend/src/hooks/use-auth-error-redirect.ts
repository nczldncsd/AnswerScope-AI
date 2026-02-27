"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { isApiRequestError } from "@/lib/api/errors";

export function useAuthErrorRedirect(error: unknown) {
  const router = useRouter();

  useEffect(() => {
    if (!isApiRequestError(error)) {
      return;
    }
    if (error.status === 401) {
      router.replace("/login");
      return;
    }
    if (error.status === 403) {
      router.replace("/forbidden");
    }
  }, [error, router]);
}
