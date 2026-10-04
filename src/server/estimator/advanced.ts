import "server-only";
import {
  advancedCatalogSchema, advancedRequestSchema, advancedResultSchema,
  internalAdvancedCatalogSchema, internalAdvancedResultSchema,
} from "@/contracts/advanced";
import { admitLocalDemo } from "@/server/analysis/admission";
import { loadInputLimits } from "@/server/analysis/config";
import { AnalysisHttpError, jsonResponse, readJson } from "@/server/analysis/http";
import { loadEstimatorConfig } from "./config";
import { EstimatorClientError } from "./errors";
import { hasRequiredResponseHeaders, readBoundedBody, decodeJson, mapEstimatorError } from "./client";

export function createAdvancedHandler(operation: "models" | "estimate", dependencies: {
  environment?: Readonly<Record<string, string | undefined>>; fetch?: typeof globalThis.fetch;
} = {}) {
  return async (request: Request): Promise<Response> => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const abort = () => controller.abort();
    try {
      const env = dependencies.environment ?? process.env;
      admitLocalDemo(env);
      const config = loadEstimatorConfig(env);
      if (!["127.0.0.1", "[::1]"].includes(new URL(config.baseUrl).hostname)) {
        throw new AnalysisHttpError("GUARD_UNAVAILABLE", 503);
      }
      let body: string | undefined;
      let durationSource: "estimated" | "declared" | undefined;
      if (operation === "estimate") {
        const raw = await readJson(request, { ...loadInputLimits(env), maxBodyBytes: 4096 });
        const parsed = advancedRequestSchema.safeParse(raw);
        if (!parsed.success) throw new AnalysisHttpError("INVALID_INPUT", 400);
        durationSource = parsed.data.requestLatencySeconds === undefined ? "estimated" : "declared";
        body = JSON.stringify({ schemaVersion: "1.0", ...parsed.data });
      }
      if (request.signal.aborted) throw new AnalysisHttpError("REQUEST_TIMEOUT", 408);
      request.signal.addEventListener("abort", abort, { once: true });
      timer = setTimeout(abort, config.timeoutMs);
      const response = await (dependencies.fetch ?? globalThis.fetch)(
        new URL(`/internal/v1/advanced/${operation}`, config.baseUrl), {
          method: operation === "models" ? "GET" : "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json", "X-Estimator-Key": config.apiKey },
          body, cache: "no-store", redirect: "error", signal: controller.signal,
        });
      if (!hasRequiredResponseHeaders(response)) {
        controller.abort();
        await response.body?.cancel();
        throw new EstimatorClientError("ESTIMATOR_UNAVAILABLE", 503);
      }
      const raw = decodeJson(await readBoundedBody(response, Math.min(config.maxResponseBytes, 65_536), controller));
      if (response.status !== 200) mapEstimatorError(response.status, raw);
      if (controller.signal.aborted) throw new EstimatorClientError("ESTIMATOR_UNAVAILABLE", 503);
      if (operation === "models") {
        const parsed = internalAdvancedCatalogSchema.safeParse(raw);
        if (!parsed.success) throw new EstimatorClientError("ESTIMATOR_UNAVAILABLE", 503);
        const { schemaVersion, ...result } = parsed.data;
        void schemaVersion;
        return jsonResponse(advancedCatalogSchema.parse(result));
      }
      const parsed = internalAdvancedResultSchema.safeParse(raw);
      if (!parsed.success || parsed.data.durationSource !== durationSource) throw new EstimatorClientError("ESTIMATOR_UNAVAILABLE", 503);
      const { schemaVersion, ...result } = parsed.data;
      void schemaVersion;
      return jsonResponse(advancedResultSchema.parse(result));
    } catch (error) {
      controller.abort();
      if (!request.body?.locked) void request.body?.cancel().catch(() => {});
      if (error instanceof AnalysisHttpError || error instanceof EstimatorClientError) {
        return jsonResponse({ error: { code: error.code } }, error.status);
      }
      return jsonResponse({ error: { code: "ESTIMATOR_UNAVAILABLE" } }, 503);
    } finally {
      clearTimeout(timer);
      request.signal.removeEventListener("abort", abort);
    }
  };
}
