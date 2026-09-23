import { expect, test } from "@playwright/test";
import { getDictionary } from "../src/i18n/dictionaries";
import { sharingFixture } from "../tests/helpers/sharing";

for (const locale of ["it", "en"] as const) {
  for (const [width, height] of [[1366, 768], [390, 844], [320, 740], [844, 390]] as const) {
    test(`${locale}: sharing dialog contains focus and scroll at ${width}×${height}`, async ({ page }) => {
      const d = getDictionary(locale);
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.route("**/api/analyze", route => route.fulfill({ json: {
        ...sharingFixture, methodologyVersion: "experimental-" + "long-version-".repeat(45),
      } }));
      await page.goto(`/${locale}`);
      await page.getByRole("textbox").fill("Arbitrary dialog contract fixture.");
      await page.getByRole("button", { name: d.analysis.submit, exact: true }).click();
      const open = page.getByRole("button", { name: d.sharing.open, exact: true });
      await open.scrollIntoViewIfNeeded();
      const scrollBefore = await page.evaluate(() => scrollY);
      await open.click();
      const dialog = page.getByRole("dialog", { name: d.sharing.open, exact: true });
      await expect(dialog).toBeVisible();
      await expect(dialog).toBeInViewport({ ratio: 1 });
      expect(await dialog.evaluate(element => element.matches(":modal"))).toBe(true);
      await expect(dialog.getByRole("heading")).toBeFocused();
      const close = dialog.getByRole("button", { name: d.sharing.close, exact: true });
      await page.keyboard.press("Tab");
      await expect(close).toBeFocused();
      // Attempt to move focus onto an inert background control.
      await page.locator(".result-heading button").evaluate((element: HTMLButtonElement) => element.focus());
      await expect(close).toBeFocused();
      const preview = dialog.locator(".preview-scroll");
      await preview.focus();
      await page.keyboard.press("Tab");
      await expect(close).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(preview).toBeFocused();
      await dialog.getByRole("button", { name: d.sharing.showCard, exact: true }).click();
      await dialog.getByRole("button", { name: d.sharing.zoomIn, exact: true }).click();
      const copy = dialog.getByRole("button", { name: d.sharing.copyImage, exact: true });
      const copyBefore = await copy.boundingBox();
      await preview.evaluate(element => { element.scrollTop = element.scrollHeight; });
      expect(await preview.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
      expect(await copy.boundingBox()).toEqual(copyBefore);
      await expect(copy).toBeInViewport({ ratio: 1 });
      await expect(close).toBeInViewport({ ratio: 1 });
      await page.mouse.move(width / 2, 1);
      await page.mouse.wheel(0, 800);
      expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
      expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(open).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("");
      expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
      await open.click();
      await close.click();
      await expect(open).toBeFocused();
    });
  }
}

for (const locale of ["it", "en"] as const) {
  test(`${locale}: enlarged dialog text fits and manual copy remains usable`, async ({ page }) => {
    const d = getDictionary(locale);
    await page.setViewportSize({ width: 320, height: 740 });
    await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { get: () => undefined }));
    await page.route("**/api/analyze", route => route.fulfill({ json: sharingFixture }));
    await page.goto(`/${locale}`);
    await page.getByRole("textbox").fill("Arbitrary enlarged dialog fixture.");
    await page.getByRole("button", { name: d.analysis.submit, exact: true }).click();
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await page.getByRole("button", { name: d.sharing.open, exact: true }).click();
    const dialog = page.getByRole("dialog");
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await expect(dialog.getByRole("button", { name: d.sharing.copyImage, exact: true })).toBeInViewport({ ratio: 1 });
    await expect(dialog.getByRole("button", { name: d.sharing.close, exact: true })).toBeInViewport({ ratio: 1 });
    expect((await dialog.locator(".preview-scroll").boundingBox())!.height).toBeGreaterThan(50);
    await dialog.getByRole("button", { name: d.sharing.copyText, exact: true }).click();
    const manual = dialog.getByRole("textbox", { name: d.sharing.manualLabel });
    await expect(manual).toBeFocused();
    await expect(manual).toBeInViewport();
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: d.sharing.close, exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });
}
