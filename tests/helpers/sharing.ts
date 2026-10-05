import type { PublicResult } from "@/contracts";
// Arbitrary contract fixture, unrelated to any estimator implementation or methodology.
export const sharingFixture: PublicResult = {
  score: 23,
  class: "G",
  methodologyVersion: "stub-sharing-fixture",
  scoreVersion: "fixture-score", source: { name: "EcoLogits" as const, version: "fixture-only" },
  scenario: { provider: "fixture", model: "fixture", outputTokens: 25, durationSource: "estimated" as const, tokenSource: "text-reference" as const }, warnings: [],
  estimates: {
    energyWh: { kind: "range" as const, low: 0.1, high: 3 },
    co2eGrams: { kind: "point" as const, value: 0 },
    waterMl: { kind: "range" as const, low: 1, high: 3 },
  },
};
