import "server-only";

export interface InputLimits {
  readonly maxTextCodePoints: number;
  readonly maxBodyBytes: number;
  readonly bodyTimeoutMs: number;
}

export function loadInputLimits(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): InputLimits {
  function positive(name: string, maximum = Number.MAX_SAFE_INTEGER): number {
    const raw = environment[name] ?? "";
    const value = Number(raw);
    if (
      !/^[1-9]\d*$/.test(raw) ||
      !Number.isSafeInteger(value) ||
      value > maximum
    ) {
      throw new Error("INVALID_INPUT_CONFIGURATION");
    }
    return value;
  }
  const maxTextCodePoints = positive("MAX_ANALYSIS_TEXT_CHARS");
  const maxBodyBytes = positive("MAX_REQUEST_BODY_BYTES");
  const bodyTimeoutMs = positive("REQUEST_BODY_TIMEOUT_MS", 2_147_483_647);
  // Worst case: a supplementary code point serialized as two escaped surrogates.
  if (maxBodyBytes < maxTextCodePoints * 12 + 256) {
    throw new Error("INVALID_INPUT_CONFIGURATION");
  }
  return Object.freeze({ maxTextCodePoints, maxBodyBytes, bodyTimeoutMs });
}
