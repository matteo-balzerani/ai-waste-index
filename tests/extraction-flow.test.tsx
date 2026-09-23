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

const preview = {
  text: "Extracted text 👋",
  requiresConfirmation: true,
  warnings: ["EXTRACTION_CONFIRMATION_REQUIRED"],
};
function setup(locale: "it" | "en" = "en") {
  const dictionary = getDictionary(locale);
  const mounted = render(
    <AnalysisInput
      dictionary={dictionary}
      copy={dictionary.inputShell}
      locale={locale}
      maxTextCodePoints={100}
      maxUrlChars={1024}
    />,
  );
  fireEvent.click(
    screen.getByRole("tab", { name: dictionary.inputShell.modes.url.tabLabel }),
  );
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value: "https://example.com/content" } });
  fireEvent.click(
    screen.getByRole("button", { name: dictionary.extraction.submit }),
  );
  return { dictionary, ...mounted };
}

describe("mandatory URL extraction review", () => {
  it.each(["it", "en"] as const)(
    "requires confirmation and invalidates it on editing in %s",
    async (locale) => {
      const fetch = vi
        .fn()
        .mockResolvedValueOnce(Response.json(preview))
        .mockResolvedValueOnce(
          Response.json(
            { error: { code: "ESTIMATOR_UNAVAILABLE" } },
            { status: 503 },
          ),
        );
      vi.stubGlobal("fetch", fetch);
      const { dictionary } = setup(locale);
      const heading = await screen.findByRole("heading", {
        name: dictionary.extraction.previewTitle,
      });
      await waitFor(() => expect(heading).toHaveFocus());
      expect(
        screen.getByText(
          dictionary.apiMessages.EXTRACTION_CONFIRMATION_REQUIRED,
        ),
      ).toBeInTheDocument();
      const submit = screen.getByRole("button", {
        name: dictionary.extraction.analyze,
      });
      expect(submit).toBeDisabled();
      expect(fetch).toHaveBeenCalledTimes(1);
      const confirm = screen.getByRole("checkbox", {
        name: dictionary.extraction.confirmation,
      });
      fireEvent.click(confirm);
      expect(submit).toBeEnabled();
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "Edited extracted text 👋" },
      });
      expect(confirm).not.toBeChecked();
      expect(submit).toBeDisabled();
      fireEvent.submit(submit.closest("form")!);
      expect(fetch).toHaveBeenCalledTimes(1);
      fireEvent.click(confirm);
      fireEvent.click(submit);
      expect(await screen.findByRole("alert")).toHaveTextContent(
        dictionary.apiMessages.ESTIMATOR_UNAVAILABLE,
      );
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch.mock.calls[1]![0]).toBe("/api/analyze");
      expect(JSON.parse(fetch.mock.calls[1]![1].body)).toEqual({
        sourceType: "url",
        text: "Edited extracted text 👋",
        locale,
      });
      expect(fetch.mock.calls[1]![1].body).not.toContain("example.com");
    },
  );

  it.each([
    { ...preview, requiresConfirmation: false },
    { ...preview, warnings: [] },
    { ...preview, warnings: ["UNKNOWN"] },
    { ...preview, confidence: 1 },
    { ...preview, text: "" },
  ])(
    "never bypasses confirmation for nonconforming extraction %#",
    async (body) => {
      const fetch = vi.fn().mockResolvedValue(Response.json(body));
      vi.stubGlobal("fetch", fetch);
      const { dictionary } = setup();
      expect(await screen.findByRole("alert")).toHaveTextContent(
        dictionary.apiMessages.INTERNAL_ERROR,
      );
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );
  it("changing URL discards preview and confirmation", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(preview));
    vi.stubGlobal("fetch", fetch);
    const { dictionary } = setup();
    const confirm = await screen.findByRole("checkbox");
    fireEvent.click(confirm);
    fireEvent.click(
      screen.getByRole("button", { name: dictionary.extraction.changeUrl }),
    );
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
  it.each(["pagehide", "pageshow"])(
    "discards preview/confirmation on %s",
    async (event) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(preview)));
      setup();
      fireEvent.click(await screen.findByRole("checkbox"));
      fireEvent(window, new Event(event));
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveValue("");
    },
  );
  it.each(["cancel", "mode", "pagehide", "unmount"])(
    "cancels extraction and ignores stale previews after %s",
    async (action) => {
      let complete!: (response: Response) => void;
      const fetch = vi.fn().mockReturnValue(
        new Promise<Response>((resolve) => {
          complete = resolve;
        }),
      );
      vi.stubGlobal("fetch", fetch);
      const { dictionary, unmount } = setup();
      expect(screen.getByRole("status")).toHaveTextContent(
        dictionary.extraction.pending,
      );
      expect(
        screen.getByRole("button", { name: dictionary.extraction.loadingLabel }),
      ).toBeDisabled();
      if (action === "cancel")
        fireEvent.click(
          screen.getByRole("button", { name: dictionary.analysis.cancel }),
        );
      else if (action === "mode")
        fireEvent.click(
          screen.getByRole("tab", {
            name: dictionary.inputShell.modes.text.tabLabel,
          }),
        );
      else if (action === "unmount") unmount();
      else fireEvent(window, new Event(action));
      expect(fetch.mock.calls[0]![1].signal.aborted).toBe(true);
      await act(async () => complete(Response.json(preview)));
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );
  it("renders untrusted extracted markup as editable text only", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({
            ...preview,
            text: '<img src="https://example.com/pixel" onerror="alert(1)">',
          }),
        ),
    );
    setup();
    expect(await screen.findByRole("checkbox")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(
      (screen.getByRole("textbox") as HTMLTextAreaElement).value,
    ).toContain("<img");
  });
});
