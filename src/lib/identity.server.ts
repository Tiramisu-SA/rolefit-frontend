import "server-only";
import { ApiError } from "@/lib/api/errors";

export interface RecruiterCaller {
  userId: string;
  companyId: string;
}

/** Mock recruiter identity, read from server-only env vars and sent as gRPC metadata. */
export function recruiterCaller(): RecruiterCaller {
  const userId = process.env.DEV_RECRUITER_USER_ID;
  const companyId = process.env.DEV_RECRUITER_COMPANY_ID;
  if (!userId || !companyId) {
    throw new ApiError("CONFIG_ERROR", "DEV_RECRUITER_USER_ID and DEV_RECRUITER_COMPANY_ID must be set in .env.local.");
  }
  return { userId, companyId };
}
