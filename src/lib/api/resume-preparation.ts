import type { ResumeDraft, ResumeFormat, ResumeSection } from "@/lib/types";
import { ApiError } from "./errors";
import { gatewayRequest } from "./gateway";

// REST client for the Resume Preparation Service, reached through the API
// Gateway (/api/resumes/* → the service's /api/*). Every route works on the
// signed-in seeker's own draft for one job. The service builds the draft from
// the real profile and job and stores it, so drafts survive a reload.

const draftPath = (jobId: string, action = "") => `/api/resumes/drafts/${encodeURIComponent(jobId)}${action}`;

const request = <T>(method: string, path: string, json?: unknown) =>
  gatewayRequest<T>(method, path, { json, serviceName: "resume service" });

/** Builds (or rebuilds) the tailored draft from the verified profile. Regenerating drops edits and approval. */
export function generateTailoredResume(jobId: string): Promise<ResumeDraft> {
  return request("POST", draftPath(jobId, "/generate"));
}

/** The seeker's draft for this job, or null when none has been generated yet. */
export async function getResumeDraft(jobId: string): Promise<ResumeDraft | null> {
  try {
    return await request<ResumeDraft>("GET", draftPath(jobId));
  } catch (e) {
    if (e instanceof ApiError && e.code === "RESUME_DRAFT_NOT_FOUND") return null;
    throw e;
  }
}

/** Saves which sections are included and the bullet wording. Clears approval. */
export function editResumeDraft(jobId: string, sections: ResumeSection[]): Promise<ResumeDraft> {
  return request("PUT", draftPath(jobId, "/sections"), { sections });
}

export function selectResumeFormat(jobId: string, format: ResumeFormat): Promise<ResumeDraft> {
  return request("PUT", draftPath(jobId, "/format"), { format });
}

export function approveResume(jobId: string): Promise<ResumeDraft> {
  return request("POST", draftPath(jobId, "/approve"));
}

/** The approved draft. Rejects with RESUME_NOT_APPROVED (or RESUME_DRAFT_NOT_FOUND) until the seeker approves. */
export function getApprovedResume(jobId: string): Promise<ResumeDraft> {
  return request("GET", draftPath(jobId, "/approved"));
}
