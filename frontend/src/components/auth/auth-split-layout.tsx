import { BrandLogo } from "@/components/layout/brand-logo";
import { GlassCard } from "@/components/ui/glass-card";

export function AuthSplitLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden p-12 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-bg-surface via-bg-void to-bg-void" />
        <div className="relative z-[1] flex h-full flex-col gap-4">
          <BrandLogo href="/" labelClassName="text-3xl" />
          <div className="max-w-md space-y-2">
            <p className="text-sm uppercase tracking-[0.2em] text-accent">
              AI-Powered Visibility Analysis
            </p>
            <h2 className="headline text-5xl leading-[1.05]">
              KNOW EXACTLY
              <br />
              HOW AI <span className="gradient-text">SEES</span> YOU
            </h2>
            <p className="text-text-secondary">
              Structured LAS scoring, citation authority insights, and tactical action planning in
              one enterprise dashboard.
            </p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center p-4 md:p-8">
        <GlassCard className="w-full max-w-md space-y-2">
          <h1 className="headline text-3xl">{title}</h1>
          <p className="text-sm text-text-secondary">{subtitle}</p>
          {children}
          <div className="pt-2 text-sm text-text-secondary">{footer}</div>
        </GlassCard>
      </section>
    </div>
  );
}
