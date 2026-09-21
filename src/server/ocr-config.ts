import "server-only";
import { validOcrLimits, type OcrLimits } from "@/browser/ocr/types";
export function loadOcrLimits(
  env: Record<string, string | undefined> = process.env,
): OcrLimits {
  const limits = {
    maxBytes: Number(env.MAX_SCREENSHOT_BYTES),
    maxPixels: Number(env.MAX_SCREENSHOT_PIXELS),
    maxWidth: Number(env.MAX_SCREENSHOT_WIDTH),
    maxHeight: Number(env.MAX_SCREENSHOT_HEIGHT),
    timeoutMs: Number(env.OCR_TIMEOUT_MS),
  };
  if (!validOcrLimits(limits)) throw new Error("Invalid OCR configuration");
  return limits;
}
