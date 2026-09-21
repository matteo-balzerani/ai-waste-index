import "server-only";

import type { PublicErrorCode } from "@/contracts";
import type { InputLimits } from "./config";

export class AnalysisHttpError extends Error {
  constructor(
    readonly code: PublicErrorCode,
    readonly status: number,
  ) {
    super(code);
  }
}

export function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" },
  });
}

export async function readJson(
  request: Request,
  limits: InputLimits,
): Promise<unknown> {
  const reader = request.body?.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped: AnalysisHttpError | undefined;
  let rejectStop: (reason: AnalysisHttpError) => void = () => {};
  const interruption = new Promise<never>((_, reject) => {
    rejectStop = reject;
  });
  const stop = () => {
    stopped = new AnalysisHttpError("REQUEST_TIMEOUT", 408);
    rejectStop(stopped);
    void reader?.cancel().catch(() => {});
  };
  try {
    const mediaType = request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      ?.trim()
      .toLowerCase();
    const encoding = request.headers.get("content-encoding");
    if (
      mediaType !== "application/json" ||
      (encoding !== null && encoding.toLowerCase() !== "identity")
    ) {
      throw new AnalysisHttpError("INVALID_INPUT", 400);
    }
    const declared = request.headers.get("content-length");
    if (declared !== null) {
      if (!/^\d+$/.test(declared))
        throw new AnalysisHttpError("INVALID_INPUT", 400);
      if (Number(declared) > limits.maxBodyBytes)
        throw new AnalysisHttpError("INPUT_TOO_LARGE", 413);
    }
    if (!reader) throw new AnalysisHttpError("INVALID_INPUT", 400);
    if (request.signal.aborted)
      throw new AnalysisHttpError("REQUEST_TIMEOUT", 408);
    request.signal.addEventListener("abort", stop, { once: true });
    timer = setTimeout(stop, limits.bodyTimeoutMs);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await Promise.race([reader.read(), interruption]);
      if (stopped) throw stopped;
      if (done) break;
      size += value.byteLength;
      if (size > limits.maxBodyBytes)
        throw new AnalysisHttpError("INPUT_TOO_LARGE", 413);
      chunks.push(value);
    }
    if (declared !== null && Number(declared) !== size)
      throw new AnalysisHttpError("INVALID_INPUT", 400);
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    try {
      return JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      ) as unknown;
    } catch {
      throw new AnalysisHttpError("INVALID_INPUT", 400);
    }
  } catch (error) {
    void reader?.cancel().catch(() => {});
    if (error instanceof AnalysisHttpError) throw error;
    throw new AnalysisHttpError("INVALID_INPUT", 400);
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", stop);
    reader?.releaseLock();
  }
}
