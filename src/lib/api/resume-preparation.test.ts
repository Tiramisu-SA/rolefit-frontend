import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as resumes from "./resume-preparation";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/lib/auth/supabase", () => ({ supabase: { auth: { getSession } } }));

const fetchMock = vi.fn();
const GW = "http://localhost:8080";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const draft = {
  id: "d1", jobId: "job_1", candidateId: "c1", format: "personal",
  sections: [{ id: "s1", kind: "summary", title: "Summary", bullets: [{ id: "b1", text: "Hi", tailored: false }], emphasized: false, included: true }],
  approved: false, generatedAt: "2026-10-12T00:00:00.000Z", updatedAt: "2026-10-12T00:00:00.000Z",
};

const apiError = (code: string) => ({ error: { code, message: code } });

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_GATEWAY_URL", GW);
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  getSession.mockResolvedValue({ data: { session: { access_token: "test-token" } } });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const lastCall = () => {
  const [url, init] = fetchMock.mock.calls[0];
  return { url: String(url), init: init as RequestInit };
};

describe("resume preparation client", () => {
  it("generateTailoredResume POSTs to generate with the bearer token", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(200, draft));
    expect(await resumes.generateTailoredResume("job 1")).toEqual(draft);
    const { url, init } = lastCall();
    expect(url).toBe(`${GW}/api/resumes/drafts/job%201/generate`);
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer test-token");
  });

  it("getResumeDraft returns the draft", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(200, draft));
    expect(await resumes.getResumeDraft("job_1")).toEqual(draft);
    const { url, init } = lastCall();
    expect(url).toBe(`${GW}/api/resumes/drafts/job_1`);
    expect(init.method).toBe("GET");
  });

  it("getResumeDraft returns null on RESUME_DRAFT_NOT_FOUND", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(404, apiError("RESUME_DRAFT_NOT_FOUND")));
    expect(await resumes.getResumeDraft("job_1")).toBeNull();
  });

  it("getResumeDraft rejects other errors with their code", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(503, apiError("SERVICE_UNAVAILABLE")));
    await expect(resumes.getResumeDraft("job_1")).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  });

  it("editResumeDraft PUTs the sections", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(200, draft));
    await resumes.editResumeDraft("job_1", draft.sections as never);
    const { url, init } = lastCall();
    expect(url).toBe(`${GW}/api/resumes/drafts/job_1/sections`);
    expect(init.method).toBe("PUT");
    expect(JSON.parse(String(init.body))).toEqual({ sections: draft.sections });
  });

  it("selectResumeFormat PUTs the format", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(200, { ...draft, format: "company" }));
    await resumes.selectResumeFormat("job_1", "company");
    const { url, init } = lastCall();
    expect(url).toBe(`${GW}/api/resumes/drafts/job_1/format`);
    expect(init.method).toBe("PUT");
    expect(JSON.parse(String(init.body))).toEqual({ format: "company" });
  });

  it("approveResume POSTs to approve", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(200, { ...draft, approved: true }));
    expect((await resumes.approveResume("job_1")).approved).toBe(true);
    const { url, init } = lastCall();
    expect(url).toBe(`${GW}/api/resumes/drafts/job_1/approve`);
    expect(init.method).toBe("POST");
  });

  it("getApprovedResume GETs approved and surfaces RESUME_NOT_APPROVED", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(200, { ...draft, approved: true }));
    await resumes.getApprovedResume("job_1");
    expect(lastCall().url).toBe(`${GW}/api/resumes/drafts/job_1/approved`);
    fetchMock.mockImplementation(async () => jsonResponse(409, apiError("RESUME_NOT_APPROVED")));
    await expect(resumes.getApprovedResume("job_1")).rejects.toMatchObject({ code: "RESUME_NOT_APPROVED" });
  });
});
