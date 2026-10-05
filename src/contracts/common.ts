import * as z from "zod";

import { locales } from "@/i18n/config";

export const sourceTypeSchema = z.enum(["text", "url", "screenshot"]);
export const localeSchema = z.enum(locales);

function assertPositiveSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`);
  }
}

function hasValidUnicode(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);

    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (!(nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff)) {
        return false;
      }
      index += 1;
      continue;
    }

    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return false;
    }
  }

  return true;
}

export function createAnalysisTextSchema(maxCodePoints: number) {
  assertPositiveSafeInteger(maxCodePoints, "maxCodePoints");

  return z
    .string()
    .refine(hasValidUnicode, { error: "Text must contain valid Unicode" })
    .refine((value) => value.trim().length > 0, { error: "Text must not be blank" })
    .refine((value) => [...value].length <= maxCodePoints, {
      error: "Text exceeds the configured Unicode code-point limit",
    });
}

export const metricEstimateSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("point"), value: z.number().nonnegative() }),
  z.strictObject({ kind: z.literal("range"), low: z.number().nonnegative(), high: z.number().nonnegative() })
    .refine(({ low, high }) => low <= high, { error: "Metric bounds must satisfy low <= high" }),
]);
export const estimatesSchema = z.strictObject({
  energyWh: metricEstimateSchema.refine(m => m.kind === "point" ? m.value > 0 : m.low > 0),
  co2eGrams: metricEstimateSchema, waterMl: metricEstimateSchema,
});
export const resultFields = {
  methodologyVersion: z.string().min(1), scoreVersion: z.string().min(1),
  source: z.strictObject({ name: z.literal("EcoLogits"), version: z.string().min(1) }),
  scenario: z.strictObject({ provider: z.string().min(1), model: z.string().min(1),
    outputTokens: z.number().int().min(1).max(1_000_000), durationSource: z.literal("estimated"),
    tokenSource: z.literal("text-reference") }),
  warnings: z.array(z.enum(["MODEL_ARCHITECTURE_ASSUMED", "TEXT_ONLY_ESTIMATE", "WATER_FACTOR_WORLD_DEFAULT"]))
    .max(3).refine(values => new Set(values).size === values.length),
  score: z.number().int().min(0).max(100), class: z.enum(["A", "B", "C", "D", "E", "F", "G"]),
  estimates: estimatesSchema,
} as const;

export function createCodeOnlyErrorResponseSchema<
  const Codes extends readonly [string, ...string[]],
>(codes: Codes) {
  return z.strictObject({
    error: z.strictObject({
      code: z.enum(codes),
    }),
  });
}

export function createCodeOnlyErrorResponseSchemas<
  const CodesByStatus extends Record<
    number,
    readonly [string, ...string[]]
  >,
>(codesByStatus: CodesByStatus) {
  return Object.fromEntries(
    Object.entries(codesByStatus).map(([status, codes]) => [
      status,
      createCodeOnlyErrorResponseSchema(codes),
    ]),
  ) as unknown as {
    [Status in keyof CodesByStatus]: z.ZodType;
  };
}

export type SourceType = z.infer<typeof sourceTypeSchema>;
export type MetricEstimate = z.infer<typeof metricEstimateSchema>;
