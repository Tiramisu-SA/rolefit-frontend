import { cn } from "@/lib/utils";
import type { ApplicationStatus, JobStatus } from "@/lib/types";

const STYLE: Record<ApplicationStatus | JobStatus, string> = {
  Submitted: "bg-primary-soft text-primary-soft-foreground",
  "Under review": "bg-info-soft text-info",
  Interview: "bg-match-good-soft text-match-good",
  Offer: "bg-match-strong-soft text-match-strong",
  Rejected: "bg-destructive-soft text-destructive",
  Published: "bg-match-strong-soft text-match-strong",
  Draft: "bg-muted text-muted-foreground",
  Closed: "bg-destructive-soft text-destructive",
};

export function StatusBadge({ status, audience = "seeker", className }: { status: ApplicationStatus | JobStatus; audience?: "seeker" | "recruiter"; className?: string }) {
  const label = status === "Submitted" && audience === "recruiter" ? "New" : status;
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold", STYLE[status], className)}>{label}</span>;
}
