"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session as SupabaseSession } from "@supabase/supabase-js";
import { supabase } from "@/lib/auth/supabase";
import type { Role } from "@/lib/types";

interface Session {
  userId: string;
  email: string;
  role: Role;
  name: string;
  /** JWT to send to backend services as `Authorization: Bearer <accessToken>`. */
  accessToken: string;
}

interface SignUpInput {
  role: Role;
  name: string;
  email: string;
  password: string;
  company?: string;
}

/** Resolves to an error message, or null on success. */
type AuthResult = Promise<string | null>;

interface RoleContextValue {
  session: Session | null;
  ready: boolean;
  signIn: (role: Role, email: string, password: string) => AuthResult;
  signUp: (input: SignUpInput) => AuthResult;
  signOut: () => Promise<void>;
}

const ROLE_LABEL: Record<Role, string> = { seeker: "job seeker", recruiter: "recruiter" };
const RoleContext = createContext<RoleContextValue | null>(null);

function isRole(value: unknown): value is Role {
  return value === "seeker" || value === "recruiter";
}

/** Maps a Supabase session to ours. The role comes from app_metadata, which only the server can write. */
function toSession(s: SupabaseSession | null): Session | null {
  if (!s) return null;
  const role = s.user.app_metadata?.role;
  if (!isRole(role)) return null;
  return {
    userId: s.user.id,
    email: s.user.email ?? "",
    role,
    name: (s.user.user_metadata?.name as string | undefined) ?? s.user.email ?? "",
    accessToken: s.access_token,
  };
}

/** Supabase Auth session. Supabase stores and refreshes the tokens itself. */
export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Fires once on mount with the stored session (INITIAL_SESSION), then on every sign-in,
    // sign-out and token refresh, so `session.accessToken` stays current.
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(toSession(s));
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (role: Role, email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;

    const next = toSession(data.session);
    if (!next) {
      await supabase.auth.signOut();
      return "This account has no role. Please contact support.";
    }
    if (next.role !== role) {
      await supabase.auth.signOut();
      return `This is a ${ROLE_LABEL[next.role]} account. Switch to "${next.role === "seeker" ? "Job Seeker" : "Recruiter"}" to sign in.`;
    }
    setSession(next);
    return null;
  }, []);

  const signUp = useCallback(async ({ role, name, email, password, company }: SignUpInput) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // Lands in user_metadata. The database trigger copies `role` into app_metadata.
      options: { data: { role, name, ...(company ? { company } : {}) } },
    });
    if (error) return error.message;
    if (!data.session) return "Check your email to confirm your account, then sign in.";

    // The first token can be issued before the trigger's app_metadata change is read back,
    // so refresh once to get a token that carries the role.
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) return refreshError.message;
    const next = toSession(refreshed.session);
    if (!next) return "Account created, but the role is missing. Please sign in again.";
    setSession(next);
    return null;
  }, []);

  const signOut = useCallback(async () => {
    setSession(null);
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(() => ({ session, ready, signIn, signUp, signOut }), [session, ready, signIn, signUp, signOut]);
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used inside RoleProvider");
  return ctx;
}
