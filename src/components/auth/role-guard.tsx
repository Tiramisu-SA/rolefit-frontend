"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useRole } from "@/lib/auth/role-context";
import type { Role } from "@/lib/types";

export function RoleGuard({ role, children }: { role: Role; children: React.ReactNode }) {
  const { session, ready } = useRole();
  const router = useRouter();
  const allowed = session?.role === role;

  useEffect(() => {
    if (ready && !allowed) router.replace(`/login?role=${role}`);
  }, [ready, allowed, role, router]);

  if (!ready || !allowed) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted-foreground" role="status">
        <Loader2 className="mr-2 size-5 animate-spin" aria-hidden /> Loading…
      </div>
    );
  }
  return <>{children}</>;
}
