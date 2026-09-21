import * as z from "zod";

import {
  analyzeErrorCodesByStatus,
  extractionErrorCodesByStatus,
  extractionWarningCodes,
  publicErrorCodes,
} from "./codes";
import {
  createCodeOnlyErrorResponseSchemas,
  createAnalysisTextSchema,
  localeSchema,
  resultFields,
  sourceTypeSchema,
} from "./common";

export function createAnalyzeRequestSchema(maxTextCodePoints: number) {
  return z.strictObject({
    sourceType: sourceTypeSchema,
    text: createAnalysisTextSchema(maxTextCodePoints),
    locale: localeSchema,
  });
}

export function createExtractionRequestSchema(maxUrlChars: number) {
  if (!Number.isSafeInteger(maxUrlChars) || maxUrlChars <= 0)
    throw new RangeError("Invalid URL limit");
  return z.strictObject({
    url: z
      .string()
      .min(1)
      .refine((value) => [...value].length <= maxUrlChars)
      .refine((value) => {
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      }),
  });
}

export const publicResultSchema = z.strictObject(resultFields);

export function createExtractionSuccessSchema(maxTextCodePoints: number) {
  return z.strictObject({
    text: createAnalysisTextSchema(maxTextCodePoints),
    title: z.string().nullable().optional(),
    requiresConfirmation: z.literal(true),
    warnings: z.tuple([z.literal(extractionWarningCodes[0])]),
  });
}

export const publicErrorCodeSchema = z.enum(publicErrorCodes);
export const publicErrorResponseSchema = z.strictObject({
  error: z.strictObject({
    code: publicErrorCodeSchema,
  }),
});

export const analyzeErrorResponseSchemas = createCodeOnlyErrorResponseSchemas(
  analyzeErrorCodesByStatus,
);

export const extractionErrorResponseSchemas =
  createCodeOnlyErrorResponseSchemas(extractionErrorCodesByStatus);

export type AnalyzeRequest = z.infer<
  ReturnType<typeof createAnalyzeRequestSchema>
>;
export type PublicResult = z.infer<typeof publicResultSchema>;
export type ExtractionSuccess = z.infer<
  ReturnType<typeof createExtractionSuccessSchema>
>;
export type PublicErrorResponse = z.infer<typeof publicErrorResponseSchema>;
