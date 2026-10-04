import type { AdvancedCatalog, AdvancedResult } from "@/contracts/advanced";
// Arbitrary contract fixtures, not numerical outputs of a real model.
export const advancedCatalogFixture: AdvancedCatalog = {
  methodologyVersion: "contract-shape-only", source: { name: "EcoLogits", version: "test-version" },
  providers: [{ id: "provider-a", label: "Provider A", models: ["model-a", "model-b"] },
    { id: "provider-b", label: "Provider B", models: ["model-c"] }],
  limits: { maxOutputTokens: 1_000_000, maxDurationSeconds: 3600 },
};
export const advancedResultFixture: AdvancedResult = {
  methodologyVersion: "contract-shape-only", source: { name: "EcoLogits", version: "test-version" },
  energyWh: { kind: "range", low: 0.12, high: 0.34 }, durationSource: "estimated",
  warnings: ["MODEL_ARCHITECTURE_ASSUMED", "TEXT_ONLY_ESTIMATE"],
};
