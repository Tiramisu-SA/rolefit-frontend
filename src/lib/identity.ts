import { ApiError } from "@/lib/api/errors";

/**
 * Mock identity (auth is not wired yet). The only place the frontend decides
 * who the seeker is; real auth replaces this file. The recruiter identity is
 * server-only: see identity.server.ts.
 */
export function seekerUserId(): string {
  const id = process.env.NEXT_PUBLIC_DEV_SEEKER_USER_ID;
  if (!id) {
    throw new ApiError("CONFIG_ERROR", "NEXT_PUBLIC_DEV_SEEKER_USER_ID is not set. Add it to .env.local and restart the dev server.");
  }
  return id;
}
