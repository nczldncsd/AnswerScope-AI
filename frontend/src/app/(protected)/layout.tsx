import { AuthGate } from "@/components/auth/auth-gate";

export default function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AuthGate>{children}</AuthGate>;
}
