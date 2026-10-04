import { expect, test } from "@playwright/test";
import { getDictionary } from "../src/i18n/dictionaries";
import { advancedCatalogFixture as catalog, advancedResultFixture as result } from "../tests/helpers/advanced";

for (const locale of ["it", "en"] as const) {
  const d = getDictionary(locale), c = d.advanced;
  for (const width of [320, 390, 768, 1440]) {
    test(`${locale}: Advanced energy at ${width}px, both input paths and transient state`, async ({ page }) => {
      await page.route("**/api/advanced/models", route => route.fulfill({ json: catalog }));
      const payloads: unknown[] = [];
      await page.route("**/api/advanced/estimate", route => {
        payloads.push(route.request().postDataJSON()); return route.fulfill({ json: result });
      });
      await page.setViewportSize({ width, height: 900 }); await page.goto(`/${locale}`);
      await page.getByRole("textbox", { name: d.inputShell.modes.text.fieldLabel }).fill("Blame draft");
      await page.getByRole("button", { name: d.productModes.advanced, exact: true }).click();
      if (width === 390) await page.addStyleTag({ content: "html { font-size: 200%; }" });
      await page.getByLabel(c.provider, { exact: true }).selectOption("provider-a");
      await page.getByLabel(c.model, { exact: true }).selectOption("model-a");
      await expect(page.getByRole("radio", { name: c.fromText, exact: true })).toBeChecked();
      await page.getByRole("radio", { name: c.fromTokens, exact: true }).check();
      await page.getByLabel(c.outputTokens, { exact: true }).fill("0");
      await page.getByRole("button", { name: c.submit, exact: true }).click();
      await expect(page.getByRole("alert").filter({ hasText: c.tokenError })).toBeFocused();
      await page.getByLabel(c.outputTokens, { exact: true }).fill("500");
      await page.getByRole("button", { name: c.submit, exact: true }).focus(); await page.keyboard.press("Enter");
      await expect(page.getByRole("heading", { name: c.resultTitle })).toBeFocused();
      await expect(page.getByTestId("advanced-energy")).toContainText("Wh");
      expect(payloads).toEqual([{ provider: "provider-a", model: "model-a", outputTokens: 500 }]);
      await expect(page.getByText(c.declaredTokens, { exact: true })).toBeVisible();
      await page.getByRole("radio", { name: c.fromText, exact: true }).check();
      await expect(page.getByTestId("advanced-energy")).toHaveCount(0);
      await page.getByLabel(c.generatedText, { exact: true }).fill("Risposta locale 😀 con accenti e <|endoftext|>. ".repeat(20));
      await expect(page.getByTestId("advanced-token-count")).toBeVisible();
      await page.getByRole("button", { name: c.submit, exact: true }).click();
      await expect(page.getByRole("heading", { name: c.resultTitle })).toBeFocused();
      await expect(page.getByText(c.referenceTokens, { exact: true })).toBeVisible();
      const textPayload = payloads[1] as Record<string, unknown>;
      expect(Object.keys(textPayload).sort()).toEqual(["model", "outputTokens", "provider"]);
      expect(textPayload.outputTokens).toBeGreaterThan(0);
      await expect(page.getByRole("button", { name: d.sharing.open })).toHaveCount(0);
      await page.locator("summary").filter({ hasText: c.method }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole("button", { name: d.productModes.blame, exact: true }).click();
      await expect(page.getByRole("textbox", { name: d.inputShell.modes.text.fieldLabel })).toHaveValue("Blame draft");
      await page.getByRole("button", { name: d.productModes.advanced, exact: true }).click();
      await expect(page.getByTestId("advanced-energy")).toBeVisible();
      expect(await page.evaluate(async () => ({ local: localStorage.length, session: sessionStorage.length,
        databases: await indexedDB.databases() }))).toEqual({ local: 0, session: 0, databases: [] });
      await page.reload(); await page.getByRole("button", { name: d.productModes.advanced, exact: true }).click();
      await expect(page.getByLabel(c.generatedText, { exact: true })).toHaveValue("");
      await expect(page.getByTestId("advanced-energy")).toHaveCount(0);
    });
  }
  test(`${locale}: live Advanced catalog and all six models`, async ({ page, request }) => {
    test.skip(process.env.E2E_ADVANCED !== "1", "Local calculator explicitly disabled");
    const response = await request.get("/api/advanced/models"); expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
    const live = await response.json();
    expect(live.providers.flatMap((p: { models: string[] }) => p.models)).toHaveLength(6);
    await page.goto(`/${locale}`); await page.getByRole("button", { name: d.productModes.advanced, exact: true }).click();
    await page.getByRole("radio", { name: c.fromTokens, exact: true }).check();
    for (const provider of live.providers) for (const model of provider.models) {
      await page.getByLabel(c.provider, { exact: true }).selectOption(provider.id);
      await page.getByLabel(c.model, { exact: true }).selectOption(model);
      await page.getByLabel(c.outputTokens, { exact: true }).fill("500");
      await page.getByRole("button", { name: c.submit, exact: true }).click();
      await expect(page.getByTestId("advanced-energy")).toContainText("Wh");
      await expect(page.getByText(c.estimatedDuration, { exact: true })).toBeVisible();
    }
    await page.getByRole("radio", { name: c.fromText, exact: true }).check();
    await page.getByLabel(c.generatedText, { exact: true }).fill("Una risposta sintetica per verificare il percorso dal testo.");
    await expect(page.getByTestId("advanced-token-count")).toBeVisible();
    await page.getByLabel(c.duration, { exact: true }).fill("0.5");
    await page.getByRole("button", { name: c.submit, exact: true }).click();
    await expect(page.getByTestId("advanced-energy")).toBeVisible();
    await expect(page.getByText(c.declaredDuration.replace("{seconds}", locale === "it" ? "0,5" : "0.5"), { exact: true })).toBeVisible();
  });
}
