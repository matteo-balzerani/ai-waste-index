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

const nonNegativeFiniteNumberSchema = z.number().min(0);

export const metricEstimateSchema = z
  .strictObject({
    low: nonNegativeFiniteNumberSchema,
    value: nonNegativeFiniteNumberSchema,
    high: nonNegativeFiniteNumberSchema,
  })
  .refine(
    ({ low, value, high }) => low <= value && value <= high,
    { error: "Metric bounds must satisfy low <= value <= high" },
  );

export const estimatesSchema = z.strictObject({
  energyWh: metricEstimateSchema,
  co2eGrams: metricEstimateSchema,
  waterMl: metricEstimateSchema,
});

export const resultFields = {
  methodologyVersion: z.string().min(1),
  score: z.number().int().min(0).max(100),
  class: z.enum(["A", "B", "C", "D", "E", "F", "G"]),
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
