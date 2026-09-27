import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as profileApi from "./candidate-profile";
import { ApiError } from "./errors";

const USER = "3f1c2b7e-9a4d-4c1e-8b2a-5d6e7f809a1b";
const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_CANDIDATE_PROFILE_API_URL", "http://localhost:3001");
  vi.stubEnv("NEXT_PUBLIC_DEV_SEEKER_USER_ID", USER);
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("candidate profile client", () => {
  it("sends X-User-Id and parses the JSON response", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { id: "p1", name: "Pim" }));
    const profile = await profileApi.getProfile();
    expect(profile).toEqual({ id: "p1", name: "Pim" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:3001/api/profiles/me");
    expect(new Headers(init.headers).get("X-User-Id")).toBe(USER);
  });

  it("returns null from getProfile when there is no profile yet", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { error: { code: "PROFILE_NOT_FOUND", message: "Profile not found" } }));
    expect(await profileApi.getProfile()).toBeNull();
  });

  it("turns an error body into an ApiError with field errors", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        error: { code: "VALIDATION_ERROR", message: "Some fields are invalid", details: [{ field: "name", message: "Is required" }] },
      }),
    );
    await expect(profileApi.createProfile({ name: "" })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
      fieldErrors: [{ field: "name", message: "Is required" }],
    });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ name: "" });
  });

  it("reports SERVICE_UNAVAILABLE when the service cannot be reached", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const error = await profileApi.getProfile().catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "SERVICE_UNAVAILABLE", message: "Can't reach the profile service. Please try again." });
  });

  it("resolves 204 responses to undefined", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(profileApi.deleteSkill("s1")).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:3001/api/profiles/me/skills/s1");
    expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
  });

  it("uploads a .docx with an empty file.type using the DOCX content type and an encoded file name", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { fileName: "ประวัติ.docx", profile: { name: "Pim" } }));
    const file = new File(["PK"], "ประวัติ.docx", { type: "" });
    const result = await profileApi.importResume(file);
    expect(result.fileName).toBe("ประวัติ.docx");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:3001/api/profiles/me/import-resume");
    const headers = new Headers(init.headers);
    expect(headers.get("Content-Type")).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(headers.get("X-File-Name")).toBe(encodeURIComponent("ประวัติ.docx"));
    expect(init.body).toBe(file);
  });

  it("fails with a clear message when the service URL is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_CANDIDATE_PROFILE_API_URL", "");
    await expect(profileApi.getProfile()).rejects.toMatchObject({ code: "CONFIG_ERROR" });
  });
});
