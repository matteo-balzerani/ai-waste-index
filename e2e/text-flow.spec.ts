import { test, expect } from "@playwright/test";
import { getDictionary } from "../src/i18n/dictionaries";

for (const locale of ["it", "en"] as const) {
  const dictionary = getDictionary(locale);
  test(`${locale}: local text result, no persistence, refresh and navigation loss`, async ({
    page,
  }) => {
    const destinations: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST")
        destinations.push(new URL(request.url()).pathname);
    });
    await page.goto(`/${locale}`);
    await page
      .getByRole("textbox")
      .fill("Local browser integration example 👋");
    const responsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/api/analyze"),
    );
    await page
      .getByRole("button", { name: dictionary.analysis.submit })
      .click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe("no-store, max-age=0");
    expect(response.headers().pragma).toBe("no-cache");
    const body = await response.json();
    await expect(
      page.getByRole("heading", { name: dictionary.analysis.resultTitle }),
    ).toBeFocused();
    const resultRegion = page.getByRole("region", { name: dictionary.analysis.resultTitle });
    if (body.methodologyVersion.startsWith("stub-")) {
      await expect(resultRegion.getByText(dictionary.analysis.demoNotice)).toBeVisible();
    } else {
      await expect(resultRegion.getByText(dictionary.analysis.experimentalLabel, { exact: true })).toBeVisible();
      await resultRegion.getByText(dictionary.analysis.methodologyTitle, { exact: true }).click();
      await expect(resultRegion.getByText(dictionary.analysis.experimentalNotice)).toBeVisible();
    }
    await expect(
      page.getByText(body.methodologyVersion, { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(body.class, { exact: true })).toBeVisible();
    for (const title of [
      dictionary.analysis.energy,
      dictionary.analysis.carbon,
      dictionary.analysis.water,
    ]) {
      await expect(
        page.getByRole("heading", { name: title, exact: true }),
      ).toBeVisible();
    }
    expect(destinations).toEqual(["/api/analyze"]);
    expect(new URL(page.url()).pathname).toBe(`/${locale}`);
    expect(new URL(page.url()).search).toBe("");
    expect(
      await page.evaluate(() => ({
        local: localStorage.length,
        session: sessionStorage.length,
        cookie: document.cookie,
      })),
    ).toEqual({ local: 0, session: 0, cookie: "" });
    expect(
      await page.evaluate(async () => (await indexedDB.databases()).length),
    ).toBe(0);
    expect(
      await page.evaluate(
        async () => (await navigator.serviceWorker.getRegistrations()).length,
      ),
    ).toBe(0);
    await page.reload();
    await expect(page.getByRole("textbox")).toHaveValue("");
    await expect(
      page.getByRole("heading", { name: dictionary.analysis.resultTitle }),
    ).toHaveCount(0);
    await page.getByRole("textbox").fill("Second temporary example");
    await page
      .getByRole("button", { name: dictionary.analysis.submit })
      .click();
    await expect(
      page.getByRole("heading", { name: dictionary.analysis.resultTitle }),
    ).toBeVisible();
    const other = locale === "en" ? "it" : "en";
    await page
      .getByRole("link", {
        name: other === "it" ? "Italiano" : "English",
        exact: true,
      })
      .click();
    await expect(page.getByRole("textbox")).toHaveValue("");
    await page.goBack();
    await expect(page.getByRole("textbox")).toHaveValue("");
    await expect(
      page.getByRole("heading", { name: dictionary.analysis.resultTitle }),
    ).toHaveCount(0);
    await page.goForward();
    await expect(page.getByRole("textbox")).toHaveValue("");
  });

  test(`${locale}: domain rejection has no result or sharing and keeps editable input`, async ({ page }) => {
    let calls = 0;
    await page.route("**/api/analyze", route => {
      calls++;
      return route.fulfill({ status: 422, contentType: "application/json", body: JSON.stringify({ error: { code: "ESTIMATE_OUT_OF_DOMAIN" } }) });
    });
    await page.goto(`/${locale}`);
    await page.getByRole("textbox").fill("Generic domain-rejection contract example");
    await page.getByRole("button", { name: dictionary.analysis.submit }).click();
    await expect(page.locator("main").getByRole("alert")).toHaveText(dictionary.apiMessages.ESTIMATE_OUT_OF_DOMAIN);
    await expect(page.getByRole("textbox")).toHaveValue("Generic domain-rejection contract example");
    await expect(page.getByRole("heading", { name: dictionary.analysis.resultTitle })).toHaveCount(0);
    await expect(page.getByRole("button", { name: dictionary.sharing.copyText })).toHaveCount(0);
    expect(calls).toBe(1);
  });

  test(`${locale}: recover from errors and cancel stale responses`, async ({
    page,
  }) => {
    await page.goto(`/${locale}`);
    await page
      .getByRole("button", { name: dictionary.analysis.submit })
      .click();
    await expect(page.locator("main").getByRole("alert")).toHaveText(
      dictionary.apiMessages.INVALID_INPUT,
    );
    await page.route("**/api/analyze", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "ESTIMATOR_UNAVAILABLE" } }),
      }),
    );
    await page.getByRole("textbox").fill("Temporary browser error example");
    await page
      .getByRole("button", { name: dictionary.analysis.submit })
      .click();
    await expect(page.locator("main").getByRole("alert")).toHaveText(
      dictionary.apiMessages.ESTIMATOR_UNAVAILABLE,
    );
    await page.unroute("**/api/analyze");
    let release!: () => void;
    let arrived!: () => void;
    const arrival = new Promise<void>((done) => {
      arrived = done;
    });
    const gate = new Promise<void>((done) => {
      release = done;
    });
    await page.route("**/api/analyze", async (route) => {
      arrived();
      await gate;
      await route.abort();
    });
    await page
      .getByRole("button", { name: dictionary.analysis.submit })
      .click();
    await arrival;
    await expect(page.getByRole("status")).toHaveText(
      dictionary.analysis.pending,
    );
    await expect(
      page.getByRole("button", { name: dictionary.analysis.submit }),
    ).toBeDisabled();
    await page
      .getByRole("button", { name: dictionary.analysis.cancel })
      .click();
    release();
    await expect(page.getByRole("textbox")).toHaveValue("");
    await expect(
      page.getByRole("heading", { name: dictionary.analysis.resultTitle }),
    ).toHaveCount(0);
  });
}
