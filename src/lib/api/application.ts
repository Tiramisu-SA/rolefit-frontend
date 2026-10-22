import { profileInitials } from "@/lib/profile";
import type { Application, ApplicationStatus, ApplicationView, JobWithCompany, MatchSnapshot } from "@/lib/types";
import { ApiError } from "./errors";
import { gatewayRequest } from "./gateway";
import * as jobPosting from "./job-posting";

// REST client for the Application Service, reached through the API Gateway
// (/api/applications/*, same paths upstream). Submitting stores the approved
// resume and a match snapshot on the server; a status change queues the email
// that the Notification Service sends.

/* eslint-disable @typescript-eslint/no-explicit-any */
type Msg = Record<string, any>;

const request = <T>(method: string, path: string, init: { json?: unknown; query?: URLSearchParams } = {}) =>
  gatewayRequest<T>(method, `/api/applications${path}`, { ...init, serviceName: "application service" });

const byUpdated = (a: Application, b: Application) => b.updatedAt.localeCompare(a.updatedAt);
const scoreOf = (a: Application) => a.matchSnapshot?.score ?? -1;

function toMatchSnapshot(raw: Msg | null | undefined): MatchSnapshot | null {
  if (!raw || typeof raw.score !== "number") return null;
  return {
    score: raw.score,
    summary: typeof raw.summary === "string" ? raw.summary : (raw.explanation ?? ""),
    capturedAt: raw.capturedAt ?? raw.computedAt ?? "",
  };
}

/** The service's application → the frontend type. The service keeps only the candidate's name and email. */
export function toApplication(raw: Msg): Application {
  const name: string = raw.candidate?.name ?? "";
  return {
    id: raw.id,
    jobId: raw.jobId,
    candidateId: raw.candidateId,
    candidate: { id: raw.candidate?.id ?? raw.candidateId, name, initials: profileInitials(name), headline: "", email: raw.candidate?.email ?? "" },
    resumeDraftId: raw.resumeReference?.draftId ?? "",
    resumeFormat: raw.resumeReference?.format === "company" ? "company" : "personal",
    status: raw.status,
    submittedAt: raw.submittedAt,
    updatedAt: raw.updatedAt,
    matchSnapshot: toMatchSnapshot(raw.matchSnapshot),
    history: (raw.history ?? []).map((h: Msg) => ({ status: h.status, at: h.at, ...(h.note ? { note: h.note } : {}) })),
  };
}

/**
 * Loads the jobs the seeker's applications refer to: one call for open jobs,
 * then one per closed job. Jobs that no longer exist are left out.
 */
async function jobsFor(ids: string[]): Promise<Map<string, JobWithCompany>> {
  const byId = new Map((await jobPosting.listOpenJobs()).map((j) => [j.id, j]));
  for (const id of ids) {
    if (byId.has(id)) continue;
    try {
      byId.set(id, await jobPosting.getJob(id));
    } catch (e) {
      if (!(e instanceof ApiError && e.code === "NOT_FOUND")) throw e;
    }
  }
  return byId;
}

/**
 * Applies to an open job with the approved resume; the service snapshots the resume and the match.
 * The job is fetched first so a lookup failure happens before anything is saved.
 */
export async function submitApplication(jobId: string, coverLetter?: string): Promise<ApplicationView> {
  const job = await jobPosting.getJob(jobId);
  const body = coverLetter?.trim() ? { jobId, coverLetter: coverLetter.trim() } : { jobId };
  const { application } = await request<{ application: Msg }>("POST", "", { json: body });
  return { ...toApplication(application), job };
}

export async function listMyApplications(): Promise<ApplicationView[]> {
  const { applications } = await request<{ applications: Msg[] }>("GET", "/mine");
  const mine = applications.map(toApplication);
  const jobs = await jobsFor([...new Set(mine.map((a) => a.jobId))]);
  return mine
    .filter((a) => jobs.has(a.jobId))
    .sort(byUpdated)
    .map((a) => ({ ...a, job: jobs.get(a.jobId)! }));
}

/** Applicants for one of the recruiter's jobs (the caller already has the job), best match first. */
export async function listApplicantsForJob(job: JobWithCompany): Promise<ApplicationView[]> {
  const { applications } = await request<{ applications: Msg[] }>("GET", "", { query: new URLSearchParams({ jobId: job.id }) });
  return applications
    .map(toApplication)
    .sort((a, b) => scoreOf(b) - scoreOf(a))
    .map((a) => ({ ...a, job }));
}

/**
 * Changes the status; the Application Service queues the candidate's notification email.
 * Pass the job when the caller already has it: that avoids a second request after the change is saved.
 */
export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
  note?: string,
  job?: JobWithCompany,
): Promise<ApplicationView & { notificationQueued: boolean }> {
  const body = note?.trim() ? { status, note: note.trim() } : { status };
  const res = await request<{ application: Msg; notificationQueued?: boolean }>("PATCH", `/${encodeURIComponent(id)}/status`, { json: body });
  const updated = toApplication(res.application);
  return { ...updated, job: job ?? (await jobPosting.getMyJob(updated.jobId)), notificationQueued: Boolean(res.notificationQueued) };
}
