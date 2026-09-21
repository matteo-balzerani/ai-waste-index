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
import { recognizeScreenshot } from "@/browser/ocr/client";
import { OcrError } from "@/browser/ocr/types";
vi.mock("@/browser/ocr/client", () => ({ recognizeScreenshot: vi.fn() }));
const recognize = vi.mocked(recognizeScreenshot);
function setup(locale: "it" | "en" = "en") {
  const dictionary = getDictionary(locale);
  const mounted = render(
    <AnalysisInput
      dictionary={dictionary}
      copy={dictionary.inputShell}
      locale={locale}
      maxTextCodePoints={100}
      ocrLimits={{
        maxBytes: 1000,
        maxPixels: 10000,
        maxWidth: 100,
        maxHeight: 100,
        timeoutMs: 100,
      }}
    />,
  );
  fireEvent.click(
    screen.getByRole("tab", {
      name: dictionary.inputShell.modes.screenshot.tabLabel,
    }),
  );
  const choose = () =>
    fireEvent.change(
      screen.getByLabelText(dictionary.inputShell.modes.screenshot.fieldLabel),
      {
        target: {
          files: [new File(["synthetic"], "image.png", { type: "image/png" })],
        },
      },
    );
  return { dictionary, choose, ...mounted };
}
describe("screenshot review and lifecycle", () => {
  it.each(["it", "en"] as const)(
    "requires current-text confirmation and sends only text in %s",
    async (locale) => {
      recognize.mockResolvedValue("Text from screenshot");
      const fetch = vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: { code: "ESTIMATOR_UNAVAILABLE" } },
            { status: 503 },
          ),
        );
      vi.stubGlobal("fetch", fetch);
      const { dictionary, choose } = setup(locale);
      choose();
      await screen.findByRole("heading", {
        name: dictionary.extraction.previewTitle,
      });
      expect(fetch).not.toHaveBeenCalled();
      const analyze = screen.getByRole("button", {
        name: dictionary.extraction.analyze,
      });
      expect(analyze).toBeDisabled();
      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);
      expect(analyze).toBeEnabled();
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "Reviewed screenshot text" },
      });
      expect(checkbox).not.toBeChecked();
      expect(analyze).toBeDisabled();
      fireEvent.click(checkbox);
      fireEvent.click(analyze);
      await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
      expect(JSON.parse(fetch.mock.calls[0]![1].body)).toEqual({
        text: "Reviewed screenshot text",
        sourceType: "screenshot",
        locale,
      });
      fireEvent.click(
        screen.getByRole("button", { name: dictionary.ocr.changeImage }),
      );
      expect(
        screen.getByLabelText(
          dictionary.inputShell.modes.screenshot.fieldLabel,
        ),
      ).toHaveValue("");
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    },
  );
  it.each(["cancel", "replace", "mode", "pagehide", "pageshow", "unmount"])(
    "aborts pending OCR on %s and ignores stale completion",
    async (action) => {
      let complete!: (text: string) => void;
      recognize
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              complete = resolve;
            }),
        )
        .mockResolvedValue("Replacement OCR text");
      const { dictionary, choose, unmount } = setup();
      choose();
      const options = recognize.mock.calls.at(-1)![1];
      expect(screen.getByRole("status")).toHaveTextContent(
        dictionary.ocr.pending,
      );
      await act(async () => options.onProgress(0.5));
      expect(screen.getByRole("progressbar")).toHaveAttribute("value", "0.5");
      if (action === "cancel")
        fireEvent.click(
          screen.getByRole("button", { name: dictionary.analysis.cancel }),
        );
      if (action === "replace") choose();
      if (action === "mode")
        fireEvent.click(
          screen.getByRole("tab", {
            name: dictionary.inputShell.modes.text.tabLabel,
          }),
        );
      if (action === "pagehide" || action === "pageshow")
        fireEvent(window, new Event(action));
      if (action === "unmount") unmount();
      expect(options.signal.aborted).toBe(true);
      await act(async () => {
        options.onProgress(1);
        complete("Stale private screenshot");
      });
      expect(
        screen.queryByDisplayValue("Stale private screenshot"),
      ).not.toBeInTheDocument();
      if (action === "replace") {
        expect(screen.getByRole("textbox")).toHaveValue("Replacement OCR text");
        expect(screen.getByRole("checkbox")).not.toBeChecked();
      }
    },
  );
  it.each([
    "EXTRACTION_FAILED",
    "REQUEST_TIMEOUT",
    "INPUT_TOO_LARGE",
    "INVALID_INPUT",
  ] as const)(
    "shows localized OCR error %s without creating preview",
    async (code) => {
      recognize.mockRejectedValueOnce(new OcrError(code));
      const { dictionary, choose } = setup();
      choose();
      const expected =
        code === "EXTRACTION_FAILED"
          ? dictionary.ocr.failed
          : code === "REQUEST_TIMEOUT"
            ? dictionary.ocr.timeout
            : dictionary.apiMessages[code];
      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent(expected),
      );
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
      expect(
        screen.getByLabelText(
          dictionary.inputShell.modes.screenshot.fieldLabel,
        ),
      ).toHaveValue("");
    },
  );
});
