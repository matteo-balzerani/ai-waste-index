// @vitest-environment node
import { Worker } from "node:worker_threads";
import { describe, expect, it } from "vitest";
import { loadExtractionConfig } from "@/server/extraction/config";
import { parsePage, createPageParser } from "@/server/extraction/parser";
import {
  extractionEnvironment,
  articleHtml,
  articleText,
} from "./helpers/extraction";

const config = loadExtractionConfig(extractionEnvironment);
const page = (text: string, contentType = "text/html") => ({
  bytes: new TextEncoder().encode(text),
  contentType,
  status: 200,
});
const signal = () => new AbortController().signal;

describe("terminable inert parser", () => {
  it("extracts HTML as plain text without scripts, markup, images or network requests", async () => {
    const text = await parsePage(page(articleHtml), config, signal());
    expect(text).toContain(articleText);
    expect(text).not.toMatch(/<|must never run|Navigation link/);
  });
  it("preserves plain text and Unicode without interpreting HTML", async () => {
    expect(
      await parsePage(
        page(
          "  👋 <script>ordinary text</script>  ",
          "text/plain; charset=utf-8",
        ),
        config,
        signal(),
      ),
    ).toBe("👋 <script>ordinary text</script>");
  });
  it.each([
    "image/png",
    "application/pdf",
    "application/json",
    "",
    "text/html; charset=unknown",
  ])("rejects unsupported media or encoding %s", async (contentType) => {
    await expect(
      parsePage(page(articleHtml, contentType), config, signal()),
    ).rejects.toMatchObject({ code: "EXTRACTION_FAILED" });
  });
  it.each(["", " ", "<html><body><script>private()</script></body></html>"])(
    "rejects empty/non-readable content %#",
    async (text) => {
      await expect(
        parsePage(page(text), config, signal()),
      ).rejects.toMatchObject({ code: "EXTRACTION_FAILED" });
    },
  );
  it("rejects oversize text without truncation", async () => {
    await expect(
      parsePage(page("x".repeat(2001), "text/plain"), config, signal()),
    ).rejects.toMatchObject({ code: "INPUT_TOO_LARGE" });
    expect(
      await parsePage(page("👋".repeat(2000), "text/plain"), config, signal()),
    ).toHaveLength(4000);
  });
  it("rejects invalid UTF-8 safely", async () => {
    await expect(
      parsePage(
        {
          status: 200,
          contentType: "text/plain",
          bytes: new Uint8Array([255, 254]),
        },
        config,
        signal(),
      ),
    ).rejects.toMatchObject({ code: "EXTRACTION_FAILED" });
  });
  it("actually terminates a CPU-stalled worker before resolving cancellation", async () => {
    const controller = new AbortController();
    let exited = false;
    const parse = createPageParser((_filename, options) => {
      const worker = new Worker("while (true) {}", {
        ...options,
        workerData: undefined,
        eval: true,
      });
      worker.once("online", () => controller.abort());
      worker.once("exit", () => {
        exited = true;
      });
      return worker;
    });
    await expect(
      parse(page(articleHtml), config, controller.signal),
    ).rejects.toMatchObject({ code: "URL_FETCH_FAILED" });
    expect(exited).toBe(true);
  });
  it("terminates after parsing errors without leaking worker exception details", async () => {
    const parse = createPageParser(
      (_filename, options) =>
        new Worker("throw new Error('sensitive content')", {
          ...options,
          eval: true,
        }),
    );
    await expect(
      parse(page(articleHtml), config, signal()),
    ).rejects.toMatchObject({
      code: "EXTRACTION_FAILED",
      message: "EXTRACTION_FAILED",
    });
  });
});
