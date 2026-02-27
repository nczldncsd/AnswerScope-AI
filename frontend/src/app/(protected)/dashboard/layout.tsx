import { BrandProfileGate } from "@/components/auth/brand-profile-gate";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <BrandProfileGate>
      <DashboardShell>{children}</DashboardShell>
    </BrandProfileGate>
  );
}
