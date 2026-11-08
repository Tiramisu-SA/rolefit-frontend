import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as notificationApi from "./notification";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/lib/auth/supabase", () => ({ supabase: { auth: { getSession } } }));

const fetchMock = vi.fn();

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

describe("notification client", () => {
  it("GETs /api/notifications/mine", async () => {
    const body = { notifications: [], unreadCount: 0 };
    fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }));
    expect(await notificationApi.listMine()).toEqual(body);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8080/api/notifications/mine");
    expect(init.method).toBe("GET");
  });

  it("POSTs /api/notifications/mine/read and accepts 204", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(notificationApi.markAllRead()).resolves.toBeUndefined();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8080/api/notifications/mine/read");
    expect(init.method).toBe("POST");
  });
});
