import { applications } from "@/lib/mock/applications";
import type { Application } from "@/lib/types";
import { ApiError } from "./errors";

export { SEEKER_ID } from "@/lib/mock/applications";

// In-memory state for the Application Service, which is still mocked. Jobs,
// profiles and resume drafts come from the real services.
interface Store {
  applications: Application[];
}

/** Lives for the browser session; reload resets it. */
export const store: Store = structuredClone({ applications });

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
