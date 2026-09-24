import type { Application, ApplicationStatus, ApplicationView } from "@/lib/types";
import { computeMatch } from "./job-discovery";
import { CURRENT_CANDIDATE_ID, MockApiError, newId, nowIso, simulate, store, withCompany } from "./_store";

function view(a: Application): ApplicationView {
  const job = store.jobs.find((j) => j.id === a.jobId);
  const c = store.candidates.find((x) => x.id === a.candidateId);
  if (!job || !c) throw new MockApiError("Application data is incomplete");
  return {
    ...a,
    job: withCompany(job),
    candidate: { id: c.id, name: c.name, initials: c.initials, headline: c.headline, email: c.email },
  };
}

/** Mirrors BUC-2C: validate job is open, require approved resume, snapshot the match result. */
export function submitApplication(jobId: string): Promise<ApplicationView> {
  return simulate(() => {
    const job = store.jobs.find((j) => j.id === jobId);
    if (!job || job.status !== "Published") throw new MockApiError("This job is no longer accepting applications");
    const draft = store.resumeDrafts.find((r) => r.jobId === jobId && r.candidateId === CURRENT_CANDIDATE_ID && r.approved);
    if (!draft) throw new MockApiError("Approve your resume before applying");
    if (store.applications.some((a) => a.jobId === jobId && a.candidateId === CURRENT_CANDIDATE_ID)) {
      throw new MockApiError("You've already applied to this job");
    }
    const profile = store.candidates.find((c) => c.id === CURRENT_CANDIDATE_ID)!;
    const match = computeMatch(profile, job);
    const at = nowIso();
    const app: Application = {
      id: newId("app"), jobId, candidateId: CURRENT_CANDIDATE_ID, resumeDraftId: draft.id, resumeFormat: draft.format,
      status: "Submitted", submittedAt: at, updatedAt: at,
      matchSnapshot: { score: match.score, summary: match.explanation, capturedAt: at },
      history: [{ status: "Submitted", at }],
    };
    store.applications.push(app);
    return view(app);
  }, 900);
}

export function getApplication(id: string): Promise<ApplicationView> {
  return simulate(() => {
    const a = store.applications.find((x) => x.id === id);
    if (!a) throw new MockApiError("Application not found");
    return view(a);
  });
}

export function listMyApplications(): Promise<ApplicationView[]> {
  return simulate(() =>
    store.applications
      .filter((a) => a.candidateId === CURRENT_CANDIDATE_ID)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(view),
  );
}

export function listApplicantsForJob(jobId: string): Promise<ApplicationView[]> {
  return simulate(() =>
    store.applications
      .filter((a) => a.jobId === jobId)
      .sort((a, b) => b.matchSnapshot.score - a.matchSnapshot.score)
      .map(view),
  );
}

/** Also stands in for Notification Adapter sendStatusNotification() — the UI shows a toast. */
export function updateApplicationStatus(id: string, status: ApplicationStatus, note?: string): Promise<ApplicationView> {
  return simulate(() => {
    const a = store.applications.find((x) => x.id === id);
    if (!a) throw new MockApiError("Application not found");
    const at = nowIso();
    a.status = status;
    a.updatedAt = at;
    a.history.push({ status, at, note: note?.trim() || undefined });
    return view(a);
  });
}
