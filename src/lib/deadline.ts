import type { JobStatus } from "./types";

export type ApplicationState = "open" | "deadline-passed" | "closed";

/**
 * Whether a seeker can apply. A job can still be OPEN after its deadline
 * (nothing closes it automatically), and the Application Service rejects
 * submissions after the deadline, so the page must not offer to apply.
 */
export function applicationState(status: JobStatus, deadline: string | undefined, now: Date = new Date()): ApplicationState {
  if (status !== "OPEN") return "closed";
  const at = deadline ? Date.parse(deadline) : NaN;
  return Number.isFinite(at) && at <= now.getTime() ? "deadline-passed" : "open";
}
