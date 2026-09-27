import { describe, expect, it } from "vitest";
import { companyFor } from "./companies";

describe("companyFor", () => {
  it("returns a known company", () => {
    expect(companyFor("co-brightline").name).toBe("Brightline Analytics");
  });

  it("builds a neutral fallback for an unknown id", () => {
    expect(companyFor("company_001")).toEqual({ id: "company_001", name: "company_001", initials: "CO", color: "#475569" });
  });
});
