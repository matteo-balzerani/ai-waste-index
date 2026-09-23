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

test("preview pixels match the copied PNG for both formats", async ({ page, context }) => {
  const d = getDictionary("it");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.route("**/api/analyze", route => route.fulfill({ json: result }));
  await page.goto("/it");
  await page.getByRole("textbox").fill("Synthetic image review.");
  await page.getByRole("button", { name: d.analysis.submit, exact: true }).click();
  await page.getByRole("button", { name: d.sharing.open, exact: true }).click();
  for (const format of ["badge", "card"] as const) {
    await page.getByRole("button", { name: format === "badge" ? d.sharing.showBadge : d.sharing.showCard, exact: true }).click();
    await expect(page.locator(".preview-scroll canvas")).toBeVisible();
    await page.getByRole("button", { name: format === "badge" ? d.sharing.copyBadgeImage : d.sharing.copyImage, exact: true }).click();
    await expect(page.getByRole("status")).toHaveText(d.sharing.imageCopied);
    await expect.poll(async () => page.evaluate(async () => {
      const preview = document.querySelector<HTMLCanvasElement>(".preview-scroll canvas")!;
      const [item] = await navigator.clipboard.read();
      const bitmap = await createImageBitmap(await item!.getType("image/png"));
      const target = document.createElement("canvas"); target.width = bitmap.width; target.height = bitmap.height;
      target.getContext("2d")!.drawImage(bitmap, 0, 0); bitmap.close();
      if (target.width !== preview.width || target.height !== preview.height) return false;
      const a = preview.getContext("2d")!.getImageData(0, 0, preview.width, preview.height).data;
      const b = target.getContext("2d")!.getImageData(0, 0, target.width, target.height).data;
      return { width: preview.width, height: preview.height, different: a.reduce((n, value, i) => n + Number(value !== b[i]), 0), maxDelta: a.reduce((n, value, i) => Math.max(n, Math.abs(value - b[i]!)), 0) };
    })).toMatchObject({ different: 0 });
  }
});

test("pending analysis preserves the primary action position and allows cancellation", async ({ page }) => {
  const d = getDictionary("it"); let release!: () => void;
  await page.route("**/api/analyze", async route => {
    await new Promise<void>(resolve => { release = resolve; });
    await route.fulfill({ json: result }).catch(() => {});
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/it"); await page.getByRole("textbox").fill("Synthetic pending review.");
  const button = page.getByRole("button", { name: d.analysis.submit, exact: true });
  const before = await button.boundingBox(); await button.click();
  const busy = page.getByRole("button", { name: d.analysis.loadingLabel, exact: true });
  await expect(busy).toBeDisabled();
  const after = await busy.boundingBox();
  expect(after).toEqual(before);
  await page.getByRole("button", { name: d.analysis.cancel, exact: true }).click();
  release();
  await expect(page.getByRole("textbox")).toBeFocused();
  await expect(page.locator(".score-value")).toHaveCount(0);
});

test("short extraction previews stay compact and edits revoke confirmation", async ({ page }) => {
  await page.route("**/api/extract-url", route => route.fulfill({ json: {
    text: "Synthetic short text.", requiresConfirmation: true, warnings: ["EXTRACTION_CONFIRMATION_REQUIRED"],
  } }));
  for (const locale of ["it", "en"] as const) {
    const d = getDictionary(locale);
    await page.setViewportSize({ width: 320, height: 740 }); await page.goto(`/${locale}`);
    await page.getByRole("tab", { name: "Link" }).click();
    await page.getByRole("textbox").fill("https://example.com/review");
    await page.getByRole("textbox").press("Enter");
    const field = page.getByRole("textbox", { name: d.extraction.previewLabel });
    await expect(field).toBeVisible();
    expect((await field.boundingBox())!.height).toBeLessThan(200);
    const analyse = page.getByRole("button", { name: d.extraction.analyze, exact: true });
    await expect(analyse).toBeDisabled(); await expect(analyse).toBeInViewport({ ratio: 1 });
    await page.getByRole("checkbox").check(); await expect(analyse).toBeEnabled();
    await field.fill("Changed text."); await expect(page.getByRole("checkbox")).not.toBeChecked();
    await expect(analyse).toBeDisabled();
  }
});
