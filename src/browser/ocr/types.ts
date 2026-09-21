export interface OcrLimits {
  maxBytes: number;
  maxPixels: number;
  maxWidth: number;
  maxHeight: number;
  timeoutMs: number;
}
export type OcrErrorCode =
  "INVALID_INPUT" | "INPUT_TOO_LARGE" | "EXTRACTION_FAILED" | "REQUEST_TIMEOUT";
export class OcrError extends Error {
  constructor(readonly code: OcrErrorCode) {
    super(code);
  }
}
export function validOcrLimits(limits: OcrLimits): boolean {
  return [
    limits.maxBytes,
    limits.maxPixels,
    limits.maxWidth,
    limits.maxHeight,
    limits.timeoutMs,
  ].every((value) => Number.isSafeInteger(value) && value > 0);
}
