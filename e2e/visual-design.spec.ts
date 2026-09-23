import { expect, test } from "@playwright/test";
import { getDictionary } from "../src/i18n/dictionaries";

// Arbitrary black-box contract fixtures: no estimator-derived vectors or class mapping.
const fixture = {
  score: 23, class: "G", methodologyVersion: "experimental-design-fixture",
  estimates: {
    energyWh: { low: .7, value: 1.2, high: 2 },
    co2eGrams: { low: .3, value: .5, high: .9 },
    waterMl: { low: 4, value: 8, high: 14 },
  },
};
for (const locale of ["it", "en"] as const) {
  test(`${locale}: responsive input, keyboard, disclosure and reduced motion`, async ({ page }) => {
    const d = getDictionary(locale);
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${locale}`);
      await expect(page.locator('.estimate-notice')).not.toHaveAttribute('open');
      await expect(page.getByRole('button', { name: d.analysis.submit })).toBeInViewport();
      await expect(page.getByText(d.landing.description)).toHaveCount(0);
      const tab = page.getByRole('tab', { name: d.inputShell.modes.text.tabLabel });
      await tab.focus();
      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('tab', { name: d.inputShell.modes.url.tabLabel })).toBeFocused();
      await page.keyboard.press('End');
      await expect(page.getByLabel(d.inputShell.modes.screenshot.fieldLabel, { exact: true })).toBeVisible();
      await page.keyboard.press('Home');
      await page.getByRole('button', { name: d.analysis.submit }).click();
      await expect(page.getByRole('main').getByRole('alert')).toHaveText(d.analysis.emptyInput);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.getByText(d.inputShell.estimateLink, { exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText(d.landing.estimateNoticeBody)).toBeVisible();
  });
  test(`${locale}: all returned classes, zero, three digits, long versions and text enlargement`, async ({ page }) => {
    const d = getDictionary(locale);
    test.setTimeout(90000);
    let result = { ...fixture };
    await page.route('**/api/analyze', route => route.fulfill({ json: result }));
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`/${locale}`);
      for (const [index, className] of [...'ABCDEFG'].entries()) {
        result = { ...fixture, class: className, score: [0, 1, 23, 100, 8, 58, 99][index]!,
          methodologyVersion: index === 3 ? 'experimental-' + 'long-version-👋'.repeat(25) : fixture.methodologyVersion };
        await page.getByRole('textbox').fill('Arbitrary visual contract fixture.');
        await page.getByRole('button', { name: d.analysis.submit }).click();
        await expect(page.locator('.class-badge strong')).toHaveText(className);
        await expect(page.locator('.score-value')).toHaveText(`${result.score}/100`);
        await expect(page.locator('.version-label')).toHaveText(result.methodologyVersion);
        if (index === 0) await expect(page.getByText(d.analysis.zeroScoreNotice)).toBeVisible();
        await page.getByRole('button', { name: d.sharing.open, exact: true }).click();
        for (const format of ['Badge', d.sharing.showCard]) {
          await page.getByRole('button', { name: format, exact: true }).click();
          const card = page.getByRole('article', { name: format === 'Badge' ? d.sharing.badgeTitle : d.sharing.cardTitle });
          await expect(card).toContainText(result.methodologyVersion);
          await expect(card).toContainText(d.analysis.experimentalNotice);
          expect(await page.locator(".share-preview").evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.getByRole('button', { name: d.sharing.close, exact: true }).click();
        await page.getByRole('button', { name: d.analysis.newAnalysis }).click();
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await page.getByRole('textbox').fill('Larger text contract fixture.');
    await page.getByRole('button', { name: d.analysis.submit }).click();
    await expect(page.locator('.class-badge strong')).toHaveText('G');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
  test(`${locale}: compact badge copies a PNG locally and preserves disclosures`, async ({ page, context }) => {
    const d = getDictionary(locale);
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.route('**/api/analyze', route => route.fulfill({ json: { ...fixture, score: 0 } }));
    await page.goto(`/${locale}`);
    await page.getByRole('textbox').fill('Arbitrary sharing contract fixture.');
    await page.getByRole('button', { name: d.analysis.submit }).click();
    await page.getByRole('button', { name: d.sharing.open, exact: true }).click();
    await page.getByRole('button', { name: d.sharing.showBadge, exact: true }).click();
    const card = page.getByRole('article', { name: d.sharing.badgeTitle });
    await expect(card).toContainText(d.analysis.zeroScoreNotice);
    await expect(card).toContainText(d.analysis.experimentalNotice);
    const requests: string[] = [];
    page.on('request', request => requests.push(request.url()));
    await page.getByRole('button', { name: d.sharing.copyBadgeImage }).click();
    await expect(page.getByRole('status')).toHaveText(d.sharing.imageCopied);
    const size = await page.evaluate(async () => {
      const [item] = await navigator.clipboard.read();
      const bitmap = await createImageBitmap(await item!.getType('image/png'));
      const size = { width: bitmap.width, height: bitmap.height }; bitmap.close(); return size;
    });
    expect(size.width).toBe(720);
    expect(size.height).toBeLessThanOrEqual(4096);
    expect(requests).toEqual([]);
  });
}
