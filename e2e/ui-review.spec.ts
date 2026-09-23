import { expect, test } from "@playwright/test";
import { getDictionary } from "../src/i18n/dictionaries";
import { sharingFixture } from "../tests/helpers/sharing";

const result = { ...sharingFixture, methodologyVersion: "experimental-ui-fixture" };
for (const locale of ["it", "en"] as const) {
  test(`${locale}: sharing has a visible primary action and explicit formats`, async ({ page }) => {
    const d = getDictionary(locale);
    await page.route("**/api/analyze", route => route.fulfill({ json: result }));
    for (const [width, height] of [[1366, 768], [390, 844], [320, 740]]) {
      await page.setViewportSize({ width: width!, height: height! });
      await page.goto(`/${locale}`);
      await page.getByRole("textbox").fill("Synthetic visual review.");
      await page.getByRole("button", { name: d.analysis.submit, exact: true }).click();
      const share = page.getByRole("button", { name: d.sharing.open, exact: true });
      await expect(share).toBeVisible();
      if (width !== 320) await expect(share).toBeInViewport({ ratio: 1 });
      await expect(page.getByRole("group", { name: d.sharing.formatLabel })).toHaveCount(0);
      await share.click();
      await expect(page.getByRole("group", { name: d.sharing.formatLabel })).toBeVisible();
      await expect(page.getByRole("button", { name: d.sharing.showBadge, exact: true })).toHaveAttribute("aria-pressed", "true");
    }
  });
}

test("mobile metrics keep readable ranges and units", async ({ page }) => {
  await page.route("**/api/analyze", route => route.fulfill({ json: result }));
  for (const locale of ["it", "en"] as const) for (const width of [320, 390, 430]) {
    const d = getDictionary(locale);
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`/${locale}`);
    await page.getByRole("textbox").fill("Synthetic metrics review.");
    await page.getByRole("button", { name: d.analysis.submit, exact: true }).click();
    await expect(page.locator(".metric-range")).toHaveCount(3);
    expect(await page.locator(".metric-range").first().evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(12);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

for (const locale of ["it", "en"] as const) {
  for (const [width, height] of [[1366, 768], [390, 844], [320, 740]] as const) {
    test(`${locale}: input actions fit ${width}×${height}`, async ({ page }) => {
      const d = getDictionary(locale);
      await page.setViewportSize({ width, height });
      await page.goto(`/${locale}`);
      await expect(page.getByRole("button", { name: d.analysis.submit, exact: true })).toBeInViewport({ ratio: 1 });
      await page.getByRole("tab", { name: "Link" }).click();
      await expect(page.getByRole("button", { name: d.extraction.submit, exact: true })).toBeInViewport({ ratio: 1 });
    });
  }
}

