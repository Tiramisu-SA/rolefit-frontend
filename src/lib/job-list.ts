import type { JobPosting, JobWithMatch } from "./types";

export type JobTab = "recommended" | "all";

/** The Recommended tab only shows jobs that match at least this well. */
export const RECOMMENDED_MIN_SCORE = 60;

export function jobsForTab(jobs: JobWithMatch[], tab: JobTab): JobWithMatch[] {
  return tab === "recommended" ? jobs.filter((j) => j.match.score >= RECOMMENDED_MIN_SCORE) : jobs;
}

/**
 * Why a tab is empty. On Recommended, jobs may exist that all match below the
 * threshold: clearing filters can't help then, so the page offers all jobs instead.
 */
export function emptyReason(allJobs: JobWithMatch[], tab: JobTab): "no-strong-matches" | "no-results" {
  return tab === "recommended" && allJobs.length > 0 ? "no-strong-matches" : "no-results";
}

/** Whether a job can be applied to now. Same rule as the Application Service, so nobody finds out only after preparing a resume. */
export function acceptingApplications(job: Pick<JobPosting, "status" | "applicationSettings">, now: Date = new Date()): boolean {
  if (job.status !== "OPEN") return false;
  const deadline = job.applicationSettings.applicationDeadline;
  if (!deadline) return true;
  const time = Date.parse(deadline);
  return Number.isNaN(time) || time > now.getTime();
}
