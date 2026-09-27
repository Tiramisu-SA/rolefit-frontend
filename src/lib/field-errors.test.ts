import { describe, expect, it } from "vitest";
import { scopeErrors } from "./field-errors";

describe("scopeErrors", () => {
  const errors = [
    { field: "name", message: "Is required" },
    { field: "links[1]", message: "Must be an http or https URL" },
    { field: "experience[1].endDate", message: "Cannot be before the start date" },
    { field: "experience[1].bullets[3]", message: "Too long" },
    { field: "experience[0].jobTitle", message: "Is required" },
    { field: "preferences.employmentTypes", message: "Choose at least one" },
  ];

  it("keys top-level errors by field, folding list indexes into the list name", () => {
    expect(scopeErrors(errors)).toEqual({ name: "Is required", links: "Must be an http or https URL" });
  });

  it("scopes errors under a prefix", () => {
    expect(scopeErrors(errors, "experience[1].")).toEqual({ endDate: "Cannot be before the start date", bullets: "Too long" });
    expect(scopeErrors(errors, "preferences.")).toEqual({ employmentTypes: "Choose at least one" });
  });

  it("returns an empty object for no errors", () => {
    expect(scopeErrors(undefined)).toEqual({});
  });
});
