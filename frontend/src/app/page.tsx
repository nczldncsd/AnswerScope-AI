import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Clock3,
  History,
  LayoutDashboard,
  Layers3,
  LineChart,
  MoveRight,
  Radar,
  ScanLine,
  ScanSearch,
  Search,
  ShieldCheck,
  Smile,
  Sparkles,
  Target,
  Wrench,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { BrandLogo } from "@/components/layout/brand-logo";
import { MetricCard } from "@/components/dashboard/metric-card";
import { GlassCard } from "@/components/ui/glass-card";

import styles from "./page.module.css";

type FeatureItem = {
  title: string;
  detail: string;
  point: string;
  icon: LucideIcon;
};

type HowStep = {
  title: string;
  detail: string;
  icon: LucideIcon;
};

type RecentScan = {
  keyword: string;
  timestamp: string;
  las: number;
  authority: number;
};

type PillarRow = {
  label: string;
  value: number;
  color: string;
  icon: LucideIcon;
};

const techStack = [
  "Next.js",
  "React",
  "TypeScript",
  "Tailwind CSS",
  "React Query",
  "Recharts",
  "Framer Motion",
  "Flask",
  "SQLite",
  "Google GenAI",
  "Playwright",
];

const features: FeatureItem[] = [
  {
    title: "LAS + Pillar Signals",
    detail:
      "Measure visibility using LAS, Citation Authority, Sentiment, and the 4-pillar score model in one place.",
    point: "Decision baseline for every scan",
    icon: ScanSearch,
  },
  {
    title: "Evidence-Based Gap Analysis",
    detail:
      "Compare generated answers against your target pages to detect coverage gaps and citation weaknesses.",
    point: "Shows what is missing and where",
    icon: Target,
  },
  {
    title: "Actionable Recommendations",
    detail:
      "Convert scan outputs into clear next steps for content, technical, and authority improvements.",
    point: "Built for iterative improvement",
    icon: Zap,
  },
  {
    title: "Trend + History Tracking",
    detail:
      "Track scan history over time to validate whether optimizations improve ranking signals in AI answers.",
    point: "Supports semester-long progress reporting",
    icon: Zap,
  },
];

const howItWorks: HowStep[] = [
  {
    title: "Create Brand Context",
    detail:
      "Store brand profile, category, and competitors once so all scans use consistent context.",
    icon: Layers3,
  },
  {
    title: "Run Async Analysis",
    detail:
      "Submit keyword and target URL, then track queued-to-completed status with evidence signals.",
    icon: Activity,
  },
  {
    title: "Review Dashboard Outputs",
    detail:
      "Use LAS, Citation Authority, Sentiment, pillar scores, and trends to guide decisions.",
    icon: LineChart,
  },
];

const recentScans: RecentScan[] = [
  { keyword: "best crm for startups", timestamp: "2026-02-24 18:40", las: 67, authority: 82 },
  { keyword: "marketing automation tools", timestamp: "2026-02-23 11:14", las: 64, authority: 79 },
  { keyword: "saas customer onboarding", timestamp: "2026-02-22 09:08", las: 69, authority: 84 },
];

const pillarRows: PillarRow[] = [
  { label: "Visibility", value: 72, color: "var(--score-visibility)", icon: Radar },
  { label: "Content", value: 64, color: "var(--score-content)", icon: Sparkles },
  { label: "Technical", value: 81, color: "var(--score-technical)", icon: Wrench },
  { label: "Visual", value: 58, color: "var(--score-visual)", icon: Activity },
];

