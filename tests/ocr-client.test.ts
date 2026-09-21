import { afterEach, describe, expect, it, vi } from "vitest";
import { createScreenshotRecognizer } from "@/browser/ocr/client";
class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  send(data: unknown) {
    this.onmessage?.({ data } as MessageEvent);
  }
}
const limits = {
  maxBytes: 100,
  maxWidth: 100,
  maxHeight: 100,
  maxPixels: 10000,
  timeoutMs: 25,
};
function setup() {
  const worker = new FakeWorker(),
    make = vi.fn(() => worker as unknown as Worker);
  const controller = new AbortController(),
    progress = vi.fn();
  const run = createScreenshotRecognizer(make);
  const options = {
    limits,
    maxTextCodePoints: 30,
    signal: controller.signal,
    onProgress: progress,
  };
  return { worker, make, controller, progress, run, options };
}
const file = () =>
  new File(["synthetic"], "not-forwarded.png", { type: "image/png" });
afterEach(() => vi.useRealTimers());
describe("direct ownership of the OCR worker", () => {
  it("sends only to a worker and terminates before returning usable text", async () => {
    const { worker, run, options, progress } = setup();
    const promise = run(file(), options);
    expect(worker.postMessage).toHaveBeenCalledWith({
      file: expect.any(File),
      limits,
    });
    worker.send({ type: "progress", value: 0.5 });
    expect(progress).toHaveBeenCalledWith(0.5);
    worker.send({ type: "success", text: " Testo locale 👋 \n" });
    expect(worker.terminate).toHaveBeenCalledOnce();
    await expect(promise).resolves.toBe("Testo locale 👋");
  });
  it.each(["", "  \n", "\ud800", "a".repeat(31)])(
    "rejects unusable/oversize OCR text without truncation",
    async (text) => {
      const { worker, run, options } = setup();
      const promise = run(file(), options);
      worker.send({ type: "success", text });
      await expect(promise).rejects.toThrow(
        text.length > 30 ? "INPUT_TOO_LARGE" : "EXTRACTION_FAILED",
      );
      expect(worker.terminate).toHaveBeenCalledOnce();
    },
  );
  it.each(["initialization", "recognition"])(
    "timeout terminates actual owned worker during %s",
    async (stage) => {
      vi.useFakeTimers();
      const { worker, run, options } = setup();
      const promise = run(file(), options);
      if (stage === "recognition")
        worker.send({ type: "progress", value: 0.1 });
      const rejected = expect(promise).rejects.toThrow("REQUEST_TIMEOUT");
      await vi.advanceTimersByTimeAsync(26);
      await rejected;
      expect(worker.terminate).toHaveBeenCalledOnce();
      expect(worker.onmessage).toBeNull();
    },
  );
  it("abort terminates immediately and detaches callbacks", async () => {
    const { worker, run, options, controller } = setup();
    const promise = run(file(), options);
    controller.abort();
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(worker.onmessage).toBeNull();
  });
  it("does not start a worker for invalid files or already cancelled work", async () => {
    const { make, run, options, controller } = setup();
    await expect(
      run(new File(["svg"], "x", { type: "image/svg+xml" }), options),
    ).rejects.toThrow("INVALID_INPUT");
    await expect(
      run(new File(["a".repeat(101)], "x", { type: "image/png" }), options),
    ).rejects.toThrow("INPUT_TOO_LARGE");
    controller.abort();
    await expect(run(file(), options)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(make).not.toHaveBeenCalled();
  });
  it.each([
    null,
    {},
    { type: "success", text: 4 },
    { type: "error", code: "private image detail" },
  ])("maps malformed/unsafe worker messages to a safe error", async (data) => {
    const { worker, run, options } = setup();
    const promise = run(file(), options);
    worker.send(data);
    await expect(promise).rejects.toThrow("EXTRACTION_FAILED");
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it("suppresses raw worker error events", async () => {
    const { worker, run, options } = setup();
    const promise = run(file(), options);
    const preventDefault = vi.fn();
    worker.onerror?.({ preventDefault } as unknown as ErrorEvent);
    await expect(promise).rejects.toThrow("EXTRACTION_FAILED");
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
