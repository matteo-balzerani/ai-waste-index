import { textInputError } from "./types";

export function createTokenCounter(makeWorker = () =>
  new Worker(new URL("./worker.ts", import.meta.url), { type: "module" }),
) {
  return (text: string, signal: AbortSignal): Promise<number> => new Promise((resolve, reject) => {
    if (signal.aborted || textInputError(text)) { reject(new Error("TOKEN_COUNT_UNAVAILABLE")); return; }
    let worker: Worker;
    try { worker = makeWorker(); }
    catch { reject(new Error("TOKEN_COUNT_UNAVAILABLE")); return; }
    let settled = false;
    const finish = (count?: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer); signal.removeEventListener("abort", abort);
      worker.onmessage = null; worker.onerror = null; worker.onmessageerror = null;
      worker.terminate();
      if (count === undefined) reject(new Error("TOKEN_COUNT_UNAVAILABLE"));
      else resolve(count);
    };
    const abort = () => finish();
    const timer = setTimeout(abort, 10_000);
    signal.addEventListener("abort", abort, { once: true });
    worker.onerror = event => { event.preventDefault(); finish(); };
    worker.onmessageerror = abort;
    worker.onmessage = ({ data }: MessageEvent<unknown>) => {
      const count = data && typeof data === "object" ? (data as { count?: unknown }).count : undefined;
      finish(typeof count === "number" && Number.isInteger(count) && count > 0 && count <= 1_000_000 ? count : undefined);
    };
    try { worker.postMessage(text); } catch { finish(); }
  });
}

export const countTokensLocally = createTokenCounter();
