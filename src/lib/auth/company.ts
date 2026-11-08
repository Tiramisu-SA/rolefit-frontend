import type { Role } from "@/lib/types";

export const COMPANY_TAKEN_MESSAGE = "This company name is already registered. Try a different name.";

/**
 * The message to show when Supabase refuses a sign-up.
 *
 * The sign-up trigger in supabase/auth-setup.sql refuses a recruiter whose company
 * name is already registered (or reserved for the demo companies), and Supabase
 * reports any trigger error as "Database error saving new user". The register page
 * does not check the name first: that would need the Supabase Data API, which this
 * project keeps disabled.
 */
export function signUpErrorMessage(role: Role, message: string): string {
  if (role === "recruiter" && /database error saving new user/i.test(message)) return COMPANY_TAKEN_MESSAGE;
  return message;
}
