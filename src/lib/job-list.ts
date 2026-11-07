import type { JobWithMatch } from "./types";

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
