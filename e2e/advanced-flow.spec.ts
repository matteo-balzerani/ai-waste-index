import { expect, test } from "@playwright/test";
import { getDictionary } from "../src/i18n/dictionaries";
import { sharingFixture } from "../tests/helpers/sharing";

for (const locale of ["it", "en"] as const) {
  const d = getDictionary(locale);
  const c = d.advanced;

  test(`${locale}: Advanced chat review, placeholders and transient mode state`, async ({ page }) => {
    const requests: string[] = [];
    page.on("request", request => {
      if (request.method() === "POST") requests.push(request.url());
    });
    await page.goto(`/${locale}`);
    await page.getByRole("textbox", { name: d.inputShell.modes.text.fieldLabel }).fill("Synthetic Blame draft");
    await page.getByRole("button", { name: d.productModes.advanced, exact: true }).click();
    await page.getByRole("radio", { name: c.chat, exact: true }).check();
    await page.getByRole("textbox", { name: c.chatLabel }).fill("User: Write a note\nAssistant: First note\nUser: Revise\nAssistant: Final note");
    await page.getByRole("button", { name: c.review, exact: true }).click();
    await expect(page.getByRole("heading", { name: c.reviewTitle })).toBeFocused();
    const responses = page.getByRole("group", { name: c.message.replace("{number}", "4"), exact: true });
    await responses.getByRole("textbox", { name: c.model, exact: true }).fill("User declared model");
    await responses.getByText(c.details, { exact: true }).click();
    await responses.getByRole("textbox", { name: c.inputTokens }).fill("0");
    await page.getByRole("checkbox", { name: c.confirm }).check();
    await responses.getByRole("textbox", { name: c.content }).fill("Edited final note");
    await expect(page.getByRole("checkbox", { name: c.confirm })).not.toBeChecked();
    await expect(page.getByRole("button", { name: c.preview })).toBeDisabled();
    await page.getByRole("checkbox", { name: c.confirm }).check();
    await page.getByRole("button", { name: c.preview }).click();
    await expect(page.getByRole("heading", { name: c.resultTitle })).toBeFocused();
    await expect(page.getByText(c.undefinedValue, { exact: true })).toHaveCount(9);
    await expect(page.getByRole("button", { name: d.sharing.open })).toHaveCount(0);
    expect(requests).toEqual([]);
    await page.getByRole("button", { name: d.productModes.blame, exact: true }).click();
    await expect(page.getByRole("textbox", { name: d.inputShell.modes.text.fieldLabel })).toHaveValue("Synthetic Blame draft");
    await page.route("**/api/analyze", route => route.fulfill({ json: sharingFixture }));
    await page.getByRole("button", { name: d.analysis.submit, exact: true }).click();
    await expect(page.getByRole("heading", { name: d.analysis.resultTitle })).toBeVisible();
    await page.getByRole("button", { name: d.productModes.advanced, exact: true }).click();
    await expect(page.getByRole("heading", { name: c.resultTitle })).toBeVisible();
    await expect(page.getByRole("heading", { name: d.analysis.resultTitle })).toHaveCount(0);
    const storage = await page.evaluate(async () => ({
      local: localStorage.length, session: sessionStorage.length, databases: await indexedDB.databases(),
    }));
    expect(storage).toEqual({ local: 0, session: 0, databases: [] });
    await page.reload();
    await expect(page.getByRole("button", { name: d.productModes.blame, exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("textbox", { name: d.inputShell.modes.text.fieldLabel })).toHaveValue("");
    await page.getByRole("button", { name: d.productModes.advanced, exact: true }).click();
    await expect(page.getByRole("textbox", { name: c.textLabel })).toHaveValue("");
    await page.getByRole("textbox", { name: c.textLabel }).fill("Temporary again");
    await page.getByRole("link", { name: locale === "it" ? d.navigation.english : d.navigation.italian }).click();
    await page.goBack();
    await page.getByRole("button", { name: d.productModes.advanced, exact: true }).click();
    await expect(page.getByRole("textbox", { name: c.textLabel })).toHaveValue("");
  });

  test(`${locale}: keyboard correction and split of an ambiguous chat`, async ({ page }) => {
    await page.goto(`/${locale}`);
    const advanced = page.getByRole("button", { name: d.productModes.advanced, exact: true });
    await advanced.focus(); await page.keyboard.press("Enter");
    await page.getByRole("radio", { name: c.chat, exact: true }).check();
    await page.getByRole("textbox", { name: c.chatLabel }).fill("Question\nAnswer");
    await page.getByRole("button", { name: c.review, exact: true }).click();
    await expect(page.getByRole("checkbox", { name: c.confirm })).toBeDisabled();
    const content = page.getByRole("textbox", { name: c.content });
    await content.focus(); await content.evaluate((node: HTMLTextAreaElement) => node.setSelectionRange(9, 9));
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: c.split })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("combobox").nth(1)).toBeFocused();
    await page.getByRole("combobox").nth(0).selectOption("user");
    await page.getByRole("combobox").nth(1).selectOption("assistant");
    await page.getByRole("checkbox", { name: c.confirm }).check();
    await expect(page.getByRole("button", { name: c.preview })).toBeEnabled();
    await expect(page.getByRole("textbox", { name: c.content }).nth(0)).toHaveValue("Question\n");
    await expect(page.getByRole("textbox", { name: c.content }).nth(1)).toHaveValue("Answer");
  });

  for (const width of [320, 390, 768, 1440]) {
    test(`${locale}: Advanced at ${width}px with long content and enlarged text`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${locale}`);
      await page.getByRole("button", { name: d.productModes.advanced, exact: true }).click();
      if (width === 390) await page.addStyleTag({ content: "html { font-size: 200%; }" });
      const noOverflow = async () => expect(await page.evaluate(() =>
        document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await noOverflow();
      await page.getByRole("textbox", { name: c.textLabel }).fill("Long synthetic content. ".repeat(500));
      await page.getByRole("textbox", { name: c.model }).fill("M".repeat(200));
      await page.getByRole("button", { name: c.preview }).click();
      await expect(page.getByText(c.prototype, { exact: true })).toBeVisible();
      await noOverflow();
      await page.getByRole("button", { name: c.edit }).click();
      await page.getByRole("radio", { name: c.chat, exact: true }).check();
      await page.getByRole("textbox", { name: c.chatLabel }).fill("Assistant: " + "Long unbroken response".repeat(100));
      await page.getByRole("button", { name: c.review, exact: true }).click();
      await noOverflow();
      await page.getByRole("checkbox", { name: c.confirm }).check();
      await page.getByRole("button", { name: c.preview }).click();
      await noOverflow();
    });
  }
}
