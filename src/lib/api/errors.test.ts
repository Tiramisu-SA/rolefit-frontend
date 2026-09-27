import { describe, expect, it } from "vitest";
import { ApiError, unwrap, type ActionResult } from "./errors";

describe("unwrap", () => {
  it("returns the data of a successful result", () => {
    expect(unwrap({ ok: true, data: 42 })).toBe(42);
  });

  it("throws an ApiError that keeps code, message, status and field errors", () => {
    const original = new ApiError("VALIDATION_ERROR", "title: Is required", 400, [{ field: "title", message: "Is required" }]);
    // What crosses the Server Action boundary is plain JSON.
    const result = JSON.parse(JSON.stringify({ ok: false, error: original.toJSON() })) as ActionResult<number>;
    try {
      unwrap(result);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect(e).toMatchObject({ code: "VALIDATION_ERROR", message: "title: Is required", status: 400, fieldErrors: [{ field: "title", message: "Is required" }] });
    }
  });
});