export default function LandingPage() {
  const marquee = [...techStack, ...techStack];

  return (
    <div className={styles.pageRoot}>
      <nav id="public-nav" className={styles.publicNav}>
        <div className={styles.navInner}>
          <BrandLogo
            href="#hero"
            className={styles.brandWrap}
            labelClassName={styles.brandLabel}
            iconClassName={styles.brandIcon}
          />
          <div className={styles.navActions}>
            <a href="#features" className={styles.navLink}>Features</a>
            <a href="#how-it-works" className={styles.navLink}>How It Works</a>
            <a href="#dashboard" className={styles.navLink}>Dashboard</a>
            <Link href="/login" className={styles.navGhost}>Login</Link>
            <Link href="/register" className={styles.navPrimary}>Start Free</Link>
          </div>
        </div>
      </nav>

      <section id="hero" className={styles.heroSection}>
        <div className={styles.heroGlow} aria-hidden />

        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>AI-Powered Visibility Analysis</div>

          <h1 className={`${styles.heroTitle} ${styles.fontDisplay}`}>
            KNOW EXACTLY
            <br />
            HOW AI <span className={styles.heroAccent}>SEES</span> YOU
          </h1>

          <p className={styles.heroSubtext}>
            Strategic analysis workflow that reveals AI-search visibility, highlights competitive
            gaps, and converts findings into measurable dashboard actions.
          </p>

          <div className={styles.heroButtons}>
            <Link href="/register" className={styles.ctaPrimary}>
              Start Free Analysis
              <ArrowRight size={18} />
            </Link>
            <a href="#dashboard" className={styles.ctaSecondary}>
              See Dashboard Preview
            </a>
          </div>
        </div>
      </section>

      <section id="how-it-works" className={styles.howSection}>
        <div className={styles.sectionHead}>
          <h2 className={`${styles.sectionTitle} ${styles.fontDisplay}`}>HOW IT WORKS</h2>
          <p className={styles.sectionText}>
            A three-step loop from profile setup to decision-ready analytics.
          </p>
        </div>

        <div className={styles.howGrid}>
          {howItWorks.map((step, index) => {
            const Icon = step.icon;
            return (
              <article key={step.title} className={styles.howCard}>
                <div className={styles.stepBadge}>0{index + 1}</div>
                <div className={styles.howIcon}><Icon size={20} /></div>
                <h3 className={styles.howTitle}>{step.title}</h3>
                <p className={styles.howText}>{step.detail}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="dashboard" className={styles.dashboardSection}>
        <div className={styles.sectionHead}>
          <h2 className={`${styles.sectionTitle} ${styles.fontDisplay}`}>REAL DASHBOARD LOOK</h2>
          <p className={styles.sectionText}>
            Layout and modules aligned to your actual dashboard experience.
          </p>
        </div>

        <div className={styles.replicaShell}>
          <aside className={styles.replicaAside}>
            <div className={styles.replicaBrand}>
              <BrandLogo href="/" labelClassName={styles.replicaBrandLabel} iconClassName={styles.brandIcon} />
            </div>

            <nav className={styles.replicaMenu}>
              <div className={`${styles.replicaItem} ${styles.replicaItemActive}`}>
                <LayoutDashboard size={16} /> Dashboard
              </div>
              <div className={styles.replicaItem}>
                <ScanLine size={16} /> New Analysis
              </div>
              <div className={styles.replicaItem}>
                <History size={16} /> Scan History
              </div>
            </nav>
          </aside>

          <div className={styles.replicaRight}>
            <header className={styles.replicaHeader}>
              <div>
                <h3 className={styles.replicaHeaderTitle}>Welcome back</h3>
                <p className={styles.replicaHeaderSub}>Dashboard Overview</p>
              </div>
              <Link href="/dashboard/analysis/new" className={styles.ctaPrimary}>
                New Analysis
              </Link>
            </header>

            <div className={styles.replicaBody}>
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <MetricCard
                  label="LAS Score (Avg)"
                  value="67"
                  progress={67}
                  icon={Activity}
                  learnMoreHref="/knowledge/las"
                />
                <MetricCard
                  label="Citation Authority (Avg)"
                  value="82"
                  progress={82}
                  icon={ShieldCheck}
                  learnMoreHref="/knowledge/improvement"
                />
                <MetricCard
                  label="Sentiment"
                  value="Positive"
                  description="Latest score: 78"
                  icon={Smile}
                  learnMoreHref="/knowledge/sentiment"
                />
              </section>

              <section className="grid items-stretch gap-4 xl:grid-cols-2">
                <GlassCard className="flex h-full flex-col space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="headline flex items-center gap-2 text-2xl">
                      <Clock3 className="size-5 text-accent" />
                      Recent Scans
                    </h2>
                    <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-text-secondary">
                      Total: 3
                    </span>
                  </div>
                  <ul className="grid gap-2">
                    {recentScans.map((scan) => (
                      <li key={scan.keyword} className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-accent">
                            <Search className="size-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-text-primary">{scan.keyword}</p>
                            <p className="text-xs text-text-secondary">{scan.timestamp}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-text-primary">LAS {scan.las}</p>
                            <p className="text-xs text-text-secondary">CA {scan.authority}</p>
                          </div>
                          <span className="inline-flex size-8 items-center justify-center rounded-md bg-white/10 text-text-secondary">
                            <MoveRight className="size-4" />
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </GlassCard>

                <GlassCard className="flex h-full flex-col space-y-3">
                  <h2 className="headline flex items-center gap-2 text-2xl">
                    <Layers3 className="size-5 text-accent" />
                    Pillar Breakdown
                  </h2>
                  <div className="grid gap-1.5">
                    {pillarRows.map((row) => {
                      const Icon = row.icon;
                      return (
                        <div key={row.label} className="rounded-lg border border-white/10 bg-white/5 p-2">
                          <div className="mb-1.5 flex items-center gap-2">
                            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-white/10">
                              <Icon className="size-3.5" style={{ color: row.color }} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-text-primary">{row.label}</p>
                            </div>
                            <span className="text-lg font-semibold text-text-primary">{row.value}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${row.value}%`, backgroundColor: row.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>
              </section>

              <section>
                <GlassCard className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="headline flex items-center gap-2 text-2xl">
                      <LineChart className="size-5 text-accent" />
                      Trends Snapshot
                    </h2>
                    <Link href="/dashboard/trends" className="text-sm text-accent hover:text-accent-hover">
                      View trends
                    </Link>
                  </div>
                  <div className={styles.trendPanel}>
                    <svg viewBox="0 0 760 210" className={styles.trendSvg} aria-hidden>
                      <path d="M20 180C90 168 130 150 190 144C250 139 290 126 350 122C420 118 470 102 540 94C610 86 660 82 740 54" fill="none" stroke="url(#lineA)" strokeWidth="4" strokeLinecap="round" />
                      <path d="M20 188C90 176 130 170 190 162C250 155 290 148 350 142C420 138 470 128 540 122C610 116 660 108 740 90" fill="none" stroke="url(#lineB)" strokeWidth="4" strokeLinecap="round" strokeDasharray="8 6" />
                      <defs>
                        <linearGradient id="lineA" x1="20" y1="180" x2="740" y2="54" gradientUnits="userSpaceOnUse">
                          <stop offset="0" stopColor="var(--score-visibility)" />
                          <stop offset="1" stopColor="var(--score-content)" />
                        </linearGradient>
                        <linearGradient id="lineB" x1="20" y1="188" x2="740" y2="90" gradientUnits="userSpaceOnUse">
                          <stop offset="0" stopColor="var(--score-content)" />
                          <stop offset="1" stopColor="var(--score-technical)" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className={styles.trendLegend}>
                      <span className={styles.legendItem}>
                        <span className={`${styles.legendSwatch} ${styles.legendSwatchA}`} />
                        LAS Trend
                      </span>
                      <span className={styles.legendItem}>
                        <span className={`${styles.legendSwatch} ${styles.legendSwatchB}`} />
                        Citation Authority Trend
                      </span>
                    </div>
                    <div className={styles.trendAxis}><span>30d ago</span><span>Today</span></div>
                  </div>
                </GlassCard>
              </section>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className={styles.featuresSection}>
        <div className={styles.sectionHead}>
          <h2 className={`${styles.sectionTitle} ${styles.fontDisplay}`}>FEATURES</h2>
          <p className={styles.sectionText}>
            Core capabilities that make the dashboard useful for both product execution and academic evaluation.
          </p>
        </div>

        <div className={styles.featureGrid}>
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className={styles.featureCard}>
                <div className={styles.featureIconWrap}>
                  <Icon size={24} />
                </div>
                <h3 className={`${styles.featureTitle} ${styles.fontDisplay}`}>{feature.title}</h3>
                <p className={styles.featureText}>{feature.detail}</p>
                <p className={styles.featurePoint}>{feature.point}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.poweredBySection}>
        <div className={styles.sectionHead}>
          <h2 className={`${styles.sectionTitle} ${styles.fontDisplay}`}>POWERED BY</h2>
          <p className={styles.sectionText}>
            Production stack used across frontend, backend, analytics, and reporting.
          </p>
        </div>

        <div className={styles.marquee}>
          <div className={styles.marqueeTrack}>
            {marquee.map((item, index) => (
              <span key={`${item}-${index}`} className={styles.logoPill}>{item}</span>
            ))}
          </div>
        </div>
      </section>

      <footer className={styles.landingFooter}>
        <div className={styles.footerInner}>
          <BrandLogo href="#hero" labelClassName={styles.brandLabel} iconClassName={styles.brandIcon} />
          <p className={styles.footerText}>
            AI visibility analytics platform for measurable brand performance across generated search answers.
          </p>
          <div className={styles.footerLinks}>
            <Link href="/register" className={styles.footerLink}>Register</Link>
            <Link href="/login" className={styles.footerLink}>Login</Link>
            <a href="#hero" className={styles.footerLink}>Back to top</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
