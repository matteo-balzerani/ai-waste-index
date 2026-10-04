import { z } from "zod";

// ADV-ECO-01 wire schemas only; no estimator implementation or coefficients.
export const advancedWarningCodes = ["MODEL_ARCHITECTURE_ASSUMED", "TEXT_ONLY_ESTIMATE"] as const;
const identifier = z.string().min(1).max(200);
export const advancedRequestSchema = z.strictObject({
  provider: identifier, model: identifier,
  outputTokens: z.number().int().min(1).max(1_000_000),
  requestLatencySeconds: z.number().positive().max(3600).optional(),
});
export const advancedEnergySchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("point"), value: z.number().positive() }),
  z.strictObject({ kind: z.literal("range"), low: z.number().positive(), high: z.number().positive() })
    .refine(({ low, high }) => low <= high),
]);
const source = z.strictObject({ name: z.literal("EcoLogits"), version: identifier });
export const advancedResultSchema = z.strictObject({
  methodologyVersion: identifier, source,
  energyWh: advancedEnergySchema,
  durationSource: z.enum(["estimated", "declared"]),
  warnings: z.array(z.enum(advancedWarningCodes)).max(2)
    .refine(values => new Set(values).size === values.length),
});
export const advancedCatalogSchema = z.strictObject({
  methodologyVersion: identifier, source,
  providers: z.array(z.strictObject({ id: identifier, label: identifier,
    models: z.array(identifier).min(1).max(6).refine(values => new Set(values).size === values.length),
  })).min(1).max(6).refine(values => new Set(values.map(v => v.id)).size === values.length),
  limits: z.strictObject({ maxOutputTokens: z.literal(1_000_000), maxDurationSeconds: z.literal(3600) }),
});
export const internalAdvancedRequestSchema = advancedRequestSchema.extend({ schemaVersion: z.literal("1.0") });
export const internalAdvancedResultSchema = advancedResultSchema.extend({ schemaVersion: z.literal("1.0") });
export const internalAdvancedCatalogSchema = advancedCatalogSchema.extend({ schemaVersion: z.literal("1.0") });
export type AdvancedRequest = z.infer<typeof advancedRequestSchema>;
export type AdvancedResult = z.infer<typeof advancedResultSchema>;
export type AdvancedCatalog = z.infer<typeof advancedCatalogSchema>;
