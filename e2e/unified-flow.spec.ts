import { test, expect } from "@playwright/test";
import { getDictionary } from "../src/i18n/dictionaries";
for (const locale of ["it", "en"] as const) {
  test(`${locale}: live common scenario parity and readable Blame at 320px / 200%`, async ({ page }) => {
    test.skip(process.env.E2E_ADVANCED !== "1", "Requires explicitly enabled local calculator");
    const d=getDictionary(locale), c=d.advanced;
    await page.setViewportSize({width:320,height:900});await page.goto(`/${locale}`);
    const text="  e\u0301 and emoji 👋\nA synthetic visible answer. <|endoftext|>  ";
    await page.getByRole("textbox",{name:d.inputShell.modes.text.fieldLabel}).fill(text);
    const response=page.waitForResponse(r=>r.url().endsWith("/api/analyze") && r.request().method()==="POST");
    await page.getByRole("button",{name:d.analysis.submit,exact:true}).click();
    const blame=await (await response).json();
    await expect(page.getByRole("region",{name:d.analysis.resultTitle})).toContainText(blame.scenario.model);
    await page.addStyleTag({content:"html { font-size: 200%; }"});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.getByRole("button",{name:d.productModes.advanced,exact:true}).click();
    await page.getByLabel(c.provider,{exact:true}).selectOption(blame.scenario.provider);
    await page.getByLabel(c.model,{exact:true}).selectOption(blame.scenario.model);
    await page.getByLabel(c.generatedText,{exact:true}).fill(text);
    await expect(page.getByTestId("advanced-token-count")).toBeVisible();
    const result=page.waitForResponse(r=>r.url().endsWith("/api/advanced/estimate") && r.request().method()==="POST");
    await page.getByRole("button",{name:c.submit,exact:true}).click();
    const advanced=await result;
    expect(advanced.request().postDataJSON().outputTokens).toBe(blame.scenario.outputTokens);
    expect(advanced.request().postDataJSON()).not.toHaveProperty("text");
    expect((await advanced.json()).energyWh).toEqual(blame.estimates.energyWh);
    await expect(page.getByText(c.referenceTokens,{exact:true})).toBeVisible();
  });
}
