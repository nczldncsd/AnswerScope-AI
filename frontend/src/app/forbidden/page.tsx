import Link from "next/link";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";

export default function ForbiddenPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center p-4">
      <GlassCard className="w-full space-y-4 text-center">
        <p className="headline text-sm text-warning">403</p>
        <h1 className="headline text-4xl">Forbidden</h1>
        <p className="text-text-secondary">
          Your current session cannot access this resource.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/login">
            <Button>Go to Login</Button>
          </Link>
          <Link href="/">
            <Button variant="ghost">Home</Button>
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}
