import * as z from "zod";

import { estimatorErrorCodes, estimatorErrorCodesByStatus } from "./codes";
import {
  createCodeOnlyErrorResponseSchemas,
  createAnalysisTextSchema,
  localeSchema,
  resultFields,
  sourceTypeSchema,
} from "./common";

export const estimatorSchemaVersion = "1.0" as const;

export function createEstimateRequestSchema(maxTextCodePoints: number) {
  return z.strictObject({
    schemaVersion: z.literal(estimatorSchemaVersion),
    sourceType: sourceTypeSchema,
    text: createAnalysisTextSchema(maxTextCodePoints),
    locale: localeSchema,
  });
}

export const estimateResponseSchema = z.strictObject({
  schemaVersion: z.literal(estimatorSchemaVersion),
  ...resultFields,
});

export const estimatorErrorCodeSchema = z.enum(estimatorErrorCodes);
export const estimatorErrorResponseSchema = z.strictObject({
  error: z.strictObject({
    code: estimatorErrorCodeSchema,
  }),
});

export const estimatorErrorResponseSchemas = createCodeOnlyErrorResponseSchemas(
  estimatorErrorCodesByStatus,
);

export type EstimateRequest = z.infer<
  ReturnType<typeof createEstimateRequestSchema>
>;
export type EstimateResponse = z.infer<typeof estimateResponseSchema>;
export type EstimatorErrorResponse = z.infer<
  typeof estimatorErrorResponseSchema
>;
