import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./errors";
import * as resumeApi from "./resume-preparation";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/lib/auth/supabase", () => ({ supabase: { auth: { getSession } } }));

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const draft = {
  id: "draft_1",
  jobId: "job_1",
  candidateId: "3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
  format: "personal",
  sections: [{ id: "skills", kind: "skills", title: "Skills", bullets: [{ id: "skills-b0", text: "React", tailored: false }], emphasized: false, included: true }],
  approved: false,
  updatedAt: "2026-10-11T09:00:00.000Z",
};

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

describe("resume preparation client", () => {
  it("generates a draft through the gateway with the access token", async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, draft));
    expect(await resumeApi.generateTailoredResume("job_1")).toEqual(draft);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8080/api/resumes/drafts/job_1/generate");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer test-token");
  });

  it("returns null when no draft exists yet, and rethrows other errors", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(404, { error: { code: "RESUME_DRAFT_NOT_FOUND", message: "No draft" } }));
    expect(await resumeApi.getResumeDraft("job_1")).toBeNull();

    fetchMock.mockResolvedValueOnce(jsonResponse(503, { error: { code: "SERVICE_UNAVAILABLE", message: "Down" } }));
    await expect(resumeApi.getResumeDraft("job_1")).rejects.toBeInstanceOf(ApiError);
  });

  it("sends edits, format and approval to their routes", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, draft));
    await resumeApi.editResumeDraft("job_1", draft.sections as never);
    await resumeApi.selectResumeFormat("job_1", "company");
    await resumeApi.approveResume("job_1");
    await resumeApi.getApprovedResume("job_1");

    const calls = fetchMock.mock.calls.map(([url, init]) => `${init.method} ${url.replace("http://localhost:8080", "")}`);
    expect(calls).toEqual([
      "PUT /api/resumes/drafts/job_1/sections",
      "PUT /api/resumes/drafts/job_1/format",
      "POST /api/resumes/drafts/job_1/approve",
      "GET /api/resumes/drafts/job_1/approved",
    ]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ sections: draft.sections });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ format: "company" });
  });

  it("passes the service's error code through (e.g. RESUME_NOT_APPROVED)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, { error: { code: "RESUME_NOT_APPROVED", message: "Approve your resume before applying." } }));
    await expect(resumeApi.getApprovedResume("job_1")).rejects.toMatchObject({ code: "RESUME_NOT_APPROVED" });
  });
});
