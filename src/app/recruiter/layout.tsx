import { RoleGuard } from "@/components/auth/role-guard";
import { RecruiterShell } from "@/components/recruiter/recruiter-shell";

export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard role="recruiter">
      <RecruiterShell>{children}</RecruiterShell>
    </RoleGuard>
  );
}
