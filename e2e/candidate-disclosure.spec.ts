import { test, expect } from "@playwright/test";
import { getDictionary } from "../src/i18n/dictionaries";
import { sharingFixture } from "../tests/helpers/sharing";

for (const locale of ["it", "en"] as const) for (const width of [320, 1366]) {
  test(`${locale}: GPU disclosure, PNG and fallback at ${width}px without version prefix`, async ({ page }) => {
    const d = getDictionary(locale);
    const result = { ...sharingFixture, score: 0, methodologyVersion: "preview-public-fixture",
      estimates: { ...sharingFixture.estimates, energyWh: { low: 0.000001, value: 0.000002, high: 0.000003 } } };
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      const draw = CanvasRenderingContext2D.prototype.fillText;
      const records: Array<{ text: string; inside: boolean }> = [];
      Object.assign(window, { disclosureDraws: records });
      CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
        const textWidth = this.measureText(text).width;
        const left = this.textAlign === "center" ? x - textWidth / 2 : x;
        records.push({ text, inside: left >= 0 && left + textWidth <= this.canvas.width + 1 && y >= 0 && y < this.canvas.height });
        if (maxWidth === undefined) draw.call(this, text, x, y);
        else draw.call(this, text, x, y, maxWidth);
      };
    });
    await page.route("**/api/analyze", route => route.fulfill({ json: result }));
    await page.goto(`/${locale}`);
    await page.getByRole("textbox").fill("Synthetic public presentation example.");
    await page.getByRole("button", { name: d.analysis.submit, exact: true }).click();
    const region = page.getByRole("region", { name: d.analysis.resultTitle });
    await expect(region.getByText(d.analysis.experimentalLabel, { exact: true })).toBeVisible();
    await expect(page.locator("#environment-note")).toHaveCount(0);
    await expect(region.getByText(d.analysis.zeroScoreNotice)).toHaveCount(0);
    await expect(region.locator(".metric-grid")).toContainText(d.analysis.compactEnergy);
    await page.getByRole("button", { name: d.inputShell.estimateLink }).click();
    const info = page.getByRole("dialog", { name: d.inputShell.estimateLink });
    await expect(info).toContainText(d.analysis.experimentalNotice);
    await expect(info).toContainText(d.analysis.environmentNotice);
    await expect(info).toContainText(d.analysis.zeroScoreNotice);
    await expect(info).toContainText(result.methodologyVersion);
    await info.getByRole("button", { name: d.sharing.close }).click();
    await page.getByRole("button", { name: d.sharing.open, exact: true }).click();
    for (const format of ["badge", "card"] as const) {
      await page.getByRole("button", { name: format === "badge" ? d.sharing.showBadge : d.sharing.showCard, exact: true }).click();
      await expect(page.locator(".share-preview canvas")).toBeVisible();
      const records = await page.evaluate(() => (window as unknown as { disclosureDraws: Array<{ text: string; inside: boolean }> }).disclosureDraws);
      expect(records.every(record => record.inside)).toBe(true);
      const text = records.map(record => record.text).join("");
      for (const required of [result.methodologyVersion, d.analysis.scopeNotice, d.analysis.scoreBasis,
        d.analysis.experimentalNotice, d.analysis.zeroScoreNotice, d.sharing.disclaimer]) expect(text).toContain(required);
      if (format === "card") expect(text).toContain(d.analysis.environmentNotice);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.getByRole("button", { name: d.sharing.close, exact: true }).click();
    // Real Canvas failure exercises the visible HTML fallback with identical disclosures.
    await page.evaluate(() => { HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext; });
    await page.getByRole("button", { name: d.sharing.open, exact: true }).click();
    const fallback = page.getByRole("article", { name: d.sharing.cardTitle });
    await expect(fallback).toBeVisible();
    await expect(fallback).toContainText(d.analysis.environmentNotice);
    await expect(fallback).toContainText(result.methodologyVersion);
    await expect(fallback).toContainText(d.analysis.experimentalNotice);
  });
}
