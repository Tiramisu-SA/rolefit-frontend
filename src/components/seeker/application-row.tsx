"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { CompanyAvatar } from "@/components/brand/company-avatar";
import { StatusBadge } from "@/components/brand/status-badge";
import { Button } from "@/components/ui/button";
import { cn, formatDate, relativeDays } from "@/lib/utils";
import type { ApplicationStatus, ApplicationView } from "@/lib/types";

const PROGRESS_STEPS: ApplicationStatus[] = ["Submitted", "Under review", "Interview", "Offer"];

/**
 * Index (into PROGRESS_STEPS) of how far the application has progressed. For a Rejected
 * application, that's the last non-Rejected status recorded in its history, so the bar still
 * shows how far it got before it was closed out.
 */
function reachedIndex(application: ApplicationView): number {
  if (application.status !== "Rejected") {
    const i = PROGRESS_STEPS.indexOf(application.status);
    return i === -1 ? 0 : i;
  }
  for (let i = application.history.length - 1; i >= 0; i--) {
    const step = application.history[i].status;
    if (step !== "Rejected") {
      const idx = PROGRESS_STEPS.indexOf(step);
      if (idx !== -1) return idx;
    }
  }
  return 0;
}

export function ApplicationRow({ application }: { application: ApplicationView }) {
  const [open, setOpen] = useState(false);
  const historyId = useId();
  const reached = reachedIndex(application);
  const rejected = application.status === "Rejected";
  const history = [...application.history].reverse();

  return (
    <article className="flex flex-col gap-4 rounded-2xl border bg-card p-5 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
        <div className="flex items-center gap-4 md:w-70 md:shrink-0">
          <CompanyAvatar company={application.job.company} size="md" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[17px] font-bold text-foreground">{application.job.title}</span>
            <span className="truncate text-sm text-muted-foreground">
              {application.job.company.name} · Applied {formatDate(application.submittedAt)}
            </span>
          </div>
        </div>

        <ol aria-label="Progress" className="flex flex-1 items-center gap-2">
          {PROGRESS_STEPS.map((label, i) => {
            const done = i <= reached;
            return (
              <li key={label} className="flex flex-1 flex-col gap-2">
                <span
                  aria-hidden
                  className={cn("block h-1.5 rounded-full", done ? (rejected ? "bg-destructive/40" : "bg-primary") : "bg-border")}
                />
                <span className={cn("text-xs", i === reached ? "font-bold text-foreground" : "font-medium text-muted-foreground")}>
                  {label}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="flex items-center justify-between gap-3 md:w-auto md:shrink-0 md:justify-end">
          <div className="flex flex-col items-start gap-1 md:items-end">
            <StatusBadge status={application.status} />
            <span className="text-[13px] text-muted-foreground">Updated {relativeDays(application.updatedAt)}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-expanded={open}
            aria-controls={historyId}
            aria-label={open ? "Hide history" : "Show history"}
            onClick={() => setOpen((prev) => !prev)}
          >
            <ChevronDown className={cn("size-4.5 transition-transform", open && "rotate-180")} aria-hidden />
          </Button>
        </div>
      </div>

      {open && (
        <div id={historyId} className="flex flex-col gap-3 border-t pt-4">
          <h3 className="text-sm font-bold text-foreground">Status history</h3>
          <ol className="flex flex-col gap-3">
            {history.map((change, i) => (
              <li key={i} className="flex flex-col gap-0.5 text-sm sm:flex-row sm:items-baseline sm:gap-3">
                <span className="font-semibold text-foreground sm:w-32 sm:shrink-0">{change.status}</span>
                <span className="text-muted-foreground sm:w-28 sm:shrink-0">{formatDate(change.at)}</span>
                {change.note && <span className="text-muted-foreground sm:flex-1">{change.note}</span>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </article>
  );
}
