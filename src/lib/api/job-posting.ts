import { companyFor } from "@/lib/companies";
import type { Company, JobPosting, JobPostingInput, JobStatus, JobWithCompany, ResumeTemplateInfo } from "@/lib/types";
import { unwrap } from "./errors";
import * as actions from "./job-posting-actions";

// What pages call for jobs. Each function runs a Server Action (the Next.js
// server calls the Job Posting Service over gRPC), throws ApiError on failure,
// and attaches the company display details.
// Note: Server Actions run one at a time per browser tab.

const withCompany = (job: JobPosting): JobWithCompany => ({ ...job, company: companyFor(job.companyId) });

// --- recruiter ---

export async function listMyJobs(opts: { status?: JobStatus; query?: string } = {}): Promise<JobWithCompany[]> {
  return unwrap(await actions.listMyJobsAction(opts)).map(withCompany);
}

export async function getMyJob(id: string): Promise<JobWithCompany> {
  return withCompany(unwrap(await actions.getMyJobAction(id)));
}

export async function createJob(input: JobPostingInput): Promise<JobWithCompany> {
  return withCompany(unwrap(await actions.createJobAction(input)));
}

export async function updateJob(id: string, input: JobPostingInput): Promise<JobWithCompany> {
  return withCompany(unwrap(await actions.updateJobAction(id, input)));
}

export async function deleteJob(id: string): Promise<void> {
  unwrap(await actions.deleteJobAction(id));
}

export async function publishJob(id: string): Promise<JobWithCompany> {
  return withCompany(unwrap(await actions.publishJobAction(id)));
}

export async function closeJob(id: string): Promise<JobWithCompany> {
  return withCompany(unwrap(await actions.closeJobAction(id)));
}

export async function reopenJob(id: string): Promise<JobWithCompany> {
  return withCompany(unwrap(await actions.reopenJobAction(id)));
}

export async function attachResumeTemplate(id: string, file: File): Promise<ResumeTemplateInfo> {
  const formData = new FormData();
  formData.set("file", file);
  return unwrap(await actions.attachResumeTemplateAction(id, formData));
}

/** Metadata of the job's resume template, or null when it has none. */
export async function getResumeTemplate(id: string): Promise<ResumeTemplateInfo | null> {
  return unwrap(await actions.getResumeTemplateAction(id));
}

export async function deleteResumeTemplate(id: string): Promise<void> {
  unwrap(await actions.deleteResumeTemplateAction(id));
}

export async function getRecruiterCompany(): Promise<Company> {
  return unwrap(await actions.getRecruiterCompanyAction());
}

// --- seeker / public ---

export async function listOpenJobs(opts: { query?: string } = {}): Promise<JobWithCompany[]> {
  return unwrap(await actions.listOpenJobsAction(opts)).map(withCompany);
}

export async function getJob(id: string): Promise<JobWithCompany> {
  return withCompany(unwrap(await actions.getJobAction(id)));
}
