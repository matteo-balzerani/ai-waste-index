import "server-only";

import {
  createAnalyzeRequestSchema,
  estimateResponseSchema,
  estimatorErrorResponseSchemas,
  estimatorSchemaVersion,
  publicResultSchema,
  type AnalyzeRequest,
  type PublicResult,
} from "@/contracts";

import type { EstimatorClientConfig } from "./config";
import { EstimatorClientError } from "./errors";

interface EstimatorClientDependencies {
  readonly fetch?: typeof globalThis.fetch;
}

export interface EstimateOptions {
  readonly signal?: AbortSignal;
}

export interface EstimatorClient {
  estimate(input: AnalyzeRequest, options?: EstimateOptions): Promise<PublicResult>;
}

function unavailable(): EstimatorClientError {
  return new EstimatorClientError("ESTIMATOR_UNAVAILABLE", 503);
}

function hasRequiredResponseHeaders(response: Response): boolean {
  const contentType = response.headers.get("content-type");

  return (
    contentType !== null &&
    contentType.split(";", 1)[0]?.trim().toLowerCase() === "application/json" &&
    response.headers.get("cache-control")?.toLowerCase() ===
      "no-store, max-age=0" &&
    response.headers.get("pragma")?.toLowerCase() === "no-cache"
  );
}

function parseDeclaredLength(response: Response): number | null {
  const header = response.headers.get("content-length");
  if (header === null) {
    return null;
  }

  if (!/^\d+$/.test(header)) {
    throw unavailable();
  }

  const parsed = Number(header);
  if (!Number.isSafeInteger(parsed)) {
    throw unavailable();
  }

  return parsed;
}

async function cancelResponseBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // Cancellation is best-effort; the public failure remains deterministic.
  }
}

async function readBoundedBody(
  response: Response,
  maximumBytes: number,
  controller: AbortController,
): Promise<Uint8Array> {
  let declaredLength: number | null;
  try {
    declaredLength = parseDeclaredLength(response);
  } catch (error) {
    controller.abort();
    await cancelResponseBody(response);
    throw error;
  }

  if (declaredLength !== null && declaredLength > maximumBytes) {
    controller.abort();
    await cancelResponseBody(response);
    throw unavailable();
  }

  if (response.body === null) {
    return new Uint8Array();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        controller.abort();
        try {
          await reader.cancel();
        } catch {
          // Cancellation is best-effort; the public failure remains deterministic.
        }
        throw unavailable();
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return body;
}

function decodeJson(body: Uint8Array): unknown {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(body);
    return JSON.parse(text) as unknown;
  } catch {
    throw unavailable();
  }
}

function mapEstimatorError(status: number, body: unknown): never {
  const schema =
    estimatorErrorResponseSchemas[
      status as keyof typeof estimatorErrorResponseSchemas
    ];
  if (schema === undefined || !schema.safeParse(body).success) {
    throw unavailable();
  }

  if (status === 400) {
    throw new EstimatorClientError("INVALID_INPUT", 400);
  }
  if (status === 413) {
    throw new EstimatorClientError("INPUT_TOO_LARGE", 413);
  }

  throw unavailable();
}

function validateInput(
  input: AnalyzeRequest,
  maximumTextCodePoints: number,
): AnalyzeRequest {
  const parsed = createAnalyzeRequestSchema(maximumTextCodePoints).safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  if (
    typeof input === "object" &&
    input !== null &&
    "text" in input &&
    typeof input.text === "string" &&
    [...input.text].length > maximumTextCodePoints
  ) {
    throw new EstimatorClientError("INPUT_TOO_LARGE", 413);
  }

  throw new EstimatorClientError("INVALID_INPUT", 400);
}

export function createEstimatorClient(
  config: EstimatorClientConfig,
  dependencies: EstimatorClientDependencies = {},
): EstimatorClient {
  const fetchImplementation = dependencies.fetch ?? globalThis.fetch;
  const endpoint = new URL("/internal/v1/estimate", config.baseUrl);

  return Object.freeze({
    async estimate(
      input: AnalyzeRequest,
      options: EstimateOptions = {},
    ): Promise<PublicResult> {
      const validatedInput = validateInput(input, config.maxTextCodePoints);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
      const abortFromCaller = () => controller.abort();

      if (options.signal?.aborted) {
        controller.abort();
      } else {
        options.signal?.addEventListener("abort", abortFromCaller, { once: true });
      }

      try {
        const response = await fetchImplementation(endpoint, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Estimator-Key": config.apiKey,
          },
          body: JSON.stringify({
            schemaVersion: estimatorSchemaVersion,
            ...validatedInput,
          }),
          cache: "no-store",
          // Never forward confirmed text or the service credential to a Location
          // destination, including a different path on the configured origin.
          redirect: "error",
          signal: controller.signal,
        });

        if (!hasRequiredResponseHeaders(response)) {
          controller.abort();
          await cancelResponseBody(response);
          throw unavailable();
        }

        const body = decodeJson(
          await readBoundedBody(response, config.maxResponseBytes, controller),
        );

        if (response.status !== 200) {
          return mapEstimatorError(response.status, body);
        }

        const parsed = estimateResponseSchema.safeParse(body);
        if (!parsed.success) {
          throw unavailable();
        }

        return publicResultSchema.parse({
          methodologyVersion: parsed.data.methodologyVersion,
          score: parsed.data.score,
          class: parsed.data.class,
          estimates: parsed.data.estimates,
        });
      } catch (error) {
        if (error instanceof EstimatorClientError) {
          throw error;
        }
        throw unavailable();
      } finally {
        clearTimeout(timeout);
        options.signal?.removeEventListener("abort", abortFromCaller);
      }
    },
  });
}
