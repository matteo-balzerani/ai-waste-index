import { expect, test } from "@playwright/test";
import { getDictionary } from "../src/i18n/dictionaries";
import { sharingFixture } from "../tests/helpers/sharing";

for (const locale of ["it", "en"] as const) {
  const d = getDictionary(locale);
  test(`${locale}: information preserves drafts, errors and confirmed extraction`, async ({ page }) => {
    await page.goto(`/${locale}`);
    const trigger = page.getByRole("button", { name: d.inputShell.estimateLink });
    const dialog = page.getByRole("dialog", { name: d.inputShell.estimateLink });
    await expect(dialog).toHaveCount(0);
    await expect(page.locator(".hero")).toHaveCount(0);
    await page.getByRole("button", { name: d.analysis.submit, exact: true }).click();
    await trigger.click();
    await expect(dialog).toContainText(d.info.privacyBody);
    await expect(dialog.locator(".version-label")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText(d.analysis.emptyInput);
    for (const mode of ["text", "url"] as const) {
      await page.getByRole("tab", { name: d.inputShell.modes[mode].tabLabel }).click();
      const field = page.getByRole("textbox");
      const value = mode === "text" ? "Transient input example." : "https://example.com/article";
      await field.fill(value);
      await trigger.focus();
      await page.keyboard.press("Enter");
      await expect(dialog.getByRole("heading", { name: d.inputShell.estimateLink })).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(dialog.getByRole("button", { name: d.sharing.close })).toBeFocused();
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => document.querySelector("dialog")?.contains(document.activeElement))).toBe(true);
      expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("hidden");
      await dialog.getByRole("button", { name: d.sharing.close }).click();
      await expect(trigger).toBeFocused();
      await expect(field).toHaveValue(value);
      expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("");
      expect(new URL(page.url()).pathname).toBe(`/${locale}`);
    }
    await page.route("**/api/extract-url", route => route.fulfill({ json: {
      text: "Editable preview example.", requiresConfirmation: true, warnings: ["EXTRACTION_CONFIRMATION_REQUIRED"],
    } }));
    await page.getByRole("button", { name: d.extraction.submit }).click();
    const preview = page.getByRole("textbox", { name: d.extraction.previewLabel });
    await expect(preview).toHaveValue("Editable preview example.");
    await page.getByRole("checkbox").check();
    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(preview).toHaveValue("Editable preview example.");
    await expect(page.getByRole("checkbox")).toBeChecked();
    await expect(page.getByRole("button", { name: d.extraction.analyze, exact: true })).toBeEnabled();
    await preview.fill("Edited preview example.");
    await expect(page.getByRole("checkbox")).not.toBeChecked();
    await page.getByRole("button", { name: d.extraction.changeUrl }).click();
    await page.getByRole("tab", { name: d.inputShell.modes.screenshot.tabLabel }).click();
    await trigger.click();
    await expect(dialog).toContainText(d.inputShell.modes.screenshot.description);
    await page.keyboard.press("Escape");
    await expect(page.getByLabel(d.inputShell.modes.screenshot.fieldLabel, { exact: true })).toBeEnabled();
  });

  test(`${locale}: analysis can finish while information is open`, async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route("**/api/analyze", async route => {
      await gate;
      await route.fulfill({ json: { ...sharingFixture, methodologyVersion: "preview-pending-fixture" } });
    });
    await page.goto(`/${locale}`);
    await page.getByRole("textbox").fill("Synthetic pending example.");
    await page.getByRole("button", { name: d.analysis.submit, exact: true }).click();
    await expect(page.getByRole("button", { name: d.analysis.loadingLabel, exact: true })).toBeDisabled();
    const trigger = page.getByRole("button", { name: d.inputShell.estimateLink });
    await trigger.click();
    release();
    const dialog = page.getByRole("dialog", { name: d.inputShell.estimateLink });
    await expect(dialog).toContainText("preview-pending-fixture");
    expect(await page.evaluate(() => document.querySelector("dialog")?.contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await expect(page.locator(".score-value")).toHaveText(`${sharingFixture.score}/100`);
    await expect(page.getByRole("button", { name: d.sharing.open, exact: true })).toBeEnabled();
  });

  test(`${locale}: environmental links, responsive panel, demo and result lifetime`, async ({ page }) => {
    let result = { ...sharingFixture, score: 0, methodologyVersion: "preview-" + "long-version-👋".repeat(25) };
    await page.route("**/api/analyze", route => route.fulfill({ json: result }));
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${locale}`);
      await page.getByRole("textbox").fill("Synthetic information example.");
      await page.getByRole("button", { name: d.analysis.submit, exact: true }).click();
      await expect(page.getByText(d.analysis.experimentalLabel, { exact: true })).toBeVisible();
      await expect(page.getByText(d.analysis.zeroScoreNotice)).toHaveCount(0);
      for (const label of [d.analysis.compactCarbon, d.analysis.compactWater]) {
        for (const name of [`${label}: ${d.analysis.environmentInfo}`]) {
          const asterisk = page.getByRole("button", { name, exact: true });
          await asterisk.focus();
          await page.keyboard.press("Enter");
          const dialog = page.getByRole("dialog", { name: d.inputShell.estimateLink });
          const section = dialog.getByRole("heading", { name: d.analysis.estimatesTitle });
          await expect(section).toBeFocused();
          await expect(section).toBeInViewport();
          await expect(dialog.locator("#environment-note")).toContainText(d.analysis.environmentNotice);
          await expect(dialog).toContainText(result.methodologyVersion);
          await expect(dialog).toContainText(d.analysis.zeroScoreNotice);
          expect(await dialog.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
          expect(await dialog.locator(".info-scroll").evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
          await page.keyboard.press("Escape");
          await expect(asterisk).toBeFocused();
          await expect(page.locator(".score-value")).toHaveText("0/100");
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await page.getByRole("button", { name: d.inputShell.estimateLink }).click();
    const dialog = page.getByRole("dialog", { name: d.inputShell.estimateLink });
    await expect(dialog.getByRole("button", { name: d.sharing.close })).toBeInViewport();
    expect(await dialog.locator(".info-scroll").evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
    await page.keyboard.press("Escape");
    result = { ...sharingFixture, score: 0 };
    await page.getByRole("button", { name: d.analysis.newAnalysis }).click();
    await page.getByRole("textbox").fill("Synthetic demo example.");
    await page.getByRole("button", { name: d.analysis.submit, exact: true }).click();
    await expect(page.locator(".estimate-chip")).toHaveText(d.analysis.demoLabel);
    await page.getByRole("button", { name: d.inputShell.estimateLink }).click();
    await expect(dialog).toContainText(d.analysis.demoNotice);
    await expect(dialog).not.toContainText(d.analysis.experimentalNotice);
    await expect(dialog).toContainText(result.methodologyVersion);
    await page.reload();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("textbox")).toHaveValue("");
  });
}
