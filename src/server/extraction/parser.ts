import "server-only";
import { Worker } from "node:worker_threads";
import path from "node:path";
import { createAnalysisTextSchema } from "@/contracts";
import { extractionFailed, fetchFailed, tooLarge } from "./errors";
import type { ExtractionConfig } from "./config";
import type { PageResponse } from "./transport";

export type ParsePage = (
  page: PageResponse,
  config: ExtractionConfig,
  signal: AbortSignal,
) => Promise<string>;

type WorkerFactory = (
  filename: string,
  options: ConstructorParameters<typeof Worker>[1],
) => Worker;

export function createPageParser(
  createWorker: WorkerFactory = (filename, options) =>
    new Worker(filename, options),
): ParsePage {
  return async (page, config, signal) => {
    if (signal.aborted) throw fetchFailed();
    return new Promise((resolve, reject) => {
      const worker = createWorker(
        path.join(process.cwd(), ".generated/extraction-parser.cjs"),
        {
          workerData: {
            bytes: page.bytes,
            contentType: page.contentType,
            maxTextCodePoints: config.maxTextCodePoints,
          },
          resourceLimits: {
            maxOldGenerationSizeMb: 64,
            maxYoungGenerationSizeMb: 16,
            stackSizeMb: 4,
          },
          // Do not forward library diagnostics/content to process logs.
          stdout: true,
          stderr: true,
        },
      );
      worker.stdout.resume();
      worker.stderr.resume();
      let settled = false;
      const finish = async (text?: string, error?: Error) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", abort);
        await worker.terminate();
        if (error) reject(error);
        else resolve(text!);
      };
      const abort = () => {
        void finish(undefined, fetchFailed());
      };
      signal.addEventListener("abort", abort, { once: true });
      worker.once("message", (value: unknown) => {
        if (signal.aborted) {
          abort();
          return;
        }
        if (
          typeof value === "object" &&
          value !== null &&
          "text" in value &&
          createAnalysisTextSchema(config.maxTextCodePoints).safeParse(
            value.text,
          ).success
        ) {
          void finish(value.text as string);
        } else if (
          typeof value === "object" &&
          value !== null &&
          "error" in value &&
          value.error === "INPUT_TOO_LARGE"
        ) {
          void finish(undefined, tooLarge());
        } else {
          void finish(undefined, extractionFailed());
        }
      });
      worker.once("error", () => {
        void finish(undefined, extractionFailed());
      });
      worker.once("exit", () => {
        if (!settled) void finish(undefined, extractionFailed());
      });
      if (signal.aborted) abort();
    });
  };
}

export const parsePage = createPageParser();
