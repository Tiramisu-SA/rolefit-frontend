import { supabase } from "@/lib/auth/supabase";
import { ApiError, type FieldError } from "./errors";

// The one HTTP client for RoleFit's backend. Every request goes to the API
// Gateway with the signed-in user's Supabase access token; the gateway checks
// the token and routes the request to the right service.

export interface GatewayRequestInit {
  json?: unknown;
  body?: BodyInit;
  headers?: HeadersInit;
  query?: URLSearchParams;
  /** Used in error messages, e.g. "profile service". */
  serviceName?: string;
}

interface ErrorBody {
  error?: { code?: string; message?: string; details?: FieldError[] };
}

function baseUrl(): string {
  // Must be read as a literal so Next can inline it into the browser bundle.
  const url = process.env.NEXT_PUBLIC_API_GATEWAY_URL;
  if (!url) {
    throw new ApiError("CONFIG_ERROR", "NEXT_PUBLIC_API_GATEWAY_URL is not set. Add it to .env.local and restart the dev server.");
  }
  return url.replace(/\/+$/, "");
}

/** The current access token; Supabase refreshes it before it expires. */
async function accessToken(): Promise<string | undefined> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

/** Calls `path` (e.g. "/api/candidates/profiles/me") on the gateway. Throws ApiError on failure. */
export async function gatewayRequest<T>(method: string, path: string, init: GatewayRequestInit = {}): Promise<T> {
  const service = init.serviceName ?? "RoleFit server";
  const qs = init.query?.toString();
  const url = `${baseUrl()}${path}${qs ? `?${qs}` : ""}`;

  const headers = new Headers(init.headers);
  const token = await accessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }

  let res: Response;
  try {
    res = await fetch(url, { method, headers, body });
  } catch {
    throw new ApiError("SERVICE_UNAVAILABLE", `Can't reach the ${service}. Please try again.`, 503);
  }

  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const err = (data as ErrorBody | null)?.error;
    throw new ApiError(err?.code ?? "INTERNAL", err?.message ?? `The ${service} returned an error (${res.status}).`, res.status, err?.details);
  }
  return data as T;
}
