"use client";

import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/brand/status-badge";
import { MATCH_TIER_CLASS, matchTier } from "@/lib/match";
import { cn } from "@/lib/utils";
import type { ApplicationStatus, ApplicationView } from "@/lib/types";

type FilterValue = "all" | ApplicationStatus;

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "Submitted", label: "New" },
  { value: "Under review", label: "Under review" },
  { value: "Interview", label: "Interview" },
  { value: "Offer", label: "Offer" },
  { value: "Rejected", label: "Rejected" },
];

/** Rotating avatar backgrounds from the design tokens; kept deterministic by list position. */
const AVATAR_CLASSES = [
  "bg-primary-soft text-primary-soft-foreground",
  "bg-match-good-soft text-match-good",
  "bg-match-strong-soft text-match-strong",
  "bg-info-soft text-info",
  "bg-match-partial-soft text-match-partial",
];

export function ApplicantList({
  applications,
  selectedId,
  onSelect,
}: {
  applications: ApplicationView[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const [filter, setFilter] = useState<FilterValue>("all");

  const counts = useMemo(() => {
    const c: Record<FilterValue, number> = { all: applications.length, Submitted: 0, "Under review": 0, Interview: 0, Offer: 0, Rejected: 0 };
    for (const a of applications) c[a.status] += 1;
    return c;
  }, [applications]);

  const filtered = useMemo(
    () => (filter === "all" ? applications : applications.filter((a) => a.status === filter)),
    [applications, filter],
  );

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap gap-1 border-b p-3.5">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(f.value)}
              className={cn(
                "h-9 rounded-lg px-3 text-[13px] font-bold whitespace-nowrap transition-colors",
                active ? "bg-primary-soft text-primary-soft-foreground" : "text-foreground/70 hover:bg-muted",
              )}
            >
              {f.label} · {counts[f.value]}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-muted-foreground">No applicants match this filter.</p>
      ) : (
        <div className="flex flex-col">
          {filtered.map((a, i) => {
            const selected = a.id === selectedId;
            const score = a.matchSnapshot?.score;
            return (
              <button
                key={a.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(a.id)}
                style={selected ? { boxShadow: "inset 3px 0 0 var(--color-primary)" } : undefined}
                className={cn(
                  "flex w-full items-center gap-3.5 border-t px-4.5 py-3.5 text-left transition-colors first:border-t-0",
                  selected ? "bg-primary-soft" : "bg-card hover:bg-muted/40",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    AVATAR_CLASSES[i % AVATAR_CLASSES.length],
                  )}
                >
                  {a.candidate.initials}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1 text-left">
                  <span className="truncate text-[15px] font-bold text-foreground">{a.candidate.name}</span>
                  {a.candidate.headline && <span className="truncate text-[13px] text-muted-foreground">{a.candidate.headline}</span>}
                  <span className="sm:hidden">
                    <StatusBadge status={a.status} audience="recruiter" />
                  </span>
                </span>
                <span className={cn("w-12 shrink-0 text-right text-[15px] font-extrabold", score === undefined ? "text-muted-foreground" : MATCH_TIER_CLASS[matchTier(score)].text)}>
                  {score === undefined ? "–" : `${score}%`}
                </span>
                <span className="hidden w-28 shrink-0 text-right sm:block">
                  <StatusBadge status={a.status} audience="recruiter" />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
