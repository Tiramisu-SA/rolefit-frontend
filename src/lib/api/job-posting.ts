import { companyFor } from "@/lib/companies";
import type { Company, JobPosting, JobPostingInput, JobStatus, JobWithCompany, ResumeTemplateInfo } from "@/lib/types";
import { ApiError } from "./errors";
import { gatewayRequest } from "./gateway";
import { toJobPosting, toProtoJobInput, toProtoStatus, toResumeTemplateInfo } from "./job-mapper";

// What pages call for jobs. The API Gateway turns these REST calls into Job
// Posting Service gRPC calls; bodies and responses stay proto-shaped and are
// mapped here. Recruiter calls go to /api/jobs/mine (the gateway adds the
// recruiter identity), seeker calls to /api/jobs (open jobs only).

/* eslint-disable @typescript-eslint/no-explicit-any */
type Msg = Record<string, any>;

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const request = <T>(method: string, path: string, init: { json?: unknown; body?: BodyInit; headers?: HeadersInit; query?: URLSearchParams } = {}) =>
  gatewayRequest<T>(method, `/api/jobs${path}`, { ...init, serviceName: "job service" });

const withCompany = (job: JobPosting): JobWithCompany => ({ ...job, company: companyFor(job.companyId) });
const jobOf = (res: Msg): JobWithCompany => withCompany(toJobPosting(res.job));
const jobsOf = (res: Msg): JobWithCompany[] => (res.jobs ?? []).map((job: Msg) => withCompany(toJobPosting(job)));
const mine = (id: string, action = "") => `/mine/${encodeURIComponent(id)}${action}`;

function listQuery(opts: { status?: JobStatus; query?: string }): URLSearchParams {
  const params = new URLSearchParams();
  if (opts.status) params.set("status", toProtoStatus(opts.status));
  if (opts.query) params.set("query", opts.query);
  return params;
}

// --- recruiter ---

export async function listMyJobs(opts: { status?: JobStatus; query?: string } = {}): Promise<JobWithCompany[]> {
  return jobsOf(await request<Msg>("GET", "/mine", { query: listQuery(opts) }));
}

export async function getMyJob(id: string): Promise<JobWithCompany> {
  return jobOf(await request<Msg>("GET", mine(id)));
}

export async function createJob(input: JobPostingInput): Promise<JobWithCompany> {
  return jobOf(await request<Msg>("POST", "/mine", { json: toProtoJobInput(input) }));
}

export async function updateJob(id: string, input: JobPostingInput): Promise<JobWithCompany> {
  return jobOf(await request<Msg>("PUT", mine(id), { json: toProtoJobInput(input) }));
}

export async function deleteJob(id: string): Promise<void> {
  await request<void>("DELETE", mine(id));
}

export async function publishJob(id: string): Promise<JobWithCompany> {
  return jobOf(await request<Msg>("POST", mine(id, "/publish")));
}

export async function closeJob(id: string): Promise<JobWithCompany> {
  return jobOf(await request<Msg>("POST", mine(id, "/close")));
}

export async function reopenJob(id: string): Promise<JobWithCompany> {
  return jobOf(await request<Msg>("POST", mine(id, "/reopen")));
}

export async function attachResumeTemplate(id: string, file: File): Promise<ResumeTemplateInfo> {
  const contentType = file.type || (file.name.toLowerCase().endsWith(".docx") ? DOCX : "application/pdf");
  const res = await request<Msg>("PUT", mine(id, "/resume-template"), {
    body: file,
    headers: { "Content-Type": contentType, "X-File-Name": encodeURIComponent(file.name) },
  });
  return toResumeTemplateInfo(res.template);
}

/** Metadata of the job's resume template, or null when it has none. */
export async function getResumeTemplate(id: string): Promise<ResumeTemplateInfo | null> {
  try {
    return toResumeTemplateInfo((await request<Msg>("GET", mine(id, "/resume-template"))).template);
  } catch (e) {
    if (e instanceof ApiError && e.code === "NOT_FOUND") return null;
    throw e;
  }
}

export async function deleteResumeTemplate(id: string): Promise<void> {
  await request<void>("DELETE", mine(id, "/resume-template"));
}

export async function getRecruiterCompany(): Promise<Company> {
  const { companyId } = await request<{ companyId: string }>("GET", "/mine/company");
  return companyFor(companyId);
}

// --- seeker / public ---

export async function listOpenJobs(opts: { query?: string } = {}): Promise<JobWithCompany[]> {
  return jobsOf(await request<Msg>("GET", "", { query: listQuery({ query: opts.query }) }));
}

export async function getJob(id: string): Promise<JobWithCompany> {
  return jobOf(await request<Msg>("GET", `/${encodeURIComponent(id)}`));
}
