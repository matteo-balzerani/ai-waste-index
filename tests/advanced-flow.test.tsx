import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdvancedInput } from "@/components/advanced-input";
import { Landing } from "@/components/landing";
import { getDictionary } from "@/i18n/dictionaries";
import { sharingFixture } from "./helpers/sharing";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const d = getDictionary("en");
const c = d.advanced;
const change = (element: HTMLElement, value: string) => fireEvent.change(element, { target: { value } });
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const landing = (locale: "it" | "en" = "en") => <Landing dictionary={getDictionary(locale)} locale={locale}
  maxTextCodePoints={50000} maxUrlChars={8192} />;

function review(text = "User: Write a note\nAssistant: A note\nUser: Revise\nAssistant: A revised note") {
  fireEvent.click(screen.getByRole("radio", { name: c.chat }));
  change(screen.getByRole("textbox", { name: c.chatLabel }), text);
  click(c.review);
}

describe("Advanced prototype", () => {
  it.each(["it", "en"] as const)("shows only localized placeholders without requests or storage in %s", locale => {
    const dictionary = getDictionary(locale);
    const copy = dictionary.advanced;
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const storage = vi.spyOn(Storage.prototype, "setItem");
    render(<AdvancedInput dictionary={dictionary} />);
    change(screen.getByRole("textbox", { name: copy.textLabel }), "A synthetic final text.");
    fireEvent.click(screen.getByRole("button", { name: copy.preview }));
    expect(screen.getByRole("heading", { name: copy.resultTitle })).toHaveFocus();
    expect(screen.getAllByText(copy.undefinedValue)).toHaveLength(3);
    expect(screen.getByText(copy.textOnlyNotice)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: dictionary.sharing.open })).not.toBeInTheDocument();
    expect(screen.queryByText(dictionary.analysis.scoreLabel)).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled(); expect(storage).not.toHaveBeenCalled();
  });

  it("requires assigned, nonempty messages and an assistant before confirmation", () => {
    render(<AdvancedInput dictionary={d} />);
    review("Unstructured chat");
    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: c.preview })).toBeDisabled();
    change(screen.getByRole("combobox"), "user");
    expect(screen.getByRole("checkbox")).toBeDisabled();
    change(screen.getByRole("combobox"), "assistant");
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: c.preview })).toBeEnabled();
    change(screen.getByRole("textbox", { name: c.content }), " ");
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });

  it("inherits model/reasoning, preserves overrides and zero tokens, and never counts reference text again", () => {
    render(<AdvancedInput dictionary={d} />);
    change(screen.getByLabelText(c.model), "General model");
    change(screen.getByLabelText(c.reasoning), "Declared level");
    review();
    const second = within(screen.getByRole("group", { name: "Message 4" }));
    change(second.getByLabelText(c.model), "Different model");
    change(second.getByLabelText(c.inputTokens), "0");
    change(second.getByLabelText(c.outputTokens), "123456789012345678901234567890");
    change(screen.getByRole("textbox", { name: c.reference }), "A revised note");
    fireEvent.click(screen.getByRole("checkbox")); click(c.preview);
    expect(screen.getAllByText(c.undefinedValue)).toHaveLength(9);
    expect(screen.getByRole("heading", { name: "Response 1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Response 2" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Response 3" })).not.toBeInTheDocument();
    expect(screen.getByText("Different model")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("123456789012345678901234567890")).toBeInTheDocument();
    expect(screen.getAllByText("General model")).toHaveLength(2);
    click(c.edit);
    change(screen.getByLabelText(c.model, { selector: "#advanced-general-model" }), "New general model");
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("splits at the cursor without losing content and supports add/remove", () => {
    render(<AdvancedInput dictionary={d} />);
    review("Assistant: First partSecond part");
    const content = screen.getByRole("textbox", { name: c.content }) as HTMLTextAreaElement;
    content.setSelectionRange(10, 10);
    fireEvent.click(screen.getByRole("checkbox")); click(c.split);
    expect(screen.getAllByRole("textbox", { name: c.content }).map(node => (node as HTMLTextAreaElement).value))
      .toEqual(["First part", "Second part"]);
    expect(screen.getAllByRole("combobox")[1]).toHaveValue("unknown");
    expect(screen.getAllByRole("combobox")[1]).toHaveFocus();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    click(c.add);
    expect(screen.getAllByRole("combobox")).toHaveLength(3);
    fireEvent.click(within(screen.getByRole("group", { name: "Message 3" })).getByRole("button", { name: c.remove }));
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    expect(screen.getByRole("button", { name: c.add })).toHaveFocus();
  });

  it("rejects empty, oversized and invalid input without truncation or preview", () => {
    render(<AdvancedInput dictionary={d} />);
    click(c.preview); expect(screen.getByRole("alert")).toHaveTextContent(c.emptyError);
    change(screen.getByRole("textbox", { name: c.textLabel }), "x".repeat(50001));
    click(c.preview); expect(screen.getByRole("alert")).toHaveTextContent(c.tooLarge);
    expect(screen.getByRole("textbox", { name: c.textLabel })).toHaveValue("x".repeat(50001));
    change(screen.getByRole("textbox", { name: c.textLabel }), "Short text");
    change(screen.getByLabelText(c.inputTokens), "-2");
    click(c.preview); expect(screen.getByRole("alert")).toHaveTextContent(c.tokenError);
    expect(screen.getByLabelText(c.inputTokens)).toHaveAttribute("aria-invalid", "true");
    review("Assistant: a\n".repeat(201));
    expect(screen.getByRole("alert")).toHaveTextContent(c.tooMany);
    expect(screen.getByRole("textbox", { name: c.chatLabel })).toHaveValue("Assistant: a\n".repeat(201));
  });

  it("replaces pasted chats only through review and invalidates confirmation", () => {
    render(<AdvancedInput dictionary={d} />); review();
    fireEvent.click(screen.getByRole("checkbox")); click(c.replacePaste);
    change(screen.getByRole("textbox", { name: c.chatLabel }), "Assistant: Replacement");
    expect(screen.getByRole("button", { name: c.preview })).toBeDisabled();
    click(c.review);
    expect(screen.getByRole("textbox", { name: c.content })).toHaveValue("Replacement");
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("does not apply the hidden final-text token fields to a chat", () => {
    render(<AdvancedInput dictionary={d} />);
    change(screen.getByLabelText(c.inputTokens), "invalid text-only count");
    review();
    fireEvent.click(screen.getByRole("checkbox")); click(c.preview);
    expect(screen.getByRole("heading", { name: c.resultTitle })).toBeInTheDocument();
  });
});

describe("product mode state isolation", () => {
  it("preserves both drafts and results only until navigation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(sharingFixture), { status: 200 })));
    render(landing());
    change(screen.getByRole("textbox", { name: d.inputShell.modes.text.fieldLabel }), "Blame draft");
    click(d.productModes.advanced);
    change(screen.getByRole("textbox", { name: c.textLabel }), "Advanced draft"); click(c.preview);
    click(d.productModes.blame);
    expect(screen.getByRole("textbox", { name: d.inputShell.modes.text.fieldLabel })).toHaveValue("Blame draft");
    click(d.analysis.submit);
    await screen.findByRole("heading", { name: d.analysis.resultTitle });
    click(d.productModes.advanced);
    expect(screen.getByRole("heading", { name: c.resultTitle })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: d.analysis.resultTitle })).not.toBeInTheDocument();
    click(d.productModes.blame);
    expect(screen.getByRole("heading", { name: d.analysis.resultTitle })).toBeInTheDocument();
    fireEvent(window, new Event("pagehide")); fireEvent(window, new Event("pageshow"));
    expect(screen.getByRole("textbox", { name: d.inputShell.modes.text.fieldLabel })).toHaveValue("");
    click(d.productModes.advanced);
    expect(screen.getByRole("textbox", { name: c.textLabel })).toHaveValue("");
  });

  it("cancels pending Blame work on switching and ignores stale completion", async () => {
    let resolve!: (response: Response) => void;
    const fetch = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
      () => new Promise<Response>(done => { resolve = done; }),
    );
    vi.stubGlobal("fetch", fetch); render(landing());
    change(screen.getByRole("textbox", { name: d.inputShell.modes.text.fieldLabel }), "Pending draft");
    click(d.analysis.submit); click(d.productModes.advanced);
    expect(fetch.mock.calls[0]?.[1].signal?.aborted).toBe(true);
    await act(async () => { resolve(new Response(JSON.stringify(sharingFixture), { status: 200 })); });
    click(d.productModes.blame);
    expect(screen.getByRole("textbox", { name: d.inputShell.modes.text.fieldLabel })).toHaveValue("Pending draft");
    expect(screen.getByRole("button", { name: d.analysis.submit })).toBeEnabled();
    expect(screen.queryByRole("heading", { name: d.analysis.resultTitle })).not.toBeInTheDocument();
  });

  it("clears both interfaces on locale change", () => {
    const view = render(landing()); click(d.productModes.advanced);
    change(screen.getByRole("textbox", { name: c.textLabel }), "Temporary");
    view.rerender(landing("it"));
    const italian = getDictionary("it");
    expect(screen.getByRole("button", { name: "Blame" })).toHaveAttribute("aria-pressed", "true");
    click(italian.productModes.advanced);
    expect(screen.getByRole("textbox", { name: italian.advanced.textLabel })).toHaveValue("");
  });
});
