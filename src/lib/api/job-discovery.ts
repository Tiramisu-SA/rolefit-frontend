import { experienceLevelFor, formatLocation } from "@/lib/labels";
import { computeMatch } from "@/lib/match";
import type { CandidateProfile, JobSearchFilters, JobWithCompany, JobWithMatch, MatchResult } from "@/lib/types";
import * as candidateProfile from "./candidate-profile";
import * as jobPosting from "./job-posting";

// Mock of the Job Discovery Service. The logic still runs in the browser, but
// on real data: open jobs from the Job Posting Service (gRPC) and the seeker's
// profile from the Candidate Profile Service (REST).

const withMatch = (profile: CandidateProfile | null) => (job: JobWithCompany): JobWithMatch => ({
  ...job,
  match: computeMatch(profile, job),
});

function matchesFilters(job: JobWithCompany, filters: JobSearchFilters): boolean {
  const q = filters.query?.trim().toLowerCase();
  if (q) {
    const haystack = `${job.title} ${job.company.name} ${job.requirements.requiredSkills.map((s) => s.name).join(" ")}`.toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  const loc = filters.location?.trim().toLowerCase();
  if (loc && !(formatLocation(job.location).toLowerCase().includes(loc) || (loc === "remote" && job.workArrangement === "REMOTE"))) {
    return false;
  }
  if (filters.employmentTypes?.length && !(job.employmentType && filters.employmentTypes.includes(job.employmentType))) return false;
  if (filters.arrangements?.length && !(job.workArrangement && filters.arrangements.includes(job.workArrangement))) return false;
  if (filters.experienceLevels?.length && !filters.experienceLevels.includes(experienceLevelFor(job.requirements.minimumExperienceYears))) {
    return false;
  }
  // A hidden salary is not compared, so it can't be guessed from filter results.
  if (filters.minSalary && job.salary.visible && (job.salary.maximum ?? job.salary.minimum ?? 0) < filters.minSalary) return false;
  return true;
}

async function openJobsWithProfile(): Promise<[JobWithCompany[], CandidateProfile | null]> {
  return Promise.all([jobPosting.listOpenJobs(), candidateProfile.getProfile()]);
}

export async function searchJobs(filters: JobSearchFilters = {}): Promise<JobWithMatch[]> {
  const [jobs, profile] = await openJobsWithProfile();
  return jobs
    .filter((job) => matchesFilters(job, filters))
    .map(withMatch(profile))
    .sort((a, b) => b.match.score - a.match.score);
}

export async function getRecommendations(limit = 6): Promise<JobWithMatch[]> {
  const [jobs, profile] = await openJobsWithProfile();
  return jobs
    .map(withMatch(profile))
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, limit);
}

export async function evaluateJobFit(jobId: string): Promise<JobWithMatch> {
  const [job, profile] = await Promise.all([jobPosting.getJob(jobId), candidateProfile.getProfile()]);
  return withMatch(profile)(job);
}

export async function getMatchResult(jobId: string): Promise<MatchResult> {
  return (await evaluateJobFit(jobId)).match;
}
