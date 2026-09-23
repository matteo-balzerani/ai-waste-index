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
