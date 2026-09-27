"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Bookmark, FileText, Sparkles } from "lucide-react";
import { CompanyAvatar } from "@/components/brand/company-avatar";
import { MatchBadge } from "@/components/brand/match-badge";
import { MatchRing } from "@/components/brand/match-ring";
import { ErrorState } from "@/components/brand/page-states";
import { StatusBadge } from "@/components/brand/status-badge";
import { MatchPanel } from "@/components/seeker/match-panel";
import { CreateProfileBanner } from "@/components/seeker/create-profile-banner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { applicationService, candidateProfile, jobDiscovery } from "@/lib/api";
import { EMPLOYMENT_TYPE_LABEL, WORK_ARRANGEMENT_LABEL, experienceLevelFor, formatLocation, formatSalary, requirementLines } from "@/lib/labels";
import { useAsync } from "@/lib/use-async";
import { cn, formatDate } from "@/lib/utils";

function JobDetailSkeleton() {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-7">
      <main className="flex flex-1 flex-col gap-5">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </main>
      <aside aria-label="Your match" className="flex w-full flex-col items-center gap-4 rounded-2xl border bg-card p-8 lg:w-[440px] lg:shrink-0">
        <Skeleton className="size-27 rounded-full" />
        <p className="text-sm font-semibold text-muted-foreground" aria-live="polite">
          Calculating your match…
        </p>
        <Skeleton className="h-44 w-full rounded-xl" />
      </aside>
    </div>
  );
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [saved, setSaved] = useState(false);

  const jobState = useAsync(() => jobDiscovery.evaluateJobFit(id), [id]);
  const appsState = useAsync(() => applicationService.listMyApplications(), [id]);
  const profileState = useAsync(() => candidateProfile.getProfile(), []);

  function toggleSave() {
    setSaved((prev) => {
      const next = !prev;
      toast(next ? "Job saved" : "Removed from saved jobs");
      return next;
    });
  }

  const job = jobState.data;
  const actionsLoading = jobState.loading || appsState.loading;
  const myApplication = appsState.data?.find((a) => a.jobId === id);
  const lines = job ? requirementLines(job.requirements) : { required: [], preferred: [] };
  const deadline = job?.applicationSettings.applicationDeadline;

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/seeker/jobs" className="font-semibold hover:text-primary">
          Find jobs
        </Link>
        <span aria-hidden>/</span>
        <span className="font-semibold text-foreground">{job?.title ?? "Job details"}</span>
      </nav>

      {profileState.data === null && <CreateProfileBanner />}

      {jobState.loading ? (
        <JobDetailSkeleton />
      ) : jobState.error ? (
        <div className="flex flex-col items-center gap-4">
          <ErrorState message={jobState.error.message} onRetry={jobState.reload} />
          <Link href="/seeker/jobs" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Back to Find jobs
          </Link>
        </div>
      ) : job ? (
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-7">
          <main className="flex flex-1 flex-col gap-5">
            <section className="flex flex-col gap-6 rounded-2xl border bg-card p-6 md:p-8">
              <div className="flex items-start gap-5">
                <CompanyAvatar company={job.company} size="lg" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">{job.title}</h1>
                  <p className="text-base text-muted-foreground">{job.company.name}</p>
                  {/* Score preview so it's visible on mobile without scrolling past the match aside, which stacks below the rest of the page. */}
                  <div className="mt-1.5 flex items-center gap-3 lg:hidden">
                    <MatchRing score={job.match.score} size="sm" />
                    <MatchBadge score={job.match.score} />
                  </div>
                </div>
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
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  {
                    k: "Location",
                    v: [formatLocation(job.location), job.workArrangement && WORK_ARRANGEMENT_LABEL[job.workArrangement]].filter(Boolean).join(" · ") || "Not set",
                  },
                  { k: "Employment", v: job.employmentType ? EMPLOYMENT_TYPE_LABEL[job.employmentType] : "Not set" },
                  { k: "Experience", v: experienceLevelFor(job.requirements.minimumExperienceYears) },
                  { k: "Salary", v: formatSalary(job.salary) ?? "Not disclosed" },
                ].map((fact) => (
                  <div key={fact.k} className="flex flex-col gap-1 rounded-xl bg-muted/50 px-4 py-3.5">
                    <span className="text-[13px] text-muted-foreground">{fact.k}</span>
                    <span className="text-[15px] font-bold">{fact.v}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {actionsLoading ? (
                  <Skeleton className="h-11 w-56 rounded-xl" />
                ) : myApplication ? (
                  <div className="flex items-center gap-3">
                    <StatusBadge status={myApplication.status} />
                    <Link href="/seeker/applications" className={buttonVariants({ size: "lg" })}>
                      View application
                    </Link>
                  </div>
                ) : job.status !== "OPEN" ? (
                  <span className="rounded-xl bg-muted px-4 py-2.5 text-sm font-semibold text-muted-foreground">
                    No longer accepting applications
                  </span>
                ) : (
                  <Link href={`/seeker/jobs/${id}/resume`} className={buttonVariants({ size: "lg" })}>
                    <Sparkles className="size-4.5" aria-hidden />
                    Tailor resume &amp; apply
                  </Link>
                )}

                {job.applicationSettings.resumeTemplateId && (
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="size-4" aria-hidden />
                    This company provides a resume template
                  </span>
                )}

                {deadline && job.status === "OPEN" && (
                  <span className="ml-auto text-sm font-semibold text-match-good">Apply by {formatDate(deadline)}</span>
                )}
              </div>
            </section>

            <section className="flex flex-col gap-4 rounded-2xl border bg-card p-6 md:p-8">
              <h2 className="text-xl font-bold">About the role</h2>
              <p className="whitespace-pre-line text-base leading-relaxed text-foreground/90">{job.description}</p>

              {job.responsibilities.length > 0 && (
                <>
                  <h3 className="mt-2 text-[17px] font-bold">Responsibilities</h3>
                  <ul className="flex list-disc flex-col gap-2 pl-5 text-base leading-relaxed text-foreground/90">
                    {job.responsibilities.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </>
              )}

              <h3 className="mt-2 text-[17px] font-bold">Requirements</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2.5 rounded-xl border p-4.5">
                  <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Required</span>
                  {lines.required.length === 0 && <span className="text-[15px] text-muted-foreground">None listed</span>}
                  {lines.required.map((r, i) => (
                    <span key={i} className="text-[15px] text-foreground/90">
                      {r}
                    </span>
                  ))}
                </div>
                <div className="flex flex-col gap-2.5 rounded-xl border p-4.5">
                  <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Preferred</span>
                  {lines.preferred.length === 0 && <span className="text-[15px] text-muted-foreground">None listed</span>}
                  {lines.preferred.map((r, i) => (
                    <span key={i} className="text-[15px] text-foreground/90">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          </main>

          <aside aria-label="Your match" className="w-full lg:w-[440px] lg:shrink-0">
            <MatchPanel match={job.match} />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
