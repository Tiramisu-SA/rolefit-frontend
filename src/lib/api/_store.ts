import type { ResumeDraft } from "@/lib/types";
import { ApiError } from "./errors";

/** The one mock seeker in this browser (used by the Resume Preparation mock). */
export const SEEKER_ID = "me";

// In-memory state for the one service that is still mocked (Resume Preparation).
// Jobs, profiles and applications come from the real services.
interface Store {
  resumeDrafts: ResumeDraft[];
}

/** Lives for the browser session; reload resets it. */
export const store: Store = structuredClone({ resumeDrafts: [] as ResumeDraft[] });

/** Simulates network latency for mock operations. Add `?mockError=1` to the URL to make them fail. */
export async function simulate<T>(produce: () => T, ms = 350): Promise<T> {
  await new Promise((r) => setTimeout(r, ms));
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("mockError")) {
    throw new ApiError("MOCK_ERROR", "The service is unavailable. Please try again.");
  }
  return structuredClone(produce());
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
