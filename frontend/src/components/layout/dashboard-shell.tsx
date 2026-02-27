"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  CircleUserRound,
  FileText,
  Gauge,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";
import { useLogoutMutation, useMeQuery } from "@/hooks/api/use-auth";
import { cn } from "@/lib/utils";

const DASHBOARD_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/dashboard/analysis/new", label: "New Analysis", icon: Sparkles },
  { href: "/dashboard/history", label: "History", icon: FileText },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const meQuery = useMeQuery();
  const logoutMutation = useLogoutMutation();
  const [dismissedProfilePrompt, setDismissedProfilePrompt] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const userName =
    meQuery.data?.name?.trim() || meQuery.data?.email?.split("@")[0] || "Analyst";
  const hasName = Boolean(meQuery.data?.name?.trim());
  const hasLogo = Boolean(meQuery.data?.logo_url);
  // Gate prompt ensures first-time users complete identity metadata required by reports/history views.
  const shouldPromptProfile = !hasName || !hasLogo;

  const profileInitial = userName.charAt(0).toUpperCase();

  const isLinkActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen">
      <aside
        className={cn(
          "fixed left-0 top-0 z-30 hidden h-screen w-64 border-r border-white/10 bg-bg-surface/60 p-6 backdrop-blur-xl transition-transform duration-200 lg:flex lg:flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="mb-6">
          <BrandLogo href="/" labelClassName="text-2xl" />
          <p className="mt-2 text-xs text-text-secondary">AI Visibility Intelligence</p>
        </div>

        <nav className="grid gap-1.5">
          {DASHBOARD_LINKS.map((item) => {
            const Icon = item.icon;
            const active = isLinkActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-all duration-200",
                  active
                    ? "bg-accent-muted text-text-primary"
                    : "text-text-secondary hover:bg-white/10 hover:text-text-primary"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto grid gap-4 pt-8">
          <Link
            href="/knowledge"
            className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent-hover"
          >
            <BookOpen className="size-4" />
            Knowledge Base
          </Link>

          <div className="glass-card flex items-center justify-between rounded-lg p-3">
            <Link href="/dashboard/profile" className="flex min-w-0 items-center gap-3">
              {meQuery.data?.logo_url ? (
                <Image
                  src={meQuery.data.logo_url}
                  alt="Profile logo"
                  width={40}
                  height={40}
                  className="size-10 rounded-md object-cover"
                />
              ) : (
                <div className="flex size-10 items-center justify-center rounded-md bg-white/10 text-sm text-text-primary">
                  {profileInitial || <CircleUserRound className="size-4" />}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm text-text-primary">{userName}</p>
                <p className="truncate text-xs text-text-secondary">Profile Settings</p>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="!h-9 !w-9 shrink-0 !px-0"
              onClick={async () => {
                try {
                  await logoutMutation.mutateAsync();
                  toast.success("Logged out");
                  router.replace("/login");
                } catch {
                  toast.error("Logout failed");
                }
              }}
              loading={logoutMutation.isPending}
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="size-4 shrink-0" />
            </Button>
          </div>
        </div>
      </aside>

      <div
        className={cn(
          "w-full min-w-0 transition-[padding] duration-200",
          sidebarOpen ? "lg:pl-64" : "lg:pl-0"
        )}
      >
        <header className="sticky top-0 z-[5] border-b border-white/10 bg-bg-surface/60 px-4 py-4 backdrop-blur-xl md:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="hidden lg:inline-flex !h-9 !w-9 !px-0"
                onClick={() => setSidebarOpen((value) => !value)}
                aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
                title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="size-4" />
                ) : (
                  <PanelLeftOpen className="size-4" />
                )}
              </Button>
              <div>
              <p className="text-sm text-text-secondary">Welcome back</p>
              <h1 className="font-headline text-2xl text-text-primary">{userName}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className="lg:hidden"
                onClick={async () => {
                  try {
                    await logoutMutation.mutateAsync();
                    router.replace("/login");
                  } catch {
                    toast.error("Logout failed");
                  }
                }}
                loading={logoutMutation.isPending}
              >
                Logout
              </Button>
              <Link href="/dashboard/analysis/new">
                <Button>New Analysis</Button>
              </Link>
            </div>
          </div>
          {shouldPromptProfile && pathname !== "/dashboard/profile" && !dismissedProfilePrompt ? (
            <div className="mt-4 rounded-md border border-accent/40 bg-accent-muted px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-text-primary">
                  Complete your profile with a display name and logo.
                </p>
                <div className="flex items-center gap-2">
                  <Link
                    href="/dashboard/profile"
                    className="inline-flex h-9 items-center rounded-md bg-[image:var(--gradient-accent)] px-3 text-xs font-semibold text-text-on-accent"
                  >
                    Complete Profile
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDismissedProfilePrompt(true)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </header>
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
