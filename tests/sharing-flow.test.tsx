import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResultSharing } from "@/components/result-sharing";
import { encodeShareCard } from "@/browser/sharing/card";
import { getDictionary } from "@/i18n/dictionaries";
import { sharingFixture } from "./helpers/sharing";
vi.mock("@/browser/sharing/card", () => ({ encodeShareCard: vi.fn() }));
const encode = vi.mocked(encodeShareCard);
function setup(locale: "it" | "en" = "en") {
  const d = getDictionary(locale);
  const mounted = render(
    <ResultSharing
      result={sharingFixture}
      locale={locale}
      analysis={d.analysis}
      copy={d.sharing}
      brand={d.landing.brand}
    />,
  );
  return { d, ...mounted };
}
function clipboard(
  writeText = vi.fn().mockResolvedValue(undefined),
  write = vi.fn().mockResolvedValue(undefined),
) {
  vi.stubGlobal("navigator", { clipboard: { writeText, write } });
  vi.stubGlobal(
    "ClipboardItem",
    class {
      static supports = () => true;
      constructor(readonly data: Record<string, Promise<Blob>>) {}
    },
  );
  return { writeText, write };
}
describe("explicit user-initiated sharing", () => {
  it.each(["it", "en"] as const)(
    "copies localized text/badge with safe disclosure in %s",
    async (locale) => {
      const { writeText, write } = clipboard();
      const { d } = setup(locale);
      expect(writeText).not.toHaveBeenCalled();
      expect(write).not.toHaveBeenCalled();
      expect(encode).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: d.sharing.copyText }));
      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(
          d.sharing.textCopied,
        ),
      );
      expect(writeText.mock.calls[0]![0]).toContain("Wh");
      expect(writeText.mock.calls[0]![0]).toContain(d.analysis.demoNotice);
      fireEvent.click(
        screen.getByRole("button", { name: d.sharing.copyBadge }),
      );
      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(
          d.sharing.badgeCopied,
        ),
      );
      expect(writeText.mock.calls[1]![0]).toContain(
        sharingFixture.methodologyVersion,
      );
      expect(writeText.mock.calls[1]![0]).toContain(d.sharing.disclaimer);
      expect(writeText.mock.calls[1]![0]).not.toContain("Wh");
    },
  );
  it.each(["missing", "denied"])(
    "offers focused/selectable manual text when clipboard is %s",
    async (failure) => {
      if (failure === "missing") vi.stubGlobal("navigator", {});
      else
        clipboard(vi.fn().mockRejectedValue(new Error("permission details")));
      const { d } = setup();
      fireEvent.click(
        screen.getByRole("button", { name: d.sharing.copyBadge }),
      );
      const field = await screen.findByRole("textbox", {
        name: d.sharing.manualLabel,
      });
      await waitFor(() => expect(field).toHaveFocus());
      expect(field).toHaveAttribute("readonly");
      expect((field as HTMLTextAreaElement).selectionEnd).toBe(
        (field as HTMLTextAreaElement).value.length,
      );
      expect(screen.getByRole("status")).toHaveTextContent(
        d.sharing.textFallback,
      );
      expect(screen.queryByText("permission details")).not.toBeInTheDocument();
    },
  );
  it("starts clipboard writing inside the click with a pending PNG promise", async () => {
    let complete!: (blob: Blob) => void;
    encode.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const write = vi.fn(
      async (items: Array<{ data: Record<string, Promise<Blob>> }>) => {
        await items[0]!.data["image/png"];
      },
    );
    clipboard(undefined, write);
    const { d } = setup();
    fireEvent.click(screen.getByRole("button", { name: d.sharing.showCard }));
    expect(
      screen.getByRole("article", { name: d.sharing.cardTitle }),
    ).toHaveTextContent(d.analysis.demoNotice);
    fireEvent.click(screen.getByRole("button", { name: d.sharing.copyImage }));
    expect(write).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent(d.sharing.pending);
    expect(
      screen.getByRole("button", { name: d.sharing.copyText }),
    ).toBeDisabled();
    await act(async () => complete(new Blob(["png"], { type: "image/png" })));
    expect(screen.getByRole("status")).toHaveTextContent(d.sharing.imageCopied);
  });
  it.each(["unsupported", "denied", "encoding"])(
    "keeps full screenshot fallback after image copy is %s",
    async (reason) => {
      const { write } = clipboard();
      encode.mockResolvedValue(new Blob(["png"], { type: "image/png" }));
      if (reason === "unsupported") vi.stubGlobal("ClipboardItem", undefined);
      if (reason === "denied")
        write.mockRejectedValue(new Error("private diagnostics"));
      if (reason === "encoding") {
        encode.mockRejectedValue(new Error("encode failed"));
        write.mockImplementation(async (items) => {
          await items[0].data["image/png"];
        });
      }
      const { d } = setup();
      fireEvent.click(screen.getByRole("button", { name: d.sharing.showCard }));
      fireEvent.click(
        screen.getByRole("button", { name: d.sharing.copyImage }),
      );
      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(
          d.sharing.imageFallback,
        ),
      );
      const card = screen.getByRole("article", { name: d.sharing.cardTitle });
      expect(card).toHaveTextContent(sharingFixture.methodologyVersion);
      expect(card).toHaveTextContent(d.sharing.disclaimer);
      expect(card).toHaveTextContent(d.analysis.demoNotice);
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    },
  );
  it("aborts encoding on unmount and ignores late clipboard completion", async () => {
    let complete!: () => void;
    const write = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve;
        }),
    );
    clipboard(undefined, write);
    encode.mockResolvedValue(new Blob(["png"], { type: "image/png" }));
    const { d, unmount } = setup();
    fireEvent.click(screen.getByRole("button", { name: d.sharing.showCard }));
    fireEvent.click(screen.getByRole("button", { name: d.sharing.copyImage }));
    const signal = encode.mock.calls.at(-1)![1];
    unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => complete());
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(write).toHaveBeenCalledOnce();
  });
});
