"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Bookmark, Briefcase, Check, Clock, MapPin } from "lucide-react";
import { CompanyAvatar } from "@/components/brand/company-avatar";
import { MatchBadge } from "@/components/brand/match-badge";
import { MatchRing } from "@/components/brand/match-ring";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn, formatSalary, relativeDays } from "@/lib/utils";
import type { JobWithMatch } from "@/lib/types";

export function JobCard({ job }: { job: JobWithMatch }) {
  const [saved, setSaved] = useState(false);

  function toggleSave() {
    setSaved((prev) => {
      const next = !prev;
      toast(next ? "Job saved" : "Removed from saved jobs");
      return next;
    });
  }

  return (
    <article className="flex flex-col gap-5 rounded-2xl border bg-card p-5 sm:flex-row sm:items-start md:p-6">
      <CompanyAvatar company={job.company} size="lg" />

      <div className="flex flex-1 flex-col gap-2.5">
        <div className="flex flex-col gap-0.5">
          <Link href={`/seeker/jobs/${job.id}`} className="text-lg font-bold text-foreground hover:text-primary">
            {job.title}
          </Link>
          <span className="text-[15px] text-muted-foreground">{job.company.name}</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4.5 gap-y-1.5 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="size-4" aria-hidden />
            {job.location} · {job.arrangement}
          </span>
          <span className="flex items-center gap-1.5">
            <Briefcase className="size-4" aria-hidden />
            {job.employmentType}
          </span>
          <span className="font-semibold text-foreground">{formatSalary(job.salaryMin, job.salaryMax)}</span>
          <span className="flex items-center gap-1.5">
            <Clock className="size-4" aria-hidden />
            {relativeDays(job.postedAt)}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {job.requiredSkills.map((skill) => {
            const have = job.match.matchedSkills.includes(skill);
            return (
              <span
                key={skill}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[13px] font-semibold",
                  have ? "bg-match-strong-soft text-match-strong" : "bg-muted text-muted-foreground"
                )}
              >
                {have && <Check className="size-3.5" aria-hidden />}
                {skill}
                <span className="sr-only">{have ? " (you have this)" : " (missing)"}</span>
              </span>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:w-[150px] sm:shrink-0 sm:flex-col sm:items-end sm:justify-start sm:gap-3.5">
        <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
          <MatchRing score={job.match.score} size="sm" />
          <MatchBadge score={job.match.score} />
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-pressed={saved}
            aria-label={saved ? "Unsave job" : "Save job"}
            onClick={toggleSave}
          >
            <Bookmark className={cn("size-[18px]", saved && "fill-current")} aria-hidden />
          </Button>
          <Link
            href={`/seeker/jobs/${job.id}`}
            className={cn(buttonVariants({ size: "lg" }), "bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft/80")}
          >
            View
          </Link>
        </div>
      </div>
    </article>
  );
}
