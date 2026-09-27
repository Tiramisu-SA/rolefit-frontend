"use server";

// Server Actions for the Job Posting Service (gRPC). The browser calls these;
// they run on the Next.js server, which is the gRPC client.
// Each action RETURNS an ActionResult instead of throwing: in production Next
// replaces thrown messages with a generic one, and the UI needs the real text.
// Pages use the wrapper in ./job-posting.ts, not these functions directly.

import { companyFor } from "@/lib/companies";
import { callJobPosting } from "@/lib/grpc/job-posting-client";
import { toJobPosting, toProtoJobInput, toProtoStatus, toResumeTemplateInfo } from "@/lib/grpc/job-mapper";
import { recruiterCaller } from "@/lib/identity.server";
import type { Company, JobPosting, JobPostingInput, JobStatus, ResumeTemplateInfo } from "@/lib/types";
import { ApiError, type ActionResult } from "./errors";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Msg = Record<string, any>;

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.toJSON() };
    console.error("[job-posting action]", e);
    return { ok: false, error: { code: "INTERNAL", message: "Something went wrong. Please try again." } };
  }
}

const jobOf = (res: Msg) => toJobPosting(res.job);

// --- recruiter (sent with the recruiter identity) ---

export async function listMyJobsAction(opts: { status?: JobStatus; query?: string } = {}): Promise<ActionResult<JobPosting[]>> {
  return run(async () => {
    const caller = recruiterCaller();
    const res = await callJobPosting<Msg>(
      "ListJobs",
      { company_id: caller.companyId, status: toProtoStatus(opts.status), query: opts.query ?? "", limit: 100 },
      caller,
    );
    return (res.jobs ?? []).map(toJobPosting);
  });
}

export async function getMyJobAction(id: string): Promise<ActionResult<JobPosting>> {
  return run(async () => jobOf(await callJobPosting<Msg>("GetJob", { job_id: id }, recruiterCaller())));
}

export async function createJobAction(input: JobPostingInput): Promise<ActionResult<JobPosting>> {
  return run(async () => jobOf(await callJobPosting<Msg>("CreateJob", { job: toProtoJobInput(input) }, recruiterCaller())));
}

export async function updateJobAction(id: string, input: JobPostingInput): Promise<ActionResult<JobPosting>> {
  return run(async () =>
    jobOf(await callJobPosting<Msg>("UpdateJob", { job_id: id, job: toProtoJobInput(input) }, recruiterCaller())),
  );
}

export async function deleteJobAction(id: string): Promise<ActionResult<null>> {
  return run(async () => {
    await callJobPosting("DeleteJob", { job_id: id }, recruiterCaller());
    return null;
  });
}

export async function publishJobAction(id: string): Promise<ActionResult<JobPosting>> {
  return run(async () => jobOf(await callJobPosting<Msg>("PublishJob", { job_id: id }, recruiterCaller())));
}

export async function closeJobAction(id: string): Promise<ActionResult<JobPosting>> {
  return run(async () => jobOf(await callJobPosting<Msg>("CloseJob", { job_id: id }, recruiterCaller())));
}

export async function reopenJobAction(id: string): Promise<ActionResult<JobPosting>> {
  return run(async () => jobOf(await callJobPosting<Msg>("ReopenJob", { job_id: id }, recruiterCaller())));
}

/** formData must hold the file under "file". */
export async function attachResumeTemplateAction(id: string, formData: FormData): Promise<ActionResult<ResumeTemplateInfo>> {
  return run(async () => {
    const file = formData.get("file");
    if (!(file instanceof File)) throw new ApiError("VALIDATION_ERROR", "Choose a PDF or DOCX file to upload.", 400);
    const contentType = file.type || (file.name.toLowerCase().endsWith(".docx") ? DOCX : "application/pdf");
    const res = await callJobPosting<Msg>(
      "AttachResumeTemplate",
      { job_id: id, file_name: file.name, content_type: contentType, content: Buffer.from(await file.arrayBuffer()) },
      recruiterCaller(),
    );
    return toResumeTemplateInfo(res.template);
  });
}

/** Template metadata, or null when the job has none. */
export async function getResumeTemplateAction(id: string): Promise<ActionResult<ResumeTemplateInfo | null>> {
  return run(async () => {
    try {
      const res = await callJobPosting<Msg>("GetResumeTemplate", { job_id: id, include_content: false }, recruiterCaller());
      return toResumeTemplateInfo(res.template);
    } catch (e) {
      if (e instanceof ApiError && e.code === "NOT_FOUND") return null;
      throw e;
    }
  });
}

export async function deleteResumeTemplateAction(id: string): Promise<ActionResult<null>> {
  return run(async () => {
    await callJobPosting("DeleteResumeTemplate", { job_id: id }, recruiterCaller());
    return null;
  });
}

export async function getRecruiterCompanyAction(): Promise<ActionResult<Company>> {
  return run(async () => companyFor(recruiterCaller().companyId));
}

// --- seeker / public reads (no identity: drafts are never returned) ---

export async function listOpenJobsAction(opts: { query?: string } = {}): Promise<ActionResult<JobPosting[]>> {
  return run(async () => {
    const res = await callJobPosting<Msg>("ListJobs", { status: toProtoStatus("OPEN"), query: opts.query ?? "", limit: 100 });
    return (res.jobs ?? []).map(toJobPosting);
  });
}

export async function getJobAction(id: string): Promise<ActionResult<JobPosting>> {
  return run(async () => jobOf(await callJobPosting<Msg>("GetJob", { job_id: id })));
}
