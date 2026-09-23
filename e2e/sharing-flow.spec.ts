import { test, expect, type Page } from "@playwright/test";
import { getDictionary } from "../src/i18n/dictionaries";
async function result(page: Page, locale: "it" | "en") {
  const d = getDictionary(locale);
  await page.goto(`/${locale}`);
  await page
    .getByRole("textbox")
    .fill("Synthetic text for local sharing verification.");
  const response = page.waitForResponse((r) =>
    r.url().endsWith("/api/analyze"),
  );
  await page.getByRole("button", { name: d.analysis.submit }).click();
  const body = await (await response).json();
  await expect(
    page.getByRole("heading", { name: d.analysis.resultTitle }),
  ).toBeVisible();
  return body;
}
for (const locale of ["it", "en"] as const) {
  test(`${locale}: real clipboard text and PNG sharing stays local and transient`, async ({
    page,
    context,
  }) => {
    const d = getDictionary(locale);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const body = await result(page, locale);
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    const sharing = page.getByRole("region", { name: d.sharing.title });
    await sharing.getByRole("button", { name: d.sharing.open, exact: true }).click();
    await sharing.getByRole("button", { name: d.sharing.showCard, exact: true }).click();
    await sharing.getByRole("button", { name: d.sharing.copyText }).click();
    await expect(sharing.getByRole("status")).toHaveText(d.sharing.textCopied);
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toContain(body.methodologyVersion);
    expect(text).toContain(d.sharing.disclaimer);
    expect(text).toContain((body.methodologyVersion.startsWith("stub-") ? d.analysis.demoNotice : d.analysis.experimentalNotice));
    expect(text).toContain(`${body.score}/100`);
    expect(text).toContain(`${d.analysis.classLabel} ${body.class}`);
    for (const unit of ["Wh", "gCO2e", "mL"]) expect(text).toContain(unit);
    expect(text).not.toContain("Synthetic text");
    expect(text).not.toMatch(/https?:|data:|blob:/);
    if (!(await sharing.getByRole("group", { name: d.sharing.formatLabel }).count())) await sharing.getByRole("button", { name: d.sharing.open, exact: true }).click();
    await sharing.getByRole("button", { name: d.sharing.showBadge, exact: true }).click();
    await sharing.getByRole("button", { name: d.sharing.copyText, exact: true }).click();
    await expect(sharing.getByRole("status")).toHaveText(d.sharing.badgeCopied);
    const badge = await page.evaluate(() => navigator.clipboard.readText());
    expect(badge).toContain(body.methodologyVersion);
    expect(badge).toContain(d.sharing.disclaimer);
    expect(badge).toContain((body.methodologyVersion.startsWith("stub-") ? d.analysis.demoNotice : d.analysis.experimentalNotice));
    if (!(await sharing.getByRole("group", { name: d.sharing.formatLabel }).count())) await sharing.getByRole("button", { name: d.sharing.open, exact: true }).click();
    await sharing.getByRole("button", { name: d.sharing.showCard }).click();
    const card = sharing.getByRole("article", { name: d.sharing.cardTitle });
    await expect(card).toContainText(body.methodologyVersion);
    await expect(card).toContainText(d.sharing.disclaimer);
    await expect(card).toContainText((body.methodologyVersion.startsWith("stub-") ? d.analysis.demoNotice : d.analysis.experimentalNotice));
    await sharing.getByRole("button", { name: d.sharing.copyImage }).click();
    await expect(sharing.getByRole("status")).toHaveText(d.sharing.imageCopied);
    const png = await page.evaluate(async () => {
      const items = await navigator.clipboard.read();
      const blob = await items[0]!.getType("image/png");
      const bitmap = await createImageBitmap(blob);
      try {
        return {
          width: bitmap.width,
          height: bitmap.height,
          size: blob.size,
          type: blob.type,
        };
      } finally {
        bitmap.close();
      }
    });
    expect(png.width).toBe(1080);
    expect(png.height).toBeGreaterThan(600);
    expect(png.height).toBeLessThanOrEqual(4096);
    expect(png.size).toBeGreaterThan(1000);
    expect(png.type).toBe("image/png");
    expect(requests).toEqual([]);
    expect(
      await page.evaluate(async () => ({
        local: localStorage.length,
        session: sessionStorage.length,
        db: await indexedDB.databases(),
        cache: await caches.keys(),
        cookie: document.cookie,
        search: location.search,
        hash: location.hash,
      })),
    ).toEqual({
      local: 0,
      session: 0,
      db: [],
      cache: [],
      cookie: "",
      search: "",
      hash: "",
    });
    await sharing.getByRole("button", { name: d.sharing.close, exact: true }).click();
    await page.getByRole("button", { name: d.analysis.newAnalysis }).click();
    await expect(
      page.getByRole("article", { name: d.sharing.cardTitle }),
    ).toHaveCount(0);
    await expect(page.getByRole("textbox")).toHaveValue("");
    await page.reload();
    await expect(
      page.getByRole("region", { name: d.sharing.title }),
    ).toHaveCount(0);
  });
  test(`${locale}: unavailable clipboard gives selectable text and a mobile screenshot card`, async ({
    page,
  }) => {
    const d = getDictionary(locale);
    await page.setViewportSize({ width: 375, height: 850 });
    await page.addInitScript(() =>
      Object.defineProperty(navigator, "clipboard", {
        get: () => undefined,
        configurable: true,
      }),
    );
    const body = await result(page, locale);
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    const sharing = page.getByRole("region", { name: d.sharing.title });
    await sharing.getByRole("button", { name: d.sharing.open, exact: true }).click();
    await sharing.getByRole("button", { name: d.sharing.showCard, exact: true }).click();
    await sharing.getByRole("button", { name: d.sharing.copyText }).click();
    const field = sharing.getByRole("textbox", { name: d.sharing.manualLabel });
    await expect(field).toBeFocused();
    await expect(field).toHaveValue(new RegExp(body.methodologyVersion));
    expect(
      await field.evaluate(
        (element) => (element as HTMLTextAreaElement).selectionEnd,
      ),
    ).toBe((await field.inputValue()).length);
    if (!(await sharing.getByRole("group", { name: d.sharing.formatLabel }).count())) await sharing.getByRole("button", { name: d.sharing.open, exact: true }).click();
    await sharing.getByRole("button", { name: d.sharing.showCard }).click();
    await sharing.getByRole("button", { name: d.sharing.copyImage }).click();
    await expect(sharing.getByRole("status")).toHaveText(
      d.sharing.imageFallback,
    );
    const card = sharing.getByRole("article", { name: d.sharing.cardTitle });
    await expect(card).toContainText(body.methodologyVersion);
    await expect(card).toContainText(d.sharing.disclaimer);
    expect(
      await sharing.locator(".share-preview").evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(requests).toEqual([]);
    await sharing.getByRole("button", { name: d.sharing.close, exact: true }).click();
    await page
      .getByRole("link", {
        name: locale === "it" ? "English" : "Italiano",
        exact: true,
      })
      .click();
    await page.goBack();
    await expect(
      page.getByRole("region", { name: d.sharing.title }),
    ).toHaveCount(0);
    await expect(page.getByRole("textbox")).toHaveValue("");
  });
}
