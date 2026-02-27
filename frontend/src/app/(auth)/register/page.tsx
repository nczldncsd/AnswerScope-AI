"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRegisterMutation } from "@/hooks/api/use-auth";
import { isApiRequestError } from "@/lib/api/errors";

export default function RegisterPage() {
  const router = useRouter();
  const registerMutation = useRegisterMutation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMismatch, setPasswordMismatch] = useState("");

  return (
    <AuthSplitLayout
      title="Create Account"
      subtitle="Register to start your first AI visibility scan."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:text-accent-hover">
            Login
          </Link>
        </>
      }
    >
      <form
        className="grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (password !== confirmPassword) {
            setPasswordMismatch("Passwords do not match.");
            toast.error("Passwords do not match");
            return;
          }
          setPasswordMismatch("");
          try {
            await registerMutation.mutateAsync({ email, password });
            toast.success("Registration successful");
            router.replace("/onboarding/brand");
          } catch (error) {
            if (isApiRequestError(error)) {
              toast.error(error.message);
              return;
            }
            toast.error("Registration failed");
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
          placeholder="Minimum 8 characters"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            if (passwordMismatch) {
              setPasswordMismatch("");
            }
          }}
          required
        />
        <Input
          label="Confirm Password"
          type="password"
          placeholder="Re-enter password"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            if (passwordMismatch) {
              setPasswordMismatch("");
            }
          }}
          error={passwordMismatch}
          required
        />
        <Button type="submit" loading={registerMutation.isPending}>
          Start Analysis
        </Button>
      </form>
    </AuthSplitLayout>
  );
}
