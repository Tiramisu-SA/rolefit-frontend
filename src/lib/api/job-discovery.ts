import { companyFor } from "@/lib/companies";
import { seekerUserId } from "@/lib/identity";
import type { JobPosting, JobSearchFilters, JobWithMatch, MatchResult } from "@/lib/types";
import { ApiError, type FieldError } from "./errors";

// REST client for the Job Discovery Service, called straight from the browser.
// Every request carries the mock seeker identity (X-User-Id); the service reads
// the seeker's profile and the open jobs over gRPC and does the matching.

function baseUrl(): string {
  // Must be read as a literal so Next can inline it into the browser bundle.
  const url = process.env.NEXT_PUBLIC_JOB_DISCOVERY_API_URL;
  if (!url) {
    throw new ApiError("CONFIG_ERROR", "NEXT_PUBLIC_JOB_DISCOVERY_API_URL is not set. Add it to .env.local and restart the dev server.");
  }
  return url.replace(/\/+$/, "");
}

interface ErrorBody {
  error?: { code?: string; message?: string; details?: FieldError[] };
}

async function get<T>(path: string, params?: URLSearchParams): Promise<T> {
  const qs = params?.toString();
  const url = `${baseUrl()}/api${path}${qs ? `?${qs}` : ""}`;

  let res: Response;
  try {
    res = await fetch(url, { headers: { "X-User-Id": seekerUserId() } });
  } catch {
    throw new ApiError("SERVICE_UNAVAILABLE", "Can't reach the job discovery service. Please try again.", 503);
  }

  const data = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const err = (data as ErrorBody | null)?.error;
    throw new ApiError(
      err?.code ?? "INTERNAL",
      err?.message ?? `The job discovery service returned an error (${res.status}).`,
      res.status,
      err?.details,
    );
  }
  return data as T;
}

type JobPostingWithMatch = JobPosting & { match: MatchResult };

/** The service has no company data; attach the display details here, like job-posting.ts does. */
const withCompany = (job: JobPostingWithMatch): JobWithMatch => ({ ...job, company: companyFor(job.companyId) });

/** Filters as query parameters; lists are comma-separated, empty values are left out. */
function searchParams(filters: JobSearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query?.trim()) params.set("query", filters.query.trim());
  if (filters.location?.trim()) params.set("location", filters.location.trim());
  if (filters.employmentTypes?.length) params.set("employmentTypes", filters.employmentTypes.join(","));
  if (filters.arrangements?.length) params.set("arrangements", filters.arrangements.join(","));
  if (filters.experienceLevels?.length) params.set("experienceLevels", filters.experienceLevels.join(","));
  if (filters.minSalary) params.set("minSalary", String(Math.round(filters.minSalary)));
  return params;
}

/** Open jobs matching the filters, best match first. */
export async function searchJobs(filters: JobSearchFilters = {}): Promise<JobWithMatch[]> {
  const { jobs } = await get<{ jobs: JobPostingWithMatch[] }>("/jobs/search", searchParams(filters));
  return jobs.map(withCompany);
}

export async function getRecommendations(limit = 6): Promise<JobWithMatch[]> {
  const { jobs } = await get<{ jobs: JobPostingWithMatch[] }>("/recommendations", new URLSearchParams({ limit: String(limit) }));
  return jobs.map(withCompany);
}

export async function evaluateJobFit(jobId: string): Promise<JobWithMatch> {
  return withCompany(await get<JobPostingWithMatch>(`/jobs/${encodeURIComponent(jobId)}/fit`));
}

export async function getMatchResult(jobId: string): Promise<MatchResult> {
  return get<MatchResult>(`/jobs/${encodeURIComponent(jobId)}/match`);
}
