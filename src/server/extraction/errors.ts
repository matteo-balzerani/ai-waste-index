import "server-only";
import { AnalysisHttpError } from "@/server/analysis/http";

export function blocked() {
  return new AnalysisHttpError("URL_BLOCKED", 403);
}
export function fetchFailed() {
  return new AnalysisHttpError("URL_FETCH_FAILED", 504);
}
export function extractionFailed() {
  return new AnalysisHttpError("EXTRACTION_FAILED", 422);
}
export function tooLarge() {
  return new AnalysisHttpError("INPUT_TOO_LARGE", 413);
}
