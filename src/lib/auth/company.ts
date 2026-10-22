import { supabase } from "@/lib/auth/supabase";

/**
 * Whether a recruiter already registered this company name (case- and
 * whitespace-insensitive). Calls the `company_name_taken` database function from
 * supabase/auth-setup.sql; the signup trigger enforces the same rule.
 */
export async function isCompanyNameTaken(name: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("company_name_taken", { name });
  if (error) throw new Error(error.message);
  return data === true;
}
