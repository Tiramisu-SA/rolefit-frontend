import type { ResumeDraft, ResumeFormat, ResumeSection } from "@/lib/types";
import { ApiError } from "./errors";
import { gatewayRequest } from "./gateway";

// REST client for the Resume Preparation Service, reached through the API
// Gateway (/api/resumes/* → the service's /api/*). The service builds a resume
// for one job from the seeker's verified profile; the Application Service reads
// the approved version when the seeker applies.

const request = <T>(method: string, jobId: string, action = "", json?: unknown) =>
  gatewayRequest<T>(method, `/api/resumes/drafts/${encodeURIComponent(jobId)}${action}`, {
    ...(json !== undefined ? { json } : {}),
    serviceName: "resume preparation service",
  });

export const generateTailoredResume = (jobId: string) => request<ResumeDraft>("POST", jobId, "/generate");

/** The seeker's draft for this job, or null when there is none yet. */
export async function getResumeDraft(jobId: string): Promise<ResumeDraft | null> {
  try {
    return await request<ResumeDraft>("GET", jobId);
  } catch (e) {
    if (e instanceof ApiError && e.code === "RESUME_DRAFT_NOT_FOUND") return null;
    throw e;
  }
}

/** Sends every section back; only `included` and bullet `text` may change. Clears approval. */
export const editResumeDraft = (jobId: string, sections: ResumeSection[]) => request<ResumeDraft>("PUT", jobId, "/sections", { sections });

export const selectResumeFormat = (jobId: string, format: ResumeFormat) => request<ResumeDraft>("PUT", jobId, "/format", { format });

export const approveResume = (jobId: string) => request<ResumeDraft>("POST", jobId, "/approve");

export const getApprovedResume = (jobId: string) => request<ResumeDraft>("GET", jobId, "/approved");
