import { describe, expect, it } from "vitest";
import { COMPANY_TAKEN_MESSAGE, signUpErrorMessage } from "./company";

describe("signUpErrorMessage", () => {
  it("explains a recruiter sign-up refused by the database trigger as a taken company name", () => {
    expect(signUpErrorMessage("recruiter", "Database error saving new user")).toBe(COMPANY_TAKEN_MESSAGE);
  });

  it("matches the trigger error regardless of case", () => {
    expect(signUpErrorMessage("recruiter", "database error saving new user")).toBe(COMPANY_TAKEN_MESSAGE);
  });

  it("keeps other errors as Supabase wrote them", () => {
    expect(signUpErrorMessage("recruiter", "User already registered")).toBe("User already registered");
    expect(signUpErrorMessage("recruiter", "Password should be at least 6 characters")).toBe(
      "Password should be at least 6 characters",
    );
  });

  it("does not blame a company name for a job seeker sign-up", () => {
    expect(signUpErrorMessage("seeker", "Database error saving new user")).toBe("Database error saving new user");
  });
});
