import { describe, expect, it } from "vitest";

import { normalizeErrorEnvelope } from "@/lib/api/errors";

describe("normalizeErrorEnvelope", () => {
  it("extracts backend error fields", () => {
    const normalized = normalizeErrorEnvelope(
      400,
      {
        success: false,
        error: {
          code: "validation_error",
          message: "Missing keyword",
          request_id: "rid-123",
        },
      },
      "fallback-id"
    );

    expect(normalized.status).toBe(400);
    expect(normalized.code).toBe("validation_error");
    expect(normalized.message).toBe("Missing keyword");
    expect(normalized.requestId).toBe("rid-123");
  });

  it("falls back when payload is not an error envelope", () => {
    const normalized = normalizeErrorEnvelope(401, "Unauthorized", "rid-abc");

    expect(normalized.status).toBe(401);
    expect(normalized.code).toBe("unauthorized");
    expect(normalized.message).toBe("Authentication required");
    expect(normalized.requestId).toBe("rid-abc");
  });
});
