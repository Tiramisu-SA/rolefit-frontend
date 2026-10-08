import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./errors";
import * as discoveryApi from "./job-discovery";

const USER = "3f1c2b7e-9a4d-4c1e-8b2a-5d6e7f809a1b";
const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const job = { id: "job_1", companyId: "co-brightline", title: "Frontend Developer", match: { score: 80 } };

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_JOB_DISCOVERY_API_URL", "http://localhost:3002/");
  vi.stubEnv("NEXT_PUBLIC_DEV_SEEKER_USER_ID", USER);
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("job discovery client", () => {
  it("sends filters as query parameters with X-User-Id and attaches the company", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { jobs: [job] }));
    const jobs = await discoveryApi.searchJobs({
      query: " react ",
      location: "",
      employmentTypes: ["FULL_TIME", "CONTRACT"],
      arrangements: [],
      experienceLevels: ["Entry level"],
      minSalary: 30000,
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "http://localhost:3002/api/jobs/search?query=react&employmentTypes=FULL_TIME%2CCONTRACT&experienceLevels=Entry+level&minSalary=30000",
    );
    expect(new Headers(init.headers).get("X-User-Id")).toBe(USER);
    expect(jobs[0].company.name).toBe("Brightline Analytics");
  });

  it("calls the recommendation, fit and match routes", async () => {
    fetchMock.mockImplementation(async (url: string) => jsonResponse(200, url.includes("/recommendations") ? { jobs: [job] } : url.endsWith("/match") ? job.match : job));
    await discoveryApi.getRecommendations(3);
    const fit = await discoveryApi.evaluateJobFit("job_1");
    const match = await discoveryApi.getMatchResult("job_1");
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:3002/api/recommendations?limit=3",
      "http://localhost:3002/api/jobs/job_1/fit",
      "http://localhost:3002/api/jobs/job_1/match",
    ]);
    expect(fit.company.id).toBe("co-brightline");
    expect(match).toEqual({ score: 80 });
  });

  it("turns an error body into an ApiError", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { error: { code: "JOB_NOT_FOUND", message: "Job not found" } }));
    await expect(discoveryApi.getMatchResult("job_x")).rejects.toMatchObject({ code: "JOB_NOT_FOUND", status: 404, message: "Job not found" });
  });

  it("reports an unreachable service as SERVICE_UNAVAILABLE", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const error = await discoveryApi.getRecommendations().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("SERVICE_UNAVAILABLE");
  });
});
