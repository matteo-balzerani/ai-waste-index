import { describe, expect, it } from "vitest";

import {
  analyzeErrorCodesByStatus,
  analyzeErrorResponseSchemas,
  createAnalyzeRequestSchema,
  createEstimateRequestSchema,
  createExtractionSuccessSchema,
  estimateResponseSchema,
  estimatorErrorCodes,
  estimatorErrorCodesByStatus,
  estimatorErrorResponseSchema,
  estimatorErrorResponseSchemas,
  estimatorSchemaVersion,
  extractionErrorCodesByStatus,
  extractionErrorResponseSchemas,
  metricEstimateSchema,
  publicErrorCodes,
  publicErrorResponseSchema,
  publicResultSchema,
} from "@/contracts";

// Arbitrary wire-shape fixture only. Its fields intentionally encode no score/class relationship.
function createPublicResultFixture() {
  return {
    methodologyVersion: "contract-test-v1",
    score: 42,
    class: "C",
    estimates: {
      energyWh: { low: 0, value: 1, high: 2 },
      co2eGrams: { low: 3, value: 3, high: 5 },
      waterMl: { low: 8, value: 13, high: 21 },
    },
  };
}

describe("analysis request schema", () => {
  const schema = createAnalyzeRequestSchema(2);

  it("accepts strict supported input and counts Unicode code points", () => {
    expect(
      schema.parse({ sourceType: "text", text: "A😀", locale: "it" }),
    ).toEqual({ sourceType: "text", text: "A😀", locale: "it" });
  });

  it.each([
    { sourceType: "text", text: "   ", locale: "it" },
    { sourceType: "text", text: "ABC", locale: "it" },
    { sourceType: "text", text: "\ud800", locale: "it" },
    { sourceType: "audio", text: "A", locale: "it" },
    { sourceType: "text", text: "A", locale: "fr" },
    { sourceType: "text", text: "A", locale: "it", unexpected: true },
  ])("rejects invalid input %#", (input) => {
    expect(schema.safeParse(input).success).toBe(false);
  });

  it.each([0, -1, 1.5, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    "rejects the invalid configured text limit %s",
    (limit) => {
      expect(() => createAnalyzeRequestSchema(limit)).toThrow(RangeError);
    },
  );
});

describe("metric and public result schemas", () => {
  it("accepts ordered and equal metric bounds", () => {
    expect(metricEstimateSchema.safeParse({ low: 1, value: 1, high: 1 }).success).toBe(
      true,
    );
    expect(metricEstimateSchema.safeParse({ low: 1, value: 2, high: 3 }).success).toBe(
      true,
    );
  });

  it.each([
    { low: 2, value: 1, high: 3 },
    { low: 1, value: 4, high: 3 },
    { low: 3, value: 2, high: 1 },
    { low: -1, value: 0, high: 1 },
    { low: 0, value: Number.NaN, high: 1 },
    { low: 0, value: 1, high: Number.POSITIVE_INFINITY },
    { low: 0, value: 1 },
    { low: 0, value: 1, high: 2, extra: 3 },
  ])("rejects malformed metric bounds %#", (metric) => {
    const before = structuredClone(metric);

    expect(metricEstimateSchema.safeParse(metric).success).toBe(false);
    expect(metric).toEqual(before);
  });

  it("accepts a strict public result", () => {
    expect(publicResultSchema.parse(createPublicResultFixture())).toEqual(
      createPublicResultFixture(),
    );
  });

  it.each([
    { field: "score", value: -1 },
    { field: "score", value: 101 },
    { field: "score", value: 1.5 },
    { field: "class", value: "H" },
    { field: "methodologyVersion", value: "" },
  ])("rejects invalid result $field=$value", ({ field, value }) => {
    const result = {
      ...createPublicResultFixture(),
      [field]: value,
    };

    expect(publicResultSchema.safeParse(result).success).toBe(false);
  });

  it("rejects extra result fields and unordered nested metrics without repair", () => {
    const extra = { ...createPublicResultFixture(), schemaVersion: "1.0" };
    const unordered = structuredClone(createPublicResultFixture());
    unordered.estimates.waterMl.value = 34;
    const before = structuredClone(unordered);

    expect(publicResultSchema.safeParse(extra).success).toBe(false);
    expect(publicResultSchema.safeParse(unordered).success).toBe(false);
    expect(unordered).toEqual(before);
  });
});

describe("extraction success schema", () => {
  const schema = createExtractionSuccessSchema(20);

  it.each([undefined, null, "Page title"])(
    "accepts mandatory confirmation with title %s",
    (title) => {
      const result = {
        text: "Editable text",
        requiresConfirmation: true,
        warnings: ["EXTRACTION_CONFIRMATION_REQUIRED"],
        ...(title === undefined ? {} : { title }),
      };

      expect(schema.safeParse(result).success).toBe(true);
    },
  );

  it.each([
    {
      text: "Editable text",
      requiresConfirmation: false,
      warnings: ["EXTRACTION_CONFIRMATION_REQUIRED"],
    },
    { text: "Editable text", requiresConfirmation: true, warnings: [] },
    {
      text: "Editable text",
      requiresConfirmation: true,
      warnings: ["UNKNOWN_WARNING"],
    },
    {
      text: "Editable text",
      requiresConfirmation: true,
      warnings: ["EXTRACTION_CONFIRMATION_REQUIRED"],
      confidence: 1,
    },
  ])("rejects a nonconforming extraction %#", (result) => {
    expect(schema.safeParse(result).success).toBe(false);
  });
});

describe("estimator wire schemas", () => {
  const requestSchema = createEstimateRequestSchema(20);

  it("accepts a strict, versioned estimator request", () => {
    const request = {
      schemaVersion: estimatorSchemaVersion,
      sourceType: "screenshot",
      text: "Confirmed text",
      locale: "en",
    };

    expect(requestSchema.parse(request)).toEqual(request);
  });

  it.each([
    { schemaVersion: "2.0", sourceType: "text", text: "A", locale: "en" },
    { schemaVersion: "1.0", sourceType: "text", text: " ", locale: "en" },
    {
      schemaVersion: "1.0",
      sourceType: "text",
      text: "A",
      locale: "en",
      originalUrl: "https://example.test",
    },
  ])("rejects an invalid estimator request %#", (request) => {
    expect(requestSchema.safeParse(request).success).toBe(false);
  });

  it("keeps the estimator schema version outside the public result", () => {
    const response = {
      schemaVersion: estimatorSchemaVersion,
      ...createPublicResultFixture(),
    };

    expect(estimateResponseSchema.parse(response)).toEqual(response);
    expect(publicResultSchema.safeParse(response).success).toBe(false);
  });
});

describe("code-only error envelopes", () => {
  it.each(publicErrorCodes)("accepts public code %s", (code) => {
    expect(publicErrorResponseSchema.safeParse({ error: { code } }).success).toBe(
      true,
    );
  });

  it.each(estimatorErrorCodes)("accepts estimator code %s", (code) => {
    expect(estimatorErrorResponseSchema.safeParse({ error: { code } }).success).toBe(
      true,
    );
  });

  it.each([
    { error: { code: "UNKNOWN" } },
    { error: { code: "INVALID_INPUT", message: "localized text" } },
    { error: { code: "INVALID_INPUT" }, extra: true },
  ])("rejects malformed public error %#", (error) => {
    expect(publicErrorResponseSchema.safeParse(error).success).toBe(false);
  });

  function expectStatusAllowLists(
    codesByStatus: Record<string, readonly string[]>,
    schemas: Record<
      string,
      { safeParse: (input: unknown) => { success: boolean } }
    >,
  ) {
    for (const [status, codes] of Object.entries(codesByStatus)) {
      const schema = schemas[status];
      expect(schema).toBeDefined();

      for (const code of codes) {
        expect(schema?.safeParse({ error: { code } }).success).toBe(true);
      }

      expect(schema?.safeParse({ error: { code: "UNKNOWN" } }).success).toBe(false);
    }
  }

  it("enforces every status-specific code allowlist", () => {
    expectStatusAllowLists(analyzeErrorCodesByStatus, analyzeErrorResponseSchemas);
    expectStatusAllowLists(
      extractionErrorCodesByStatus,
      extractionErrorResponseSchemas,
    );
    expectStatusAllowLists(
      estimatorErrorCodesByStatus,
      estimatorErrorResponseSchemas,
    );
  });
});
