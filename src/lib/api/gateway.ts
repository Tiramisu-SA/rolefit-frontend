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

/** Keeps only a safe base name: after the last / or \\, no control characters; "", "." and ".." are no name. */
function safeFileName(name: string): string | undefined {
  const base = (name.split(/[/\\]/).pop() ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return base === "" || base === "." || base === ".." ? undefined : base;
}

/** The file name from a Content-Disposition header (`filename*=UTF-8''...` first, then `filename=`), or undefined. */
export function fileNameFromContentDisposition(header: string | null): string | undefined {
  if (!header) return undefined;
  const extended = /filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/i.exec(header)?.[1]?.trim();
  if (extended) {
    try {
      const name = safeFileName(decodeURIComponent(extended));
      if (name) return name;
    } catch {
      // malformed percent-encoding: fall through to the plain filename
    }
  }
  const plain = /filename\s*=\s*(?:"([^"]*)"|([^;]+))/i.exec(header);
  return safeFileName(plain?.[1] ?? plain?.[2] ?? "");
}

/** The same as `gatewayRequest`, for a route that answers with a file: returns the bytes and the name the server gave it. */
export async function gatewayDownloadFile(
  path: string,
  init: Pick<GatewayRequestInit, "serviceName"> = {},
): Promise<{ blob: Blob; fileName?: string }> {
  const service = init.serviceName ?? "RoleFit server";
  const headers = new Headers();
  const token = await accessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let res: Response;
  try {
    res = await fetch(`${baseUrl()}${path}`, { method: "GET", headers });
  } catch {
    throw new ApiError("SERVICE_UNAVAILABLE", `Can't reach the ${service}. Please try again.`, 503);
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as ErrorBody | null;
    throw new ApiError(data?.error?.code ?? "INTERNAL", data?.error?.message ?? `The ${service} returned an error (${res.status}).`, res.status, data?.error?.details);
  }
  return { blob: await res.blob(), fileName: fileNameFromContentDisposition(res.headers.get("Content-Disposition")) };
}

/** The same as `gatewayDownloadFile`, when only the bytes are needed. */
export async function gatewayDownload(path: string, init: Pick<GatewayRequestInit, "serviceName"> = {}): Promise<Blob> {
  return (await gatewayDownloadFile(path, init)).blob;
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
