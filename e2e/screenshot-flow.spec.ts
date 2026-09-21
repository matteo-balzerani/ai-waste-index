import { test, expect } from "@playwright/test";
import { getDictionary } from "../src/i18n/dictionaries";

for (const locale of ["it", "en"] as const) {
  test(`${locale}: real browser OCR stays local and requires current-text confirmation`, async ({
    page,
    context,
  }) => {
    test.setTimeout(60000);
    const copy = getDictionary(locale);
    const requests: Array<{
      url: string;
      method: string;
      body: string | null;
    }> = [];
    context.on("request", (request) =>
      requests.push({
        url: request.url(),
        method: request.method(),
        body: request.postData(),
      }),
    );
    await page.addInitScript(() => {
      const Original = window.Worker;
      const state = { started: 0, stopped: 0 };
      Object.assign(window, { ocrWorkers: state });
      window.Worker = class extends Original {
        constructor(url: string | URL, options?: WorkerOptions) {
          super(url, options);
          if (String(url).includes("/ocr/")) state.started++;
        }
        override terminate() {
          state.stopped++;
          super.terminate();
        }
      };
    });
    await page.goto(`/${locale}`);
    const mimeType = locale === "it" ? "image/png" : "image/jpeg";
    const image = await page.evaluate((mime) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1400;
      canvas.height = 240;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "black";
      ctx.font = "48px Arial";
      ctx.fillText("A simple screenshot for local text recognition.", 30, 90);
      ctx.fillText("Questo testo viene letto nel browser.", 30, 175);
      return canvas.toDataURL(mime).split(",")[1]!;
    }, mimeType);
    await page
      .getByRole("tab", { name: copy.inputShell.modes.screenshot.tabLabel })
      .click();
    await page
      .getByLabel(copy.inputShell.modes.screenshot.fieldLabel)
      .setInputFiles({
        name: "synthetic-image",
        mimeType,
        buffer: Buffer.from(image, "base64"),
      });
    await expect(
      page.getByRole("heading", { name: copy.extraction.previewTitle }),
    ).toBeVisible({ timeout: 40000 });
    await expect(page.getByRole("textbox")).toHaveValue(
      /local text recognition/,
    );
    expect(requests.filter((r) => r.method !== "GET")).toEqual([]);
    expect(
      requests.every(
        (r) => new URL(r.url).origin === new URL(page.url()).origin,
      ),
    ).toBe(true);
    expect(
      requests.some((r) => r.url.endsWith("/ocr/eng.traineddata.gz")),
    ).toBe(true);
    expect(
      requests.some((r) => r.url.endsWith("/ocr/ita.traineddata.gz")),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => (window as unknown as { ocrWorkers: unknown }).ocrWorkers,
      ),
    ).toEqual({ started: 1, stopped: 1 });
    const confirm = page.getByRole("checkbox", {
      name: copy.extraction.confirmation,
    });
    const analyze = page.getByRole("button", { name: copy.extraction.analyze });
    await expect(analyze).toBeDisabled();
    await confirm.check();
    await page
      .getByRole("textbox")
      .fill("Confirmed browser-local screenshot text.");
    await expect(confirm).not.toBeChecked();
    await expect(analyze).toBeDisabled();
    await confirm.check();
    await analyze.click();
    await expect(
      page.getByRole("heading", { name: copy.analysis.resultTitle }),
    ).toBeVisible();
    const sent = requests.filter((r) => r.method === "POST");
    expect(sent).toHaveLength(1);
    expect(new URL(sent[0]!.url).pathname).toBe("/api/analyze");
    expect(JSON.parse(sent[0]!.body!)).toEqual({
      text: "Confirmed browser-local screenshot text.",
      sourceType: "screenshot",
      locale,
    });
    expect(
      await page.evaluate(async () => ({
        local: localStorage.length,
        session: sessionStorage.length,
        databases: await indexedDB.databases(),
        caches: await caches.keys(),
      })),
    ).toEqual({ local: 0, session: 0, databases: [], caches: [] });
    await page.reload();
    await expect(page.getByRole("textbox")).toHaveValue("");
    await expect(page.getByRole("checkbox")).toHaveCount(0);
  });
}

test("OCR cancellation and deadline terminate a busy browser worker", async ({
  page,
}) => {
  test.setTimeout(60000);
  const copy = getDictionary("en");
  let closed = 0;
  page.on("worker", (worker) =>
    worker.on("close", () => {
      closed++;
    }),
  );
  // Exercise native Worker.terminate even when worker JavaScript cannot service messages.
  await page.route("**/ocr/worker.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: "postMessage({type:'progress',value:0.1}); while (true) {}",
    }),
  );
  await page.goto("/en");
  await page
    .getByRole("tab", { name: copy.inputShell.modes.screenshot.tabLabel })
    .click();
  const input = page.getByLabel(copy.inputShell.modes.screenshot.fieldLabel);
  const synthetic = {
    name: "synthetic.png",
    mimeType: "image/png",
    buffer: Buffer.from("test-only worker input"),
  };
  await input.setInputFiles(synthetic);
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "0.1");
  await page.getByRole("button", { name: copy.analysis.cancel }).click();
  await expect.poll(() => closed).toBe(1);
  await expect(input).toHaveValue("");
  await input.setInputFiles(synthetic);
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "0.1");
  await expect(page.locator("main").getByRole("alert")).toHaveText(
    copy.ocr.timeout,
    { timeout: 35000 },
  );
  await expect.poll(() => closed).toBe(2);
  await expect(page.getByRole("checkbox")).toHaveCount(0);
});

test("invalid image header and pixel bomb never start OCR engine loading", async ({
  page,
  context,
}) => {
  const copy = getDictionary("en");
  const assets: string[] = [];
  context.on("request", (request) => {
    if (request.url().includes("/ocr/"))
      assets.push(new URL(request.url()).pathname);
  });
  await page.goto("/en");
  await page
    .getByRole("tab", { name: copy.inputShell.modes.screenshot.tabLabel })
    .click();
  const input = page.getByLabel(copy.inputShell.modes.screenshot.fieldLabel);
  await input.setInputFiles({
    name: "fake.png",
    mimeType: "image/png",
    buffer: Buffer.from("<svg>not a PNG</svg>"),
  });
  await expect(page.locator("main").getByRole("alert")).toHaveText(
    copy.apiMessages.INVALID_INPUT,
  );
  const bomb = Buffer.alloc(33);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bomb);
  bomb.writeUInt32BE(13, 8);
  bomb.write("IHDR", 12);
  bomb.writeUInt32BE(100000, 16);
  bomb.writeUInt32BE(100000, 20);
  await input.setInputFiles({
    name: "bomb.png",
    mimeType: "image/png",
    buffer: bomb,
  });
  await expect(page.locator("main").getByRole("alert")).toHaveText(
    copy.apiMessages.INPUT_TOO_LARGE,
  );
  expect(assets).toEqual(["/ocr/worker.js", "/ocr/worker.js"]);
});
