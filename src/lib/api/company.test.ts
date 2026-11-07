import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as companyApi from "./company";
import { ApiError } from "./errors";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/lib/auth/supabase", () => ({ supabase: { auth: { getSession } } }));

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_GATEWAY_URL", "http://localhost:8080");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  getSession.mockResolvedValue({ data: { session: { access_token: "test-token" } } });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("company client", () => {
  it("returns null when a company has no saved profile", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { error: { code: "COMPANY_NOT_FOUND", message: "none" } }));
    expect(await companyApi.getCompany("co-x")).toBeNull();
  });

  it("rethrows other errors", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { error: { code: "INTERNAL", message: "boom" } }));
    await expect(companyApi.getCompany("co-x")).rejects.toBeInstanceOf(ApiError);
  });

  it("PUTs the company body to /api/companies/me", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { id: "co-x", name: "X" }));
    await companyApi.updateMyCompany({ description: "d", website: "", industry: "", size: "", location: "", logoUrl: "" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8080/api/companies/me");
    expect(init.method).toBe("PUT");
  });
});
