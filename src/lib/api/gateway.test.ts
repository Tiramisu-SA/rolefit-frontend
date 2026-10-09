import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./errors";
import { gatewayRequest } from "./gateway";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/lib/auth/supabase", () => ({ supabase: { auth: { getSession } } }));

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_GATEWAY_URL", "http://localhost:8080/");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  getSession.mockResolvedValue({ data: { session: { access_token: "test-token" } } });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("gatewayRequest", () => {
  it("calls the gateway with the Supabase access token and the query string", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));
    const data = await gatewayRequest("GET", "/api/discovery/recommendations", { query: new URLSearchParams({ limit: "3" }) });
    expect(data).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8080/api/discovery/recommendations?limit=3");
    expect(init.method).toBe("GET");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer test-token");
  });

  it("sends no Authorization header when nobody is signed in", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    fetchMock.mockResolvedValue(jsonResponse(200, {}));
    await gatewayRequest("GET", "/api/jobs");
    expect(new Headers(fetchMock.mock.calls[0][1].headers).has("Authorization")).toBe(false);
  });

  it("serializes json bodies", async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { id: "p1" }));
    await gatewayRequest("POST", "/api/candidates/profiles/me", { json: { name: "Pim" } });
    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ name: "Pim" });
  });

  it("resolves 204 to undefined", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(gatewayRequest("DELETE", "/api/jobs/mine/job_1")).resolves.toBeUndefined();
  });

  it("turns an error body into an ApiError with field errors", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, { error: { code: "VALIDATION_ERROR", message: "Some fields are invalid", details: [{ field: "title", message: "Is required" }] } }),
    );
    await expect(gatewayRequest("POST", "/api/jobs/mine", { json: {} })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
      fieldErrors: [{ field: "title", message: "Is required" }],
    });
  });

  it("uses the service name in fallback messages", async () => {
    fetchMock.mockResolvedValue(new Response("oops", { status: 502 }));
    await expect(gatewayRequest("GET", "/api/jobs", { serviceName: "job service" })).rejects.toMatchObject({
      code: "INTERNAL",
      status: 502,
      message: "The job service returned an error (502).",
    });

    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const error = await gatewayRequest("GET", "/api/jobs", { serviceName: "job service" }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "SERVICE_UNAVAILABLE", status: 503, message: "Can't reach the job service. Please try again." });
  });

  it("fails with CONFIG_ERROR when the gateway URL is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_GATEWAY_URL", "");
    await expect(gatewayRequest("GET", "/api/jobs")).rejects.toMatchObject({ code: "CONFIG_ERROR" });
  });
});
