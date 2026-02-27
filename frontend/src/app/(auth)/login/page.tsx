"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLoginMutation } from "@/hooks/api/use-auth";
import { useBrandProfileQuery } from "@/hooks/api/use-brand";
import { useAuthErrorRedirect } from "@/hooks/use-auth-error-redirect";
import { isApiRequestError } from "@/lib/api/errors";
import { readSessionIdentity } from "@/lib/auth/session-store";

export default function LoginPage() {
  const router = useRouter();
  const loginMutation = useLoginMutation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [postLoginUserId, setPostLoginUserId] = useState<number | null>(null);
  const brandQuery = useBrandProfileQuery(postLoginUserId);
  useAuthErrorRedirect(brandQuery.error);

  useEffect(() => {
    if (!postLoginUserId || brandQuery.isPending) {
      return;
    }
    if (brandQuery.data?.brand_profile) {
      const identity = readSessionIdentity();
      if (!identity?.name || !identity.logoUrl) {
        router.replace("/dashboard/profile?prompt=1");
        return;
      }
      router.replace("/dashboard");
      return;
    }
    if (brandQuery.data && !brandQuery.data.brand_profile) {
      router.replace("/onboarding/brand");
    }
  }, [brandQuery.data, brandQuery.isPending, postLoginUserId, router]);

  return (
    <AuthSplitLayout
      title="Login"
      subtitle="Access your dashboard and continue strategic analysis."
      footer={
        <>
          Need an account?{" "}
          <Link href="/register" className="text-accent hover:text-accent-hover">
            Register
          </Link>
        </>
      }
    >
      <form
        className="grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            const response = await loginMutation.mutateAsync({ email, password });
            if (response.user_id) {
              setPostLoginUserId(response.user_id);
              toast.success("Welcome back");
            }
          } catch (error) {
            if (isApiRequestError(error)) {
              toast.error(error.message);
              return;
            }
            toast.error("Login failed");
          }
        }}
      >
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <Button
          type="submit"
          loading={loginMutation.isPending || (postLoginUserId !== null && brandQuery.isPending)}
        >
          Login
        </Button>
      </form>
    </AuthSplitLayout>
  );
}
