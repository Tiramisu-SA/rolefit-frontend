import { companies } from "@/lib/mock/companies";
import { jobs } from "@/lib/mock/jobs";
import { candidates } from "@/lib/mock/candidates";
import { applications } from "@/lib/mock/applications";
import type { Application, CandidateProfile, Company, Job, ResumeDraft } from "@/lib/types";

export const CURRENT_CANDIDATE_ID = "cand-1";
export const CURRENT_COMPANY_ID = "co-brightline";

interface Store {
  companies: Company[];
  jobs: Job[];
  candidates: CandidateProfile[];
  applications: Application[];
  resumeDrafts: ResumeDraft[];
}

/** In-memory copy of the seed data. Lives for the browser session; reload resets it. */
export const store: Store = structuredClone({ companies, jobs, candidates, applications, resumeDrafts: [] });

export class MockApiError extends Error {}

/** Simulates network latency. Add `?mockError=1` to the URL to make every call fail. */
export async function simulate<T>(produce: () => T, ms = 350): Promise<T> {
  await new Promise((r) => setTimeout(r, ms));
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("mockError")) {
    throw new MockApiError("The service is unavailable. Please try again.");
  }
  return structuredClone(produce());
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function withCompany(job: Job) {
  const company = store.companies.find((c) => c.id === job.companyId);
  if (!company) throw new MockApiError(`Unknown company ${job.companyId}`);
  return { ...job, company };
}
