"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { ErrorState, LoadingState } from "@/components/ui/state";
import { useMeQuery } from "@/hooks/api/use-auth";
import { useSaveProfileMutation } from "@/hooks/api/use-profile";
import { useAuthErrorRedirect } from "@/hooks/use-auth-error-redirect";
import { isApiRequestError } from "@/lib/api/errors";

export default function ProfilePage() {
  const meQuery = useMeQuery();
  const saveProfileMutation = useSaveProfileMutation();
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useAuthErrorRedirect(meQuery.error);
  useAuthErrorRedirect(saveProfileMutation.error);

  const previewUrl = useMemo(
    () => (logoFile ? URL.createObjectURL(logoFile) : null),
    [logoFile]
  );

  const effectivePreview = useMemo(
    () => previewUrl ?? meQuery.data?.logo_url ?? null,
    [meQuery.data?.logo_url, previewUrl]
  );

  useEffect(
    () => () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [previewUrl]
  );

  if (meQuery.isPending) {
    return <LoadingState label="Loading profile..." />;
  }

  if (meQuery.error && isApiRequestError(meQuery.error)) {
    return <ErrorState message={meQuery.error.message} requestId={meQuery.error.requestId} />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <GlassCard className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">Account</p>
        <h1 className="headline text-4xl">Profile Settings</h1>
        <p className="text-text-secondary">
          Add your display name and logo for a cleaner dashboard identity.
        </p>
      </GlassCard>

      <GlassCard className="space-y-5">
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const trimmedName = String(formData.get("name") ?? "").trim();
            if (!trimmedName && !logoFile) {
              toast.error("Add a name or upload a logo to save changes.");
              return;
            }
            try {
              await saveProfileMutation.mutateAsync({
                name: trimmedName || undefined,
                logoFile,
              });
              setLogoFile(null);
              toast.success("Profile updated");
            } catch (error) {
              if (isApiRequestError(error)) {
                toast.error(error.message);
                return;
              }
              toast.error("Failed to update profile");
            }
          }}
        >
          <Input
            label="Display Name"
            name="name"
            defaultValue={meQuery.data?.name ?? ""}
            placeholder="Your name"
            maxLength={80}
          />

          <div className="grid gap-2">
            <label htmlFor="logo-upload" className="text-sm text-text-secondary">
              Logo Image
            </label>
            <input
              id="logo-upload"
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.gif"
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                const file = event.target.files?.[0] ?? null;
                setLogoFile(file);
              }}
              className="h-10 rounded-md border border-white/20 bg-white/5 px-3 text-sm text-text-primary file:mr-3 file:rounded-sm file:border-0 file:bg-accent-muted file:px-2 file:py-1 file:text-xs file:text-text-primary"
            />
            <p className="text-xs text-text-secondary">
              Allowed formats: PNG, JPG, JPEG, WEBP, GIF.
            </p>
          </div>

          {effectivePreview ? (
            <div className="w-fit overflow-hidden rounded-lg border border-white/10 bg-white/5 p-2">
              <Image
                src={effectivePreview}
                alt="Profile logo preview"
                width={96}
                height={96}
                className="size-24 rounded-md object-cover"
              />
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={saveProfileMutation.isPending}>
              Save Profile
            </Button>
            <Link
              href="/onboarding/brand"
              className="inline-flex h-10 items-center rounded-md border border-white/30 px-4 text-sm font-semibold text-text-primary transition-all duration-200 hover:bg-white/10"
            >
              Brand Settings
            </Link>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
