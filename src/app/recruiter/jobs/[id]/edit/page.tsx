"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, SearchX } from "lucide-react";
import { JobForm } from "@/components/recruiter/job-form/job-form";
import { StatusBadge } from "@/components/brand/status-badge";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/brand/page-states";
import { buttonVariants } from "@/components/ui/button";
import { jobPosting } from "@/lib/api";
import { ApiError } from "@/lib/api/errors";
import { useAsync } from "@/lib/use-async";

async function loadJob(id: string) {
  const job = await jobPosting.getMyJob(id);
  const template = job.applicationSettings.resumeTemplateId ? await jobPosting.getResumeTemplate(id) : null;
  return { job, template };
}

export default function EditJobPage() {
  const { id } = useParams<{ id: string }>();
  const state = useAsync(() => loadJob(id), [id]);
  // Another company's job looks the same as a missing one.
  const notFound = state.error instanceof ApiError && (state.error.code === "NOT_FOUND" || state.error.code === "FORBIDDEN");

  return (
    <div className="flex flex-col gap-6">
      <Link href="/recruiter/jobs" className="flex w-fit items-center gap-2 text-[15px] font-semibold text-foreground/80 hover:text-primary">
        <ArrowLeft className="size-4.5" aria-hidden />
        Job postings
      </Link>
      {state.loading ? (
        <ListSkeleton rows={3} className="h-56" />
      ) : notFound ? (
        <EmptyState
          icon={SearchX}
          title="Job not found"
          description="This posting doesn't exist or belongs to another company."
          action={
            <Link href="/recruiter/jobs" className={buttonVariants({ size: "lg" })}>
              Back to job postings
            </Link>
          }
        />
      ) : state.error ? (
        <ErrorState message={state.error.message} onRetry={state.reload} />
      ) : state.data ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">Edit job</h1>
            <StatusBadge status={state.data.job.status} audience="recruiter" />
          </div>
          <JobForm job={state.data.job} template={state.data.template} />
        </>
      ) : null}
    </div>
  );
}
