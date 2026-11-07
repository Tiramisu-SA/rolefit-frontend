import type { CompanyProfile, CompanyProfileInput, RecruiterProfile, RecruiterProfileInput } from "@/lib/types";
import { ApiError } from "./errors";
import { gatewayRequest } from "./gateway";

// REST client for the Company Service, reached through the API Gateway
// (/api/companies/* and /api/recruiters/*).

const request = <T>(method: string, path: string, init: { json?: unknown } = {}) =>
  gatewayRequest<T>(method, path, { ...init, serviceName: "company service" });

export const getMyCompany = () => request<CompanyProfile>("GET", "/api/companies/me");

export const updateMyCompany = (input: CompanyProfileInput) => request<CompanyProfile>("PUT", "/api/companies/me", { json: input });

/** Any company's profile, or null when it has not saved one. */
export async function getCompany(id: string): Promise<CompanyProfile | null> {
  try {
    return await request<CompanyProfile>("GET", `/api/companies/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof ApiError && (e.code === "COMPANY_NOT_FOUND" || e.status === 404)) return null;
    throw e;
  }
}

export const getMyRecruiterProfile = () => request<RecruiterProfile>("GET", "/api/recruiters/me");

export const updateMyRecruiterProfile = (input: RecruiterProfileInput) =>
  request<RecruiterProfile>("PUT", "/api/recruiters/me", { json: input });
