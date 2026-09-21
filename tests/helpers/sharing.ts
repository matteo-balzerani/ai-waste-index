import type { PublicResult } from "@/contracts";
// Arbitrary contract fixture, unrelated to any estimator implementation or methodology.
export const sharingFixture: PublicResult = {
  score: 23,
  class: "G",
  methodologyVersion: "stub-sharing-fixture",
  estimates: {
    energyWh: { low: 0.1, value: 1.25, high: 3 },
    co2eGrams: { low: 0, value: 0, high: 0 },
    waterMl: { low: 1, value: 2, high: 3 },
  },
};
