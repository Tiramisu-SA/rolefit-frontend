import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as jobsApi from "./job-posting";
import type { JobPostingInput } from "@/lib/types";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/lib/auth/supabase", () => ({ supabase: { auth: { getSession } } }));

const fetchMock = vi.fn();
const GW = "http://localhost:8080";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const protoJob = {
  id: "job_1",
  recruiter_id: "u1",
  company_id: "co-brightline",
  title: "Frontend Developer",
  status: "JOB_STATUS_OPEN",
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
};

const input: JobPostingInput = {
  title: "Backend Engineer",
  description: "",
  responsibilities: [],
  requirements: { requiredSkills: [], preferredSkills: [], minimumExperienceYears: 0, educationLevel: "NONE", acceptedFields: [] },
  location: {},
  salary: { currency: "THB", visible: true },
  positionsAvailable: 1,
  requireCoverLetter: false,
};

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

describe("job posting client", () => {
  it("lists open jobs through the gateway and maps them with the company", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { jobs: [protoJob] }));
    const jobs = await jobsApi.listOpenJobs({ query: "react" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${GW}/api/jobs?query=react`);
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer test-token");
    expect(jobs[0]).toMatchObject({ id: "job_1", status: "OPEN", company: { id: "co-brightline", name: "Brightline Analytics" } });
  });

  it("reads one public job and one own job", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(200, { job: protoJob }));
    await jobsApi.getJob("job 1");
    await jobsApi.getMyJob("job_1");
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([`${GW}/api/jobs/job%201`, `${GW}/api/jobs/mine/job_1`]);
  });

  it("lists own jobs with the proto status filter", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(200, { jobs: [] }));
    await jobsApi.listMyJobs({ status: "DRAFT", query: "dev" });
    await jobsApi.listMyJobs();
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([`${GW}/api/jobs/mine?status=JOB_STATUS_DRAFT&query=dev`, `${GW}/api/jobs/mine`]);
  });

  it("creates and updates with a proto-shaped body", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(200, { job: { ...protoJob, status: "JOB_STATUS_DRAFT" } }));
    const created = await jobsApi.createJob(input);
    await jobsApi.updateJob("job_1", input);
    expect(created.status).toBe("DRAFT");
    const [[createUrl, createInit], [updateUrl, updateInit]] = fetchMock.mock.calls;
    expect([createUrl, createInit.method]).toEqual([`${GW}/api/jobs/mine`, "POST"]);
    expect([updateUrl, updateInit.method]).toEqual([`${GW}/api/jobs/mine/job_1`, "PUT"]);
    expect(JSON.parse(createInit.body)).toMatchObject({ title: "Backend Engineer", requirements: { education_level: "EDUCATION_LEVEL_NONE" } });
  });

  it("publishes, closes, reopens and deletes", async () => {
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) =>
      init.method === "DELETE" ? new Response(null, { status: 204 }) : jsonResponse(200, { job: protoJob }),
    );
    await jobsApi.publishJob("job_1");
    await jobsApi.closeJob("job_1");
    await jobsApi.reopenJob("job_1");
    await expect(jobsApi.deleteJob("job_1")).resolves.toBeUndefined();
    expect(fetchMock.mock.calls.map(([url, init]) => `${init.method} ${url}`)).toEqual([
      `POST ${GW}/api/jobs/mine/job_1/publish`,
      `POST ${GW}/api/jobs/mine/job_1/close`,
      `POST ${GW}/api/jobs/mine/job_1/reopen`,
      `DELETE ${GW}/api/jobs/mine/job_1`,
    ]);
  });

  it("uploads a resume template as a raw body with type and encoded file name", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { template: { id: "tpl_1", file_name: "แม่แบบ.docx", content_type: "x", size_bytes: "2", created_at: "2026-10-10" } }),
    );
    const file = new File(["PK"], "แม่แบบ.docx", { type: "" });
    const info = await jobsApi.attachResumeTemplate("job_1", file);
    expect(info).toEqual({ id: "tpl_1", fileName: "แม่แบบ.docx", contentType: "x", sizeBytes: 2, createdAt: "2026-10-10" });
    const [url, init] = fetchMock.mock.calls[0];
    expect([url, init.method]).toEqual([`${GW}/api/jobs/mine/job_1/resume-template`, "PUT"]);
    const headers = new Headers(init.headers);
    expect(headers.get("Content-Type")).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(headers.get("X-File-Name")).toBe(encodeURIComponent("แม่แบบ.docx"));
    expect(init.body).toBe(file);
  });

  it("returns null when the job has no resume template", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { error: { code: "NOT_FOUND", message: "No template" } }));
    expect(await jobsApi.getResumeTemplate("job_1")).toBeNull();
  });

  it("keeps the gateway's error code and field errors", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, { error: { code: "VALIDATION_ERROR", message: "title: Is required", details: [{ field: "title", message: "Is required" }] } }),
    );
    await expect(jobsApi.publishJob("job_1")).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 400, fieldErrors: [{ field: "title", message: "Is required" }] });
  });

  it("gets the recruiter company from the gateway", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { companyId: "co-brightline" }));
    const company = await jobsApi.getRecruiterCompany();
    expect(fetchMock.mock.calls[0][0]).toBe(`${GW}/api/jobs/mine/company`);
    expect(company.id).toBe("co-brightline");
  });
});
