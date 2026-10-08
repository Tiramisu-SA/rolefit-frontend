import { profileInitials } from "@/lib/profile";
import type { Application, ApplicationStatus, ApplicationView, JobWithCompany } from "@/lib/types";
import * as candidateProfile from "./candidate-profile";
import { ApiError } from "./errors";
import * as jobDiscovery from "./job-discovery";
import * as jobPosting from "./job-posting";
import { SEEKER_ID, newId, nowIso, simulate, store } from "./_store";

// Mock of the Application Service: applications live in the browser session,
// but they point at real jobs and snapshot the real profile at submit time.

const byUpdated = (a: Application, b: Application) => b.updatedAt.localeCompare(a.updatedAt);

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

/** Mirrors BUC-2C: job must be open, resume approved, and the match result is snapshotted. */
export async function submitApplication(jobId: string): Promise<ApplicationView> {
  const [job, profile] = await Promise.all([jobPosting.getJob(jobId), candidateProfile.getProfile()]);
  if (job.status !== "OPEN") throw new ApiError("JOB_NOT_OPEN", "This job is no longer accepting applications");
  if (!profile) throw new ApiError("PROFILE_REQUIRED", "Create your profile before applying");
  const match = await jobDiscovery.getMatchResult(jobId);
  return simulate(() => {
    const draft = store.resumeDrafts.find((r) => r.jobId === jobId && r.candidateId === SEEKER_ID && r.approved);
    if (!draft) throw new ApiError("RESUME_NOT_APPROVED", "Approve your resume before applying");
    if (store.applications.some((a) => a.jobId === jobId && a.candidateId === SEEKER_ID)) {
      throw new ApiError("ALREADY_APPLIED", "You've already applied to this job");
    }
    const at = nowIso();
    const app: Application = {
      id: newId("app"), jobId, candidateId: SEEKER_ID,
      candidate: {
        id: profile.id, name: profile.name, initials: profileInitials(profile.name),
        headline: profile.headline ?? "", email: profile.email ?? "",
      },
      resumeDraftId: draft.id, resumeFormat: draft.format,
      status: "Submitted", submittedAt: at, updatedAt: at,
      matchSnapshot: { score: match.score, summary: match.explanation, capturedAt: at },
      history: [{ status: "Submitted", at }],
    };
    store.applications.push(app);
    return { ...app, job };
  }, 900);
}

export async function listMyApplications(): Promise<ApplicationView[]> {
  const mine = store.applications.filter((a) => a.candidateId === SEEKER_ID);
  const jobs = await jobsFor([...new Set(mine.map((a) => a.jobId))]);
  return simulate(() =>
    mine
      .filter((a) => jobs.has(a.jobId))
      .sort(byUpdated)
      .map((a) => ({ ...a, job: jobs.get(a.jobId)! })),
  );
}

/** Applicants for one of the recruiter's jobs (the caller already has the job). */
export function listApplicantsForJob(job: JobWithCompany): Promise<ApplicationView[]> {
  return simulate(() =>
    store.applications
      .filter((a) => a.jobId === job.id)
      .sort((a, b) => b.matchSnapshot.score - a.matchSnapshot.score)
      .map((a) => ({ ...a, job })),
  );
}

/** Also stands in for Notification Adapter sendStatusNotification() — the UI shows a toast. */
export async function updateApplicationStatus(id: string, status: ApplicationStatus, note?: string): Promise<ApplicationView> {
  const current = store.applications.find((x) => x.id === id);
  if (!current) throw new ApiError("NOT_FOUND", "Application not found");
  const job = await jobPosting.getMyJob(current.jobId);
  return simulate(() => {
    const a = store.applications.find((x) => x.id === id)!;
    const at = nowIso();
    a.status = status;
    a.updatedAt = at;
    a.history.push({ status, at, note: note?.trim() || undefined });
    return { ...a, job };
  });
}
