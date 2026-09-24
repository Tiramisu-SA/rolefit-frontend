import { RoleGuard } from "@/components/auth/role-guard";
import { SeekerShell } from "@/components/seeker/seeker-shell";

export default function SeekerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard role="seeker">
      <SeekerShell>{children}</SeekerShell>
    </RoleGuard>
  );
}
