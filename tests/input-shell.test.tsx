import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AnalysisInput } from "@/components/analysis-input";
import { getDictionary } from "@/i18n/dictionaries";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("analysis input shell", () => {
  it.each(["it", "en"] as const)(
    "renders all localized %s input modes with an accessible default panel",
    (locale) => {
      const copy = getDictionary(locale).inputShell;
      render(<AnalysisInput copy={copy} />);

      expect(
        screen.getByRole("heading", { name: copy.title }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tablist", { name: copy.modeSelectorLabel }),
      ).toBeInTheDocument();

      for (const mode of Object.values(copy.modes)) {
        expect(
          screen.getByRole("tab", { name: mode.tabLabel }),
        ).toBeInTheDocument();
      }

      expect(
        screen.getByRole("tab", { name: copy.modes.text.tabLabel }),
      ).toHaveAttribute("aria-selected", "true");
      expect(
        screen.getByRole("textbox", { name: copy.modes.text.fieldLabel }),
      ).toHaveAccessibleDescription(copy.modes.text.fieldHint);
    },
  );

  it("supports arrow, Home and End keyboard navigation", () => {
    const copy = getDictionary("en").inputShell;
    render(<AnalysisInput copy={copy} />);

    const textTab = screen.getByRole("tab", {
      name: copy.modes.text.tabLabel,
    });
    fireEvent.keyDown(textTab, { key: "ArrowRight" });

    const urlTab = screen.getByRole("tab", { name: copy.modes.url.tabLabel });
    expect(urlTab).toHaveFocus();
    expect(urlTab).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("textbox", { name: copy.modes.url.fieldLabel }),
    ).toHaveAttribute("type", "url");

    fireEvent.keyDown(urlTab, { key: "End" });
    const screenshotTab = screen.getByRole("tab", {
      name: copy.modes.screenshot.tabLabel,
    });
    expect(screenshotTab).toHaveFocus();
    expect(screenshotTab).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByLabelText(copy.modes.screenshot.fieldLabel),
    ).toHaveAttribute("type", "file");

    fireEvent.keyDown(screenshotTab, { key: "Home" });
    expect(textTab).toHaveFocus();
    expect(textTab).toHaveAttribute("aria-selected", "true");
  });

  it("discards text, URL and selected files when the input mode changes", () => {
    const copy = getDictionary("en").inputShell;
    render(<AnalysisInput copy={copy} />);

    const textInput = screen.getByRole("textbox", {
      name: copy.modes.text.fieldLabel,
    });
    fireEvent.change(textInput, { target: { value: "temporary text" } });

    fireEvent.click(
      screen.getByRole("tab", { name: copy.modes.url.tabLabel }),
    );
    const urlInput = screen.getByRole("textbox", {
      name: copy.modes.url.fieldLabel,
    });
    expect(urlInput).toHaveValue("");
    fireEvent.change(urlInput, {
      target: { value: "https://example.test/post" },
    });

    fireEvent.click(
      screen.getByRole("tab", { name: copy.modes.screenshot.tabLabel }),
    );
    const fileInput = screen.getByLabelText(copy.modes.screenshot.fieldLabel);
    fireEvent.change(fileInput, {
      target: {
        files: [new File(["image"], "screenshot.png", { type: "image/png" })],
      },
    });
    expect((fileInput as HTMLInputElement).files?.[0]?.name).toBe(
      "screenshot.png",
    );

    fireEvent.click(
      screen.getByRole("tab", { name: copy.modes.text.tabLabel }),
    );
    expect(
      screen.getByRole("textbox", { name: copy.modes.text.fieldLabel }),
    ).toHaveValue("");

    fireEvent.click(
      screen.getByRole("tab", { name: copy.modes.screenshot.tabLabel }),
    );
    const replacementFileInput = screen.getByLabelText(
      copy.modes.screenshot.fieldLabel,
    ) as HTMLInputElement;
    expect(replacementFileInput.files).toHaveLength(0);
  });

  it("keeps drafts in component memory only and loses them on remount", () => {
    const copy = getDictionary("en").inputShell;
    const storageWrite = vi.spyOn(Storage.prototype, "setItem");
    const pushState = vi.spyOn(history, "pushState");
    const replaceState = vi.spyOn(history, "replaceState");
    const firstRender = render(<AnalysisInput copy={copy} />);

    fireEvent.change(
      screen.getByRole("textbox", { name: copy.modes.text.fieldLabel }),
      { target: { value: "not persisted" } },
    );
    firstRender.unmount();
    render(<AnalysisInput copy={copy} />);

    expect(
      screen.getByRole("textbox", { name: copy.modes.text.fieldLabel }),
    ).toHaveValue("");
    expect(storageWrite).not.toHaveBeenCalled();
    expect(pushState).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it("discards the active draft on page lifecycle navigation events", () => {
    const copy = getDictionary("en").inputShell;
    render(<AnalysisInput copy={copy} />);

    fireEvent.click(
      screen.getByRole("tab", { name: copy.modes.url.tabLabel }),
    );
    const urlInput = screen.getByRole("textbox", {
      name: copy.modes.url.fieldLabel,
    });
    fireEvent.change(urlInput, {
      target: { value: "https://example.test/not-persisted" },
    });
    expect(urlInput).toHaveAttribute("autocomplete", "off");

    fireEvent(window, new Event("pagehide"));

    expect(
      screen.getByRole("tab", { name: copy.modes.text.tabLabel }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("textbox", { name: copy.modes.text.fieldLabel }),
    ).toHaveValue("");
  });
});
