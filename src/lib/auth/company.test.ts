import { beforeEach, describe, expect, it, vi } from "vitest";
import { isCompanyNameTaken } from "./company";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/auth/supabase", () => ({ supabase: { rpc } }));

beforeEach(() => rpc.mockReset());

describe("isCompanyNameTaken", () => {
  it("asks Supabase whether a recruiter already registered the name", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    await expect(isCompanyNameTaken("Acme Corp")).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith("company_name_taken", { name: "Acme Corp" });
  });

  it("returns false for a free name", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    await expect(isCompanyNameTaken("New Co")).resolves.toBe(false);
  });

  it("throws when the check itself fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "function not found" } });
    await expect(isCompanyNameTaken("Acme Corp")).rejects.toThrow("function not found");
  });
});
