"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { ErrorState, LoadingState } from "@/components/ui/state";
import { useMeQuery } from "@/hooks/api/use-auth";
import { useBrandProfileQuery, useSaveBrandMutation } from "@/hooks/api/use-brand";
import { useAuthErrorRedirect } from "@/hooks/use-auth-error-redirect";
import { isApiRequestError } from "@/lib/api/errors";
import type { BrandCategory } from "@/lib/types/contracts";

const CATEGORY_OPTIONS: BrandCategory[] = ["generic", "ecommerce", "saas", "local"];

function competitorsFromInput(value: string) {
  return value
    .split(/[\n,]+/g)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export default function BrandSetupPage() {
  const router = useRouter();
  const meQuery = useMeQuery();
  const userId = meQuery.data?.user_id ?? null;
  const brandQuery = useBrandProfileQuery(userId);
  const saveBrandMutation = useSaveBrandMutation(userId);

  useAuthErrorRedirect(meQuery.error);
  useAuthErrorRedirect(brandQuery.error);

  if (meQuery.isPending || brandQuery.isPending) {
    return <LoadingState label="Loading brand profile..." />;
  }

  if (meQuery.error && isApiRequestError(meQuery.error)) {
    return <ErrorState message={meQuery.error.message} requestId={meQuery.error.requestId} />;
  }
  if (brandQuery.error && isApiRequestError(brandQuery.error)) {
    return <ErrorState message={brandQuery.error.message} requestId={brandQuery.error.requestId} />;
  }

  const profile = brandQuery.data?.brand_profile;
  const hasExistingProfile = Boolean(profile);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <GlassCard className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">Onboarding</p>
        <h1 className="headline text-4xl">Brand Setup</h1>
        <p className="text-text-secondary">
          Define your brand context before launching strategic analysis.
        </p>
      </GlassCard>

      <GlassCard className="space-y-4">
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const brandName = String(formData.get("brand_name") ?? "").trim();
            const websiteUrl = String(formData.get("website_url") ?? "").trim();
            const brandCategory = String(formData.get("brand_category") ?? "generic");
            const competitors = String(formData.get("competitors") ?? "");

            try {
              await saveBrandMutation.mutateAsync({
                brand_name: brandName,
                website_url: websiteUrl,
                competitors: competitorsFromInput(competitors),
                brand_category: CATEGORY_OPTIONS.includes(brandCategory as BrandCategory)
                  ? (brandCategory as BrandCategory)
                  : "generic",
              });
              toast.success(
                hasExistingProfile ? "Brand profile updated" : "Brand profile saved"
              );
              router.replace("/dashboard/analysis/new");
            } catch (error) {
              if (isApiRequestError(error)) {
                toast.error(error.message);
                return;
              }
              toast.error("Failed to save brand profile");
            }
          }}
        >
          <Input
            label="Brand Name"
            name="brand_name"
            defaultValue={profile?.brand_name ?? ""}
            required
          />
          <Input
            label="Website URL"
            name="website_url"
            defaultValue={profile?.website_url ?? ""}
            placeholder="https://example.com"
            required
          />
          <div className="grid gap-2">
            <label htmlFor="brand-category" className="text-sm text-text-secondary">
              Brand Category
            </label>
            <select
              id="brand-category"
              name="brand_category"
              defaultValue={profile?.brand_category ?? "generic"}
              className="h-10 rounded-md border border-white/20 bg-white/5 px-3 text-sm text-text-primary outline-none transition-all duration-200 focus:border-accent/50 focus:ring-2 focus:ring-accent/30"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option} className="bg-bg-surface text-text-primary">
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <label htmlFor="competitors" className="text-sm text-text-secondary">
              Competitors (comma or new line separated)
            </label>
            <textarea
              id="competitors"
              name="competitors"
              defaultValue={profile?.competitors.join(", ") ?? ""}
              className="min-h-28 rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none transition-all duration-200 focus:border-accent/50 focus:ring-2 focus:ring-accent/30"
              placeholder="https://hubspot.com, https://salesforce.com"
            />
          </div>
          <Button type="submit" loading={saveBrandMutation.isPending}>
            {hasExistingProfile ? "Update Brand Profile" : "Save Brand Profile"}
          </Button>
        </form>
      </GlassCard>
    </div>
  );
}
