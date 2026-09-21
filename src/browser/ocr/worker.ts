import {
  dispatchHandlers,
  setAdapter,
} from "tesseract.js/src/worker-script/index.js";
import getCore from "tesseract.js/src/worker-script/browser/getCore.js";
import gunzip from "tesseract.js/src/worker-script/browser/gunzip.js";
import { inspectImage, validateDimensions, validateFile } from "./image";
import { OcrError, validOcrLimits, type OcrLimits } from "./types";

// One directly owned worker for validation, decoding, loading and recognition.
// No nested worker: terminate() stops even synchronous WASM or initialization.
const scope = globalThis as unknown as {
  onmessage:
    ((event: MessageEvent<{ file: File; limits: OcrLimits }>) => void) | null;
  postMessage: (value: unknown) => void;
};
// Third-party decoder diagnostics must never disclose image data/metadata.
for (const method of ["log", "warn", "error", "info", "debug"] as const)
  console[method] = () => {};
// No cache adapter is supplied: cacheMethod=none forbids IndexedDB reads/writes.
setAdapter({ getCore, gunzip });
function job(
  action: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    dispatchHandlers(
      { workerId: "ocr", jobId: action, action, payload },
      (message) => {
        if (message.status === "resolve") resolve(message.data);
        else if (message.status === "reject")
          reject(new OcrError("EXTRACTION_FAILED"));
        else if (message.status === "progress" && action === "recognize") {
          const data = message.data as { progress?: unknown };
          if (
            typeof data.progress === "number" &&
            Number.isFinite(data.progress)
          )
            scope.postMessage({
              type: "progress",
              value: Math.min(1, Math.max(0, data.progress)),
            });
        }
      },
    );
  });
}
let started = false;
scope.onmessage = async ({ data: { file, limits } }) => {
  if (started) return;
  started = true;
  try {
    if (!validOcrLimits(limits)) throw new OcrError("INVALID_INPUT");
    validateFile(file, limits);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const dimensions = inspectImage(bytes, file.type, limits);
    // Decode inside this terminable worker, then release the bitmap before OCR.
    const bitmap = await createImageBitmap(file, { imageOrientation: "none" });
    try {
      validateDimensions(bitmap.width, bitmap.height, limits);
      if (bitmap.width * bitmap.height !== dimensions.width * dimensions.height)
        throw new OcrError("INVALID_INPUT");
    } finally {
      bitmap.close();
    }
    await job("load", {
      options: {
        lstmOnly: true,
        corePath: "/ocr/tesseract-core-lstm.wasm.js",
        logging: false,
      },
    });
    await job("loadLanguage", {
      langs: ["eng", "ita"],
      options: {
        langPath: "/ocr",
        cacheMethod: "none",
        gzip: true,
        lstmOnly: true,
      },
    });
    await job("initialize", { langs: "eng+ita", oem: 1, config: {} });
    const result = (await job("recognize", {
      image: bytes,
      options: {},
      output: { text: true },
    })) as { text?: unknown };
    if (typeof result.text !== "string")
      throw new OcrError("EXTRACTION_FAILED");
    scope.postMessage({ type: "success", text: result.text });
  } catch (error) {
    scope.postMessage({
      type: "error",
      code: error instanceof OcrError ? error.code : "EXTRACTION_FAILED",
    });
  }
};
