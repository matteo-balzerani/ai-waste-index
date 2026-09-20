// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  EstimatorConfigurationError,
  loadEstimatorConfig,
} from "@/server/estimator";

const validEnvironment = {
  ESTIMATOR_BASE_URL: "http://127.0.0.1:8787/",
  ESTIMATOR_API_KEY: "k".repeat(32),
  ESTIMATOR_TIMEOUT_MS: "5000",
  MAX_ESTIMATOR_RESPONSE_BYTES: "65536",
  MAX_ANALYSIS_TEXT_CHARS: "50000",
} as const;

describe("estimator client configuration", () => {
  it("loads, normalizes and freezes explicit server-only configuration", () => {
    const config = loadEstimatorConfig({
      ...validEnvironment,
      UNRELATED_ENVIRONMENT_VALUE: "ignored",
    });

    expect(config).toEqual({
      baseUrl: "http://127.0.0.1:8787",
      apiKey: validEnvironment.ESTIMATOR_API_KEY,
      timeoutMs: 5000,
      maxResponseBytes: 65536,
      maxTextCodePoints: 50000,
    });
    expect(Object.isFrozen(config)).toBe(true);
  });

  it.each(Object.keys(validEnvironment))("rejects missing %s", (name) => {
    const environment: Record<string, string | undefined> = {
      ...validEnvironment,
    };
    delete environment[name];

    expect(() => loadEstimatorConfig(environment)).toThrow(
      EstimatorConfigurationError,
    );
  });

  it.each([
    "not-a-url",
    "ftp://example.test",
    "https://user:password@example.test",
    "https://example.test/service",
    "https://example.test/?query=value",
    "https://example.test/#fragment",
  ])("rejects unsafe or ambiguous base URL %s", (baseUrl) => {
    expect(() =>
      loadEstimatorConfig({
        ...validEnvironment,
        ESTIMATOR_BASE_URL: baseUrl,
      }),
    ).toThrow(EstimatorConfigurationError);
  });

  it.each([
    "short",
    "replace-me-with-a-longer-secret-value",
    `key with whitespace ${"x".repeat(32)}`,
    `non-ascii-${"x".repeat(32)}-è`,
  ])("rejects invalid API key material", (apiKey) => {
    expect(() =>
      loadEstimatorConfig({
        ...validEnvironment,
        ESTIMATOR_API_KEY: apiKey,
      }),
    ).toThrow(EstimatorConfigurationError);
  });

  it.each([
    "0",
    "-1",
    "+1",
    "01",
    "1.5",
    "1e3",
    "Infinity",
    "9007199254740992",
  ])("rejects invalid numeric settings %s", (value) => {
    for (const name of [
      "ESTIMATOR_TIMEOUT_MS",
      "MAX_ESTIMATOR_RESPONSE_BYTES",
      "MAX_ANALYSIS_TEXT_CHARS",
    ]) {
      expect(() =>
        loadEstimatorConfig({
          ...validEnvironment,
          [name]: value,
        }),
      ).toThrow(EstimatorConfigurationError);
    }
  });

  it("does not disclose configuration values in failures", () => {
    const secret = "replace-me-super-secret-value-never-disclose";

    try {
      loadEstimatorConfig({
        ...validEnvironment,
        ESTIMATOR_API_KEY: secret,
      });
      throw new Error("Expected configuration to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(EstimatorConfigurationError);
      expect(String(error)).toBe(
        "EstimatorConfigurationError: INVALID_ESTIMATOR_CONFIGURATION",
      );
      expect(String(error)).not.toContain(secret);
    }
  });
});
