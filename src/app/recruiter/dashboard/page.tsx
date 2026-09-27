"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CalendarClock, Users } from "lucide-react";
import { StatCard } from "@/components/recruiter/stat-card";
import { computeJobStats, loadJobRows } from "@/components/recruiter/jobs-table";
import { MatchBadge } from "@/components/brand/match-badge";
import { StatusBadge } from "@/components/brand/status-badge";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/brand/page-states";
import { useAsync } from "@/lib/use-async";
import { useRole } from "@/lib/auth/role-context";
import { jobPosting, applicationService } from "@/lib/api";
import { formatLocation } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import type { ApplicationView, JobWithCompany } from "@/lib/types";

const CLOSING_SOON_WINDOW_DAYS = 21;

async function loadRecentApplicants(): Promise<ApplicationView[]> {
  const jobs = await jobPosting.listMyJobs();
  const lists = await Promise.all(jobs.map((job) => applicationService.listApplicantsForJob(job)));
  return lists
    .flat()
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .slice(0, 5);
}

function daysUntil(iso: string, now: Date): number {
  return Math.floor((new Date(iso).getTime() - now.getTime()) / 86_400_000);
}

const deadlineOf = (job: JobWithCompany) => job.applicationSettings.applicationDeadline;

function closingSoonJobs(jobs: JobWithCompany[]): JobWithCompany[] {
  const now = new Date();
  return jobs
    .filter((job) => {
      const deadline = deadlineOf(job);
      return job.status === "OPEN" && !!deadline && daysUntil(deadline, now) >= 0 && daysUntil(deadline, now) <= CLOSING_SOON_WINDOW_DAYS;
    })
    .sort((a, b) => new Date(deadlineOf(a)!).getTime() - new Date(deadlineOf(b)!).getTime());
}

export default function RecruiterDashboardPage() {
  const { session } = useRole();
  const rowsState = useAsync(() => loadJobRows(), []);
  const recentState = useAsync(() => loadRecentApplicants(), []);
  const rows = useMemo(() => rowsState.data ?? [], [rowsState.data]);
  const recentApplicants = recentState.data ?? [];

  const stats = useMemo(() => computeJobStats(rows), [rows]);

  const closingSoon = useMemo(() => closingSoonJobs(rows.map((r) => r.job)), [rows]);

  const firstName = session?.name?.split(" ")[0] ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">Welcome back{firstName ? `, ${firstName}` : ""}</h1>
        <p className="text-[15px] text-muted-foreground">Here&apos;s what&apos;s happening across your postings.</p>
      </div>

      {rowsState.error ? (
        <ErrorState message={rowsState.error.message} onRetry={rowsState.reload} />
      ) : rowsState.loading ? (
        <ListSkeleton rows={1} className="h-28" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Open postings" value={stats.openPostings} note={stats.openNote} />
          <StatCard label="Total applicants" value={stats.totalApplicants} note="Across all postings" />
          <StatCard label="New applicants" value={stats.newApplicants} note="Not yet reviewed" />
          <StatCard label="In interview" value={stats.inInterview} note={stats.interviewNote} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-bold">Recent applicants</h2>
          {recentState.loading ? (
            <ListSkeleton rows={3} className="h-16" />
          ) : recentState.error ? (
            <ErrorState message={recentState.error.message} onRetry={recentState.reload} />
          ) : recentApplicants.length === 0 ? (
            <EmptyState icon={Users} title="No applicants yet" description="New applications will show up here as candidates apply." />
          ) : (
            <ul className="flex flex-col gap-2">
              {recentApplicants.map((app) => (
                <li key={app.id}>
                  <Link
                    href={`/recruiter/jobs/${app.jobId}/applicants?app=${app.id}`}
                    className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary-soft-foreground">
                      {app.candidate.initials}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-[15px] font-bold text-foreground">{app.candidate.name}</span>
                      <span className="truncate text-sm text-muted-foreground">{app.job.title}</span>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <MatchBadge score={app.matchSnapshot.score} />
                      <StatusBadge status={app.status} audience="recruiter" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-bold">Postings closing soon</h2>
          {rowsState.loading ? (
            <ListSkeleton rows={3} className="h-16" />
          ) : rowsState.error ? (
            <ErrorState message={rowsState.error.message} onRetry={rowsState.reload} />
          ) : closingSoon.length === 0 ? (
            <EmptyState icon={CalendarClock} title="Nothing closing soon" description="No open postings have a deadline in the next 3 weeks." />
          ) : (
            <ul className="flex flex-col gap-2">
              {closingSoon.map((job) => (
                <li key={job.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <Link href={`/recruiter/jobs/${job.id}/edit`} className="truncate font-bold text-foreground hover:text-primary">
                      {job.title}
                    </Link>
                    <span className="truncate text-sm text-muted-foreground">{formatLocation(job.location)}</span>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-foreground/80">Deadline {formatDate(deadlineOf(job)!)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
