import { test, expect } from "@playwright/test";
import { getDictionary } from "../src/i18n/dictionaries";

for (const locale of ["it", "en"] as const) {
  const copy = getDictionary(locale);
  test(`${locale}: URL preview requires confirmation, editing revokes it, only text is analysed`, async ({
    page,
  }) => {
    const requests: Array<{ path: string; body: unknown }> = [];
    page.on("request", (request) => {
      if (request.method() === "POST")
        requests.push({
          path: new URL(request.url()).pathname,
          body: request.postDataJSON(),
        });
    });
    // Stable browser fixture: the real extractor/transport/parser are exercised by
    // socket integration tests. The confirmed analysis calls the local estimator.
    await page.route("**/api/extract-url", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" },
        body: JSON.stringify({
          text: "Extracted browser example 👋",
          requiresConfirmation: true,
          warnings: ["EXTRACTION_CONFIRMATION_REQUIRED"],
        }),
      }),
    );
    await page.goto(`/${locale}`);
    await page
      .getByRole("tab", { name: copy.inputShell.modes.url.tabLabel })
      .click();
    await page.getByRole("textbox").fill("https://example.com/page");
    await page.getByRole("button", { name: copy.extraction.submit }).click();
    await expect(
      page.getByRole("heading", { name: copy.extraction.previewTitle }),
    ).toBeFocused();
    const analyze = page.getByRole("button", { name: copy.extraction.analyze });
    const confirm = page.getByRole("checkbox", {
      name: copy.extraction.confirmation,
    });
    await expect(analyze).toBeDisabled();
    expect(requests.map((request) => request.path)).toEqual([
      "/api/extract-url",
    ]);
    await confirm.check();
    await expect(analyze).toBeEnabled();
    await page.getByRole("textbox").fill("Reviewed and edited browser text 👋");
    await expect(confirm).not.toBeChecked();
    await expect(analyze).toBeDisabled();
    await confirm.check();
    await analyze.click();
    await expect(
      page.getByRole("heading", { name: copy.analysis.resultTitle }),
    ).toBeVisible();
    expect(requests).toEqual([
      { path: "/api/extract-url", body: { url: "https://example.com/page" } },
      {
        path: "/api/analyze",
        body: {
          text: "Reviewed and edited browser text 👋",
          sourceType: "url",
          locale,
        },
      },
    ]);
    expect(
      await page.evaluate(() => [
        localStorage.length,
        sessionStorage.length,
        document.cookie,
      ]),
    ).toEqual([0, 0, ""]);
    await page.reload();
    await expect(page.getByRole("textbox")).toHaveValue("");
    await expect(page.getByRole("checkbox")).toHaveCount(0);
  });

  test(`${locale}: real extraction route blocks loopback safely`, async ({
    page,
  }) => {
    await page.goto(`/${locale}`);
    await page
      .getByRole("tab", { name: copy.inputShell.modes.url.tabLabel })
      .click();
    await page.getByRole("textbox").fill("http://127.0.0.1:8787/health");
    const responsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/api/extract-url"),
    );
    await page.getByRole("button", { name: copy.extraction.submit }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(403);
    expect(response.headers()["cache-control"]).toBe("no-store, max-age=0");
    expect(response.headers().pragma).toBe("no-cache");
    expect(await response.json()).toEqual({ error: { code: "URL_BLOCKED" } });
    await expect(page.locator("main").getByRole("alert")).toHaveText(
      copy.apiMessages.URL_BLOCKED,
    );
    await expect(page.getByRole("checkbox")).toHaveCount(0);
  });
}
