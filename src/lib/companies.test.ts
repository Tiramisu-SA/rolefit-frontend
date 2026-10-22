import { describe, expect, it } from "vitest";
import { companyFor, initialsOf } from "./companies";

describe("companyFor", () => {
  it("returns a known company", () => {
    expect(companyFor("co-brightline").name).toBe("Brightline Analytics");
  });

  it("builds a neutral fallback for an unknown id", () => {
    expect(companyFor("company_001")).toEqual({ id: "company_001", name: "company_001", initials: "CO", color: "#475569" });
  });

  it("turns a readable company id back into a name", () => {
    expect(companyFor("co-acme-corp-7f3a9c")).toEqual({ id: "co-acme-corp-7f3a9c", name: "Acme Corp", initials: "AC", color: "#475569" });
  });

  it("shows a generic name for a company whose name had no Latin letters", () => {
    expect(companyFor("co-company-0a1b2c").name).toBe("Company");
  });

  it("keeps the neutral fallback for ids without the 6-hex suffix", () => {
    expect(companyFor("co-acme").name).toBe("co-acme");
  });
});

describe("initialsOf", () => {
  it("uses the first letters of the first two words", () => {
    expect(initialsOf("Acme Corp")).toBe("AC");
    expect(initialsOf("  brightline  ")).toBe("B");
    expect(initialsOf("บริษัท ไทย")).toBe("บไ");
    expect(initialsOf("")).toBe("?");
  });
});
