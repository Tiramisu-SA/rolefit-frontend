import { companyFor } from "@/lib/companies";
import type { JobPosting, JobSearchFilters, JobWithMatch, MatchResult } from "@/lib/types";
import { gatewayRequest } from "./gateway";

// REST client for the Job Discovery Service, reached through the API Gateway
// (/api/discovery/* → the service's /api/*). The service reads the seeker's
// profile and the open jobs over gRPC and does the matching.

const get = <T>(path: string, params?: URLSearchParams) =>
  gatewayRequest<T>("GET", `/api/discovery${path}`, { query: params, serviceName: "job discovery service" });

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
