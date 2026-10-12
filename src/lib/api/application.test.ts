import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as applications from "./application";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/lib/auth/supabase", () => ({ supabase: { auth: { getSession } } }));

const fetchMock = vi.fn();
const GW = "http://localhost:8080";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const protoJob = (id: string, status = "JOB_STATUS_OPEN") => ({
  id, recruiter_id: "u1", company_id: "co-acme-corp-7f3a9c", title: `Job ${id}`, status,
  created_at: "2026-10-01T00:00:00.000Z", updated_at: "2026-10-01T00:00:00.000Z",
});

const rawApp = (over: Record<string, unknown> = {}) => ({
  id: "app_1", jobId: "job_1", companyId: "co-acme-corp-7f3a9c", candidateId: "c1",
  candidate: { id: "c1", name: "Mai Srisuk", email: "mai@example.com" },
  jobSnapshot: { id: "job_1", title: "Job job_1", companyId: "co-acme-corp-7f3a9c" },
  resumeReference: { draftId: "draft_9", format: "company", approvedAt: "2026-10-02T00:00:00.000Z", updatedAt: "2026-10-02T00:00:00.000Z" },
  matchSnapshot: { score: 72, explanation: "Good fit", summary: "Good fit", capturedAt: "2026-10-02T00:00:00.000Z" },
  status: "Submitted", submittedAt: "2026-10-02T00:00:00.000Z", updatedAt: "2026-10-02T00:00:00.000Z",
  history: [{ status: "Submitted", at: "2026-10-02T00:00:00.000Z", changedBy: "c1", note: null }],
  ...over,
});

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

describe("toApplication", () => {
  it("maps the service shape to the frontend type", () => {
    expect(applications.toApplication(rawApp())).toEqual({
      id: "app_1", jobId: "job_1", candidateId: "c1",
      candidate: { id: "c1", name: "Mai Srisuk", initials: "MS", headline: "", email: "mai@example.com" },
      resumeDraftId: "draft_9", resumeFormat: "company", status: "Submitted",
      submittedAt: "2026-10-02T00:00:00.000Z", updatedAt: "2026-10-02T00:00:00.000Z",
      matchSnapshot: { score: 72, summary: "Good fit", capturedAt: "2026-10-02T00:00:00.000Z" },
      history: [{ status: "Submitted", at: "2026-10-02T00:00:00.000Z" }],
    });
  });

  it("handles legacy rows without resume or match snapshots", () => {
    const app = applications.toApplication(rawApp({ resumeReference: null, matchSnapshot: null, history: [{ status: "Submitted", at: "x", changedBy: "c1", note: "hi" }] }));
    expect(app.matchSnapshot).toBeNull();
    expect(app.resumeDraftId).toBe("");
    expect(app.resumeFormat).toBe("personal");
    expect(app.history).toEqual([{ status: "Submitted", at: "x", note: "hi" }]);
  });
});

describe("application client", () => {
  it("submits through the gateway and returns the application with its job", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.startsWith(`${GW}/api/applications`) ? jsonResponse(201, { application: rawApp() }) : jsonResponse(200, { job: protoJob("job_1") }),
    );
    const view = await applications.submitApplication("job_1");
    expect(fetchMock.mock.calls[0][0]).toBe(`${GW}/api/jobs/job_1`);
    const [url, init] = fetchMock.mock.calls[1];
    expect([url, init.method]).toEqual([`${GW}/api/applications`, "POST"]);
    expect(JSON.parse(init.body)).toEqual({ jobId: "job_1" });
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer test-token");
    expect(view).toMatchObject({ id: "app_1", job: { id: "job_1" } });
  });

  it("does not submit when the job cannot be fetched", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(404, { error: { code: "NOT_FOUND", message: "Job not found" } }));
    await expect(applications.submitApplication("job_1")).rejects.toBeDefined();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("keeps the service's error code and message when submitting fails", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(409, { error: { code: "ALREADY_APPLIED", message: "You've already applied to this job" } }));
    await expect(applications.submitApplication("job_1")).rejects.toMatchObject({ code: "ALREADY_APPLIED", status: 409, message: "You've already applied to this job" });
  });

  it("lists my applications joined with their jobs, leaving out jobs that no longer exist", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === `${GW}/api/applications/mine`) return jsonResponse(200, { applications: [rawApp(), rawApp({ id: "app_2", jobId: "job_gone" })] });
      if (url.startsWith(`${GW}/api/jobs?`) || url === `${GW}/api/jobs`) return jsonResponse(200, { jobs: [protoJob("job_1")] });
      return jsonResponse(404, { error: { code: "NOT_FOUND", message: "Job not found" } });
    });
    const mine = await applications.listMyApplications();
    expect(mine.map((a) => a.id)).toEqual(["app_1"]);
    expect(mine[0].job.id).toBe("job_1");
  });

  it("lists a job's applicants best match first, unscored last", async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse(200, {
        applications: [
          rawApp({ id: "low", matchSnapshot: { score: 40, summary: "", capturedAt: "x" } }),
          rawApp({ id: "none", matchSnapshot: null }),
          rawApp({ id: "high", matchSnapshot: { score: 90, summary: "", capturedAt: "x" } }),
        ],
      }),
    );
    const job = { id: "job_1" } as Parameters<typeof applications.listApplicantsForJob>[0];
    const list = await applications.listApplicantsForJob(job);
    expect(fetchMock.mock.calls[0][0]).toBe(`${GW}/api/applications?jobId=job_1`);
    expect(list.map((a) => a.id)).toEqual(["high", "low", "none"]);
    expect(list[0].job).toBe(job);
  });

  it("updates a status with a trimmed note and returns it with the recruiter's job", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("/api/applications/")
        ? jsonResponse(200, { application: rawApp({ status: "Interview" }), notificationQueued: true })
        : jsonResponse(200, { job: protoJob("job_1") }),
    );
    const view = await applications.updateApplicationStatus("app_1", "Interview", "  See you Monday  ");
    const [url, init] = fetchMock.mock.calls[0];
    expect([url, init.method]).toEqual([`${GW}/api/applications/app_1/status`, "PATCH"]);
    expect(JSON.parse(init.body)).toEqual({ status: "Interview", note: "See you Monday" });
    expect(fetchMock.mock.calls[1][0]).toBe(`${GW}/api/jobs/mine/job_1`);
    expect(view.status).toBe("Interview");

    await applications.updateApplicationStatus("app_1", "Offer", "   ");
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ status: "Offer" });
  });

  it("makes only the PATCH when the job is passed in", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(200, { application: rawApp({ status: "Interview" }), notificationQueued: true }));
    const job = { id: "job_1" } as Parameters<typeof applications.listApplicantsForJob>[0];
    const view = await applications.updateApplicationStatus("app_1", "Interview", undefined, job);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(view.job).toBe(job);
    expect(view.notificationQueued).toBe(true);
  });
});
