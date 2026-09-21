import "server-only";

import { createAnalyzeRequestSchema, publicResultSchema } from "@/contracts";
import { createEstimatorClient } from "@/server/estimator/client";
import { loadEstimatorConfig } from "@/server/estimator/config";
import { EstimatorClientError } from "@/server/estimator/errors";
import { admitLocalDemo } from "./admission";
import { loadInputLimits } from "./config";
import { AnalysisHttpError, jsonResponse, readJson } from "./http";

export function createAnalysisHandler(
  dependencies: {
    environment?: Readonly<Record<string, string | undefined>>;
    fetch?: typeof globalThis.fetch;
  } = {},
) {
  return async function analyze(request: Request): Promise<Response> {
    try {
      const environment = dependencies.environment ?? process.env;
      admitLocalDemo(environment);
      const limits = loadInputLimits(environment);
      const config = loadEstimatorConfig(environment);
      // Local demo must not accidentally invoke a remote estimator.
      if (!["127.0.0.1", "[::1]"].includes(new URL(config.baseUrl).hostname)) {
        throw new AnalysisHttpError("GUARD_UNAVAILABLE", 503);
      }
      const body = await readJson(request, limits);
      const parsed = createAnalyzeRequestSchema(
        limits.maxTextCodePoints,
      ).safeParse(body);
      if (!parsed.success) {
        if (
          typeof body === "object" &&
          body !== null &&
          "text" in body &&
          typeof body.text === "string" &&
          [...body.text].length > limits.maxTextCodePoints
        ) {
          throw new AnalysisHttpError("INPUT_TOO_LARGE", 413);
        }
        throw new AnalysisHttpError("INVALID_INPUT", 400);
      }
      if (request.signal.aborted)
        throw new AnalysisHttpError("REQUEST_TIMEOUT", 408);
      const client = createEstimatorClient(config, {
        fetch: dependencies.fetch,
      });
      const result = await client.estimate(parsed.data, {
        signal: request.signal,
      });
      return jsonResponse(publicResultSchema.parse(result));
    } catch (error) {
      // Cancel unconsumed input, including admission/configuration rejection.
      if (!request.body?.locked) void request.body?.cancel().catch(() => {});
      if (
        error instanceof AnalysisHttpError ||
        error instanceof EstimatorClientError
      ) {
        return jsonResponse({ error: { code: error.code } }, error.status);
      }
      return jsonResponse({ error: { code: "INTERNAL_ERROR" } }, 500);
    }
  };
}
