import "server-only";

import * as z from "zod";

const maxTimerMilliseconds = 2_147_483_647;
const placeholderPrefixes = ["replace-me", "changeme", "example", "placeholder"];

const rawEstimatorConfigSchema = z.strictObject({
  ESTIMATOR_BASE_URL: z.string().min(1).max(2_048),
  ESTIMATOR_API_KEY: z.string().min(32).max(1_024),
  ESTIMATOR_TIMEOUT_MS: z.string().min(1),
  MAX_ESTIMATOR_RESPONSE_BYTES: z.string().min(1),
  MAX_ANALYSIS_TEXT_CHARS: z.string().min(1),
});

export interface EstimatorClientConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly timeoutMs: number;
  readonly maxResponseBytes: number;
  readonly maxTextCodePoints: number;
}

export class EstimatorConfigurationError extends Error {
  readonly code = "INVALID_ESTIMATOR_CONFIGURATION";

  constructor() {
    super("INVALID_ESTIMATOR_CONFIGURATION");
    this.name = "EstimatorConfigurationError";
  }
}

function failConfiguration(): never {
  throw new EstimatorConfigurationError();
}

function parsePositiveDecimal(value: string, maximum: number): number {
  if (!/^[1-9]\d*$/.test(value)) {
    return failConfiguration();
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > maximum) {
    return failConfiguration();
  }

  return parsed;
}

function parseBaseUrl(value: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return failConfiguration();
  }

  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username !== "" ||
    url.password !== "" ||
    (url.pathname !== "" && url.pathname !== "/") ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    return failConfiguration();
  }

  return url.origin;
}

function parseApiKey(value: string): string {
  const lowercase = value.toLowerCase();

  if (
    !/^[\x21-\x7e]+$/.test(value) ||
    placeholderPrefixes.some((prefix) => lowercase.startsWith(prefix))
  ) {
    return failConfiguration();
  }

  return value;
}

export function loadEstimatorConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): EstimatorClientConfig {
  const parsed = rawEstimatorConfigSchema.safeParse({
    ESTIMATOR_BASE_URL: environment.ESTIMATOR_BASE_URL,
    ESTIMATOR_API_KEY: environment.ESTIMATOR_API_KEY,
    ESTIMATOR_TIMEOUT_MS: environment.ESTIMATOR_TIMEOUT_MS,
    MAX_ESTIMATOR_RESPONSE_BYTES: environment.MAX_ESTIMATOR_RESPONSE_BYTES,
    MAX_ANALYSIS_TEXT_CHARS: environment.MAX_ANALYSIS_TEXT_CHARS,
  });

  if (!parsed.success) {
    return failConfiguration();
  }

  return Object.freeze({
    baseUrl: parseBaseUrl(parsed.data.ESTIMATOR_BASE_URL),
    apiKey: parseApiKey(parsed.data.ESTIMATOR_API_KEY),
    timeoutMs: parsePositiveDecimal(
      parsed.data.ESTIMATOR_TIMEOUT_MS,
      maxTimerMilliseconds,
    ),
    maxResponseBytes: parsePositiveDecimal(
      parsed.data.MAX_ESTIMATOR_RESPONSE_BYTES,
      Number.MAX_SAFE_INTEGER,
    ),
    maxTextCodePoints: parsePositiveDecimal(
      parsed.data.MAX_ANALYSIS_TEXT_CHARS,
      Number.MAX_SAFE_INTEGER,
    ),
  });
}
