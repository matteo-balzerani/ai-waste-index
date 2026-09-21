import "server-only";
import { loadInputLimits, type InputLimits } from "@/server/analysis/config";

export interface ExtractionConfig extends InputLimits {
  readonly maxUrlChars: number;
  readonly maxResponseBytes: number;
  readonly maxDecodedBytes: number;
  readonly maxHeaderBytes: number;
  readonly connectTimeoutMs: number;
  readonly fetchTimeoutMs: number;
  readonly maxRedirects: number;
}

export function loadExtractionConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
): ExtractionConfig {
  const limits = loadInputLimits(env);
  function integer(name: string, maximum = 2_147_483_647): number {
    const raw = env[name] ?? "";
    const value = Number(raw);
    if (
      !/^(0|[1-9]\d*)$/.test(raw) ||
      !Number.isSafeInteger(value) ||
      value > maximum ||
      value < 1
    ) {
      throw new Error("INVALID_EXTRACTION_CONFIGURATION");
    }
    return value;
  }
  const config = {
    ...limits,
    maxUrlChars: integer("MAX_URL_CHARS"),
    maxResponseBytes: integer("MAX_URL_RESPONSE_BYTES"),
    maxDecodedBytes: integer("MAX_URL_DECODED_BYTES"),
    maxHeaderBytes: integer("MAX_URL_RESPONSE_HEADER_BYTES"),
    connectTimeoutMs: integer("URL_CONNECT_TIMEOUT_MS"),
    fetchTimeoutMs: integer("URL_FETCH_TIMEOUT_MS"),
    maxRedirects: integer("URL_MAX_REDIRECTS", 100),
  };
  if (
    config.connectTimeoutMs > config.fetchTimeoutMs ||
    limits.maxBodyBytes < config.maxUrlChars * 6 + 32
  ) {
    throw new Error("INVALID_EXTRACTION_CONFIGURATION");
  }
  return Object.freeze(config);
}
