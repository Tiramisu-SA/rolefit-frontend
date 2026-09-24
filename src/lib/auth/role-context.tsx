"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Role } from "@/lib/types";

interface Session {
  role: Role;
  name: string;
}

interface RoleContextValue {
  session: Session | null;
  ready: boolean;
  signIn: (role: Role, name?: string) => void;
  signOut: () => void;
}

const KEY = "rolefit.session";
const DEFAULT_NAME: Record<Role, string> = { seeker: "Pimchanok Srisuk", recruiter: "Nattapong K." };
const RoleContext = createContext<RoleContextValue | null>(null);

/** Mock-only session stored in localStorage. Not authentication. */
export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // One-time hydration of the mock session from localStorage on mount; this must run in an
    // effect (not a lazy initializer) because localStorage is unavailable during SSR/prerender.
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only hydration
      if (raw) setSession(JSON.parse(raw) as Session);
    } catch {
      /* storage unavailable: stay signed out */
    }
    setReady(true);
  }, []);

  const signIn = useCallback((role: Role, name?: string) => {
    const next = { role, name: name?.trim() || DEFAULT_NAME[role] };
    setSession(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const signOut = useCallback(() => {
    setSession(null);
    try {
      localStorage.removeItem(KEY);
    } catch {}
  }, []);

  const value = useMemo(() => ({ session, ready, signIn, signOut }), [session, ready, signIn, signOut]);
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used inside RoleProvider");
  return ctx;
}
