import { cn } from "@/lib/utils";
import { JOB_STATUS_LABEL } from "@/lib/labels";
import type { ApplicationStatus, JobStatus } from "@/lib/types";

const STYLE: Record<ApplicationStatus | JobStatus, string> = {
  Submitted: "bg-primary-soft text-primary-soft-foreground",
  "Under review": "bg-info-soft text-info",
  Interview: "bg-match-good-soft text-match-good",
  Offer: "bg-match-strong-soft text-match-strong",
  Rejected: "bg-destructive-soft text-destructive",
  OPEN: "bg-match-strong-soft text-match-strong",
  DRAFT: "bg-muted text-muted-foreground",
  CLOSED: "bg-destructive-soft text-destructive",
};

function labelFor(status: ApplicationStatus | JobStatus, audience: "seeker" | "recruiter"): string {
  if (status in JOB_STATUS_LABEL) return JOB_STATUS_LABEL[status as JobStatus];
  return status === "Submitted" && audience === "recruiter" ? "New" : status;
}

export function StatusBadge({ status, audience = "seeker", className }: { status: ApplicationStatus | JobStatus; audience?: "seeker" | "recruiter"; className?: string }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold", STYLE[status], className)}>{labelFor(status, audience)}</span>;
}
