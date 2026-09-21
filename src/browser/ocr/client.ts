import { createAnalysisTextSchema } from "@/contracts";
import { validateFile } from "./image";
import { OcrError, validOcrLimits, type OcrLimits } from "./types";

type Options = {
  limits: OcrLimits;
  maxTextCodePoints: number;
  signal: AbortSignal;
  onProgress: (value: number) => void;
};
export function createScreenshotRecognizer(
  makeWorker = () => new Worker("/ocr/worker.js"),
) {
  return (
    file: File,
    { limits, maxTextCodePoints, signal, onProgress }: Options,
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      if (!validOcrLimits(limits)) {
        reject(new OcrError("INVALID_INPUT"));
        return;
      }
      try {
        validateFile(file, limits);
      } catch (error) {
        reject(error);
        return;
      }
      let worker: Worker;
      try {
        worker = makeWorker();
      } catch {
        reject(new OcrError("EXTRACTION_FAILED"));
        return;
      }
      let settled = false;
      const finish = (error?: Error, text?: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal.removeEventListener("abort", abort);
        worker.onmessage = null;
        worker.onerror = null;
        worker.onmessageerror = null;
        worker.terminate();
        if (error) reject(error);
        else resolve(text!);
      };
      const abort = () => finish(new DOMException("Aborted", "AbortError"));
      const timer = setTimeout(
        () => finish(new OcrError("REQUEST_TIMEOUT")),
        limits.timeoutMs,
      );
      signal.addEventListener("abort", abort, { once: true });
      worker.onerror = (event) => {
        event.preventDefault();
        finish(new OcrError("EXTRACTION_FAILED"));
      };
      worker.onmessageerror = () => finish(new OcrError("EXTRACTION_FAILED"));
      worker.onmessage = ({ data }: MessageEvent<unknown>) => {
        if (!data || typeof data !== "object") {
          finish(new OcrError("EXTRACTION_FAILED"));
          return;
        }
        const message = data as Record<string, unknown>;
        if (message.type === "progress") {
          if (
            typeof message.value === "number" &&
            Number.isFinite(message.value)
          )
            onProgress(Math.min(1, Math.max(0, message.value)));
        } else if (
          message.type === "success" &&
          typeof message.text === "string"
        ) {
          const text = message.text.trim();
          if (
            !createAnalysisTextSchema(maxTextCodePoints).safeParse(text).success
          )
            finish(
              new OcrError(
                [...text].length > maxTextCodePoints
                  ? "INPUT_TOO_LARGE"
                  : "EXTRACTION_FAILED",
              ),
            );
          else finish(undefined, text);
        } else if (message.type === "error") {
          finish(
            new OcrError(
              message.code === "INPUT_TOO_LARGE" ||
                message.code === "INVALID_INPUT"
                ? message.code
                : "EXTRACTION_FAILED",
            ),
          );
        } else finish(new OcrError("EXTRACTION_FAILED"));
      };
      try {
        worker.postMessage({ file, limits });
      } catch {
        finish(new OcrError("EXTRACTION_FAILED"));
      }
    });
  };
}
export const recognizeScreenshot = createScreenshotRecognizer();
