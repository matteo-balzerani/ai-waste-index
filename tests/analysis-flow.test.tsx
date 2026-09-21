import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnalysisInput } from "@/components/analysis-input";
import { getDictionary } from "@/i18n/dictionaries";

// Arbitrary structural contract fixture, independent of estimator implementation.
const fixture = {
  score: 23,
  class: "G",
  methodologyVersion: "stub-contract-fixture",
  estimates: {
    energyWh: { low: 0.1, value: 1.25, high: 3 },
    co2eGrams: { low: 0, value: 0, high: 0 },
    waterMl: { low: 1, value: 2, high: 3 },
  },
};
function setup(locale: "it" | "en" = "en", limit: number | null = 64) {
  const dictionary = getDictionary(locale);
  const mounted = render(
    <AnalysisInput
      copy={dictionary.inputShell}
      dictionary={dictionary}
      locale={locale}
      maxTextCodePoints={limit}
    />,
  );
  const input = screen.getByRole("textbox");
  const submit = screen.getByRole("button", {
    name: dictionary.analysis.submit,
  });
  return { dictionary, input, submit, ...mounted };
}
function start(input: HTMLElement, submit: HTMLElement) {
  fireEvent.change(input, { target: { value: " Visible text 👋 " } });
  fireEvent.click(submit);
}

describe("one-shot text flow", () => {
  it.each(["it", "en"] as const)(
    "submits %s text unchanged and renders all estimates, ranges and demo disclosure",
    async (locale) => {
      const fetch = vi.fn().mockResolvedValue(Response.json(fixture));
      vi.stubGlobal("fetch", fetch);
      const storage = vi.spyOn(Storage.prototype, "setItem");
      const historyWrite = vi.spyOn(history, "pushState");
      const { dictionary, input, submit } = setup(locale);
      start(input, submit);
      const heading = await screen.findByRole("heading", {
        name: dictionary.analysis.resultTitle,
      });
      await waitFor(() => expect(heading).toHaveFocus());
      expect(
        screen.getByText(dictionary.analysis.demoNotice),
      ).toBeInTheDocument();
      expect(screen.getByText(fixture.methodologyVersion)).toBeInTheDocument();
      expect(screen.getByText("G")).toBeInTheDocument();
      expect(
        screen.getByText(locale === "it" ? "1,25 Wh" : "1.25 Wh"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(locale === "it" ? /0,1–3 Wh/ : /0.1–3 Wh/),
      ).toBeInTheDocument();
      expect(
        screen.getByText(dictionary.analysis.disclaimer),
      ).toBeInTheDocument();
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch.mock.calls[0]![0]).toBe("/api/analyze");
      expect(JSON.parse(fetch.mock.calls[0]![1].body)).toEqual({
        sourceType: "text",
        text: " Visible text 👋 ",
        locale,
      });
      expect(fetch.mock.calls[0]![1].cache).toBe("no-store");
      expect(storage).not.toHaveBeenCalled();
      expect(historyWrite).not.toHaveBeenCalled();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      fireEvent.click(
        screen.getByRole("button", { name: dictionary.analysis.newAnalysis }),
      );
      expect(screen.getByRole("textbox")).toHaveValue("");
      expect(
        screen.queryByText(fixture.methodologyVersion),
      ).not.toBeInTheDocument();
    },
  );

  it.each(["", " ", "\ud800", "👋".repeat(65)])(
    "validates before any request %#",
    (value) => {
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      const { input, submit } = setup();
      fireEvent.change(input, { target: { value } });
      fireEvent.click(submit);
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it("does not submit when configuration is unavailable", () => {
    const { submit } = setup("en", null);
    expect(submit).toBeDisabled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it.each([
    "RATE_LIMITED",
    "GLOBAL_CAP_REACHED",
    "ESTIMATOR_UNAVAILABLE",
    "GUARD_UNAVAILABLE",
  ] as const)("localizes the safe error %s and permits retry", async (code) => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json(
            { error: { code } },
            {
              status:
                code === "RATE_LIMITED" || code === "GLOBAL_CAP_REACHED"
                  ? 429
                  : 503,
            },
          ),
        )
        .mockResolvedValueOnce(Response.json(fixture)),
    );
    const { dictionary, input, submit } = setup();
    start(input, submit);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      dictionary.apiMessages[code],
    );
    expect(input).toHaveValue(" Visible text 👋 ");
    fireEvent.click(submit);
    expect(
      await screen.findByRole("heading", {
        name: dictionary.analysis.resultTitle,
      }),
    ).toBeInTheDocument();
  });

  it.each([
    Response.json(
      { error: { code: "UNKNOWN", message: "do not show" } },
      { status: 500 },
    ),
    Response.json({
      ...fixture,
      estimates: {
        ...fixture.estimates,
        energyWh: { low: 5, value: 2, high: 3 },
      },
    }),
    Response.json({ error: { code: "RATE_LIMITED" } }, { status: 500 }),
  ])("rejects malformed responses safely %#", async (response) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    const { dictionary, input, submit } = setup();
    start(input, submit);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      dictionary.apiMessages.INTERNAL_ERROR,
    );
    expect(
      screen.queryByText(fixture.methodologyVersion),
    ).not.toBeInTheDocument();
  });

  it.each(["cancel", "mode", "pagehide", "pageshow", "unmount"])(
    "prevents duplicate requests and stale completion after %s",
    async (action) => {
      let resolve!: (value: Response) => void;
      const fetch = vi.fn().mockReturnValue(
        new Promise<Response>((done) => {
          resolve = done;
        }),
      );
      vi.stubGlobal("fetch", fetch);
      const { dictionary, input, submit, unmount } = setup();
      start(input, submit);
      fireEvent.click(submit);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(submit).toBeDisabled();
      expect(screen.getByRole("status")).toHaveTextContent(
        dictionary.analysis.pending,
      );
      if (action === "cancel")
        fireEvent.click(
          screen.getByRole("button", { name: dictionary.analysis.cancel }),
        );
      else if (action === "mode")
        fireEvent.click(
          screen.getByRole("tab", {
            name: dictionary.inputShell.modes.url.tabLabel,
          }),
        );
      else if (action === "unmount") unmount();
      else fireEvent(window, new Event(action));
      expect(fetch.mock.calls[0]![1].signal.aborted).toBe(true);
      await act(async () => {
        resolve(Response.json(fixture));
      });
      expect(
        screen.queryByText(fixture.methodologyVersion),
      ).not.toBeInTheDocument();
    },
  );

  it.each(["pagehide", "pageshow"])(
    "discards completed results on %s",
    async (event) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(fixture)));
      const { dictionary, input, submit } = setup();
      start(input, submit);
      await screen.findByRole("heading", {
        name: dictionary.analysis.resultTitle,
      });
      fireEvent(window, new Event(event));
      await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue(""));
      expect(
        screen.queryByText(fixture.methodologyVersion),
      ).not.toBeInTheDocument();
    },
  );
});
