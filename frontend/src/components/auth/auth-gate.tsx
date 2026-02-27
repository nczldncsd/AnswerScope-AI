"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect } from "react";

import { useMeQuery } from "@/hooks/api/use-auth";
import { writeSessionIdentity } from "@/lib/auth/session-store";
import { isApiRequestError } from "@/lib/api/errors";
import { useAuthErrorRedirect } from "@/hooks/use-auth-error-redirect";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const meQuery = useMeQuery();
  useAuthErrorRedirect(meQuery.error);

  useEffect(() => {
    if (meQuery.data) {
      writeSessionIdentity({
        userId: meQuery.data.user_id,
        email: meQuery.data.email,
        name: meQuery.data.name ?? undefined,
        logoUrl: meQuery.data.logo_url ?? undefined,
      });
    }
  }, [meQuery.data]);

  if (meQuery.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="glass-card flex items-center gap-2 px-4 py-3 text-sm text-text-secondary">
          <Loader2 className="size-4 animate-spin" />
          Validating session...
        </div>
      </div>
    );
  }

  if (meQuery.error && isApiRequestError(meQuery.error)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="glass-card max-w-md space-y-2 p-6">
          <div className="flex items-center gap-2 text-warning">
            <AlertTriangle className="size-4" />
            Access Check Failed
          </div>
          <p className="text-sm text-text-secondary">{meQuery.error.message}</p>
          {meQuery.error.requestId ? (
            <p className="font-mono text-xs text-text-secondary">
              request_id: {meQuery.error.requestId}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
