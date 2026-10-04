import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdvancedInput } from "@/components/advanced-input";
import { Landing } from "@/components/landing";
import { getDictionary } from "@/i18n/dictionaries";
import { advancedCatalogFixture as catalog, advancedResultFixture as result } from "./helpers/advanced";
import { sharingFixture } from "./helpers/sharing";

const d = getDictionary("en"), c = d.advanced;
const response = (value: unknown) => new Response(JSON.stringify(value), { status: 200 });
const change = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name), { target: { value } });
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
function mock() {
  const fetch = vi.fn().mockImplementation((url: string) => Promise.resolve(response(
    url.endsWith("models") ? catalog : url === "/api/analyze" ? sharingFixture : result)));
  vi.stubGlobal("fetch", fetch); return fetch;
}
async function fill(copy = c) {
  await screen.findByRole("option", { name: "Provider A" });
  change(copy.provider, "provider-a"); change(copy.model, "model-a"); change(copy.outputTokens, "500");
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Advanced energy", () => {
  it.each(["it", "en"] as const)("estimates with optional local text and no persistence in %s", async locale => {
    const fetch = mock(), storage = vi.spyOn(Storage.prototype, "setItem");
    const dictionary = getDictionary(locale), copy = dictionary.advanced;
    render(<AdvancedInput dictionary={dictionary} locale={locale} />);
    await fill(copy); change(copy.reference, "Synthetic local-only reference"); click(copy.submit);
    expect(await screen.findByRole("heading", { name: copy.resultTitle })).toHaveFocus();
    expect(screen.getByTestId("advanced-energy")).toHaveTextContent(locale === "it" ? "0,12–0,34 Wh" : "0.12–0.34 Wh");
    expect(JSON.parse(fetch.mock.calls[1]![1].body)).toEqual({ provider: "provider-a", model: "model-a", outputTokens: 500 });
    expect(screen.getByText(copy.estimatedDuration)).toBeInTheDocument();
    expect(screen.getByText(copy.warnings.MODEL_ARCHITECTURE_ASSUMED)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: dictionary.sharing.open })).not.toBeInTheDocument();
    expect(storage).not.toHaveBeenCalled();
    change(copy.outputTokens, "501"); expect(screen.queryByTestId("advanced-energy")).not.toBeInTheDocument();
  });
  it("accepts declared decimal duration and displays tiny scalar without zero rounding", async () => {
    const fetch = mock(); render(<AdvancedInput dictionary={d} />); await fill();
    fetch.mockResolvedValueOnce(response({ ...result, energyWh: { kind: "point", value: 0.000000012345 }, durationSource: "declared" }));
    change(c.duration, "0,5"); click(c.submit);
    expect(await screen.findByTestId("advanced-energy")).toHaveTextContent("0.00000001235 Wh");
    expect(JSON.parse(fetch.mock.calls[1]![1].body).requestLatencySeconds).toBe(0.5);
    expect(screen.getByText(c.declaredDuration.replace("{seconds}", "0.5"))).toBeInTheDocument();
  });
  it.each(["", "0", "-1", "1.5", "1e3", "1000001", "true"])("rejects invalid count %j without request", async value => {
    const fetch = mock(); render(<AdvancedInput dictionary={d} />); await fill();
    change(c.outputTokens, value); click(c.submit);
    expect(screen.getByRole("alert")).toHaveTextContent(c.tokenError); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each(["0", "-1", "NaN", "3601", "1e2"])("rejects invalid duration %j", async value => {
    const fetch = mock(); render(<AdvancedInput dictionary={d} />); await fill();
    change(c.duration, value); click(c.submit);
    expect(screen.getByRole("alert")).toHaveTextContent(c.durationError); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("requires explicit selection, clears model on provider change and rejects long reference", async () => {
    const fetch = mock(); render(<AdvancedInput dictionary={d} />); await fill();
    change(c.provider, "provider-b"); expect(screen.getByLabelText(c.model)).toHaveValue("");
    click(c.submit); expect(screen.getByRole("alert")).toHaveTextContent(c.selectionError);
    change(c.model, "model-c"); change(c.reference, "😀".repeat(50001)); click(c.submit);
    expect(screen.getByRole("alert")).toHaveTextContent(c.tooLarge); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([
    { ...result, energyWh: { kind: "range", low: 2, high: 1 } },
    { ...result, energyWh: { kind: "range", low: 1, high: 2, value: 1.5 } },
    { ...result, warnings: ["UNKNOWN_WARNING"] },
    { ...result, durationSource: "declared" },
    { ...result, methodologyVersion: "different" },
  ])("rejects malformed or mismatched response %#", async body => {
    const fetch = mock(); render(<AdvancedInput dictionary={d} />); await fill();
    fetch.mockResolvedValueOnce(response(body)); click(c.submit);
    expect(await screen.findByRole("alert")).toHaveTextContent(c.unavailable);
    expect(screen.queryByTestId("advanced-energy")).not.toBeInTheDocument();
  });
  it("offers catalog retry and preserves inputs after API error", async () => {
    const fetch = mock(); fetch.mockResolvedValueOnce(new Response(null, { status: 503 }));
    render(<AdvancedInput dictionary={d} />); await screen.findByText(c.unavailable); click(c.retry); await fill();
    fetch.mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: "ESTIMATE_OUT_OF_DOMAIN" } }), { status: 422 }));
    click(c.submit); expect(await screen.findByRole("alert")).toHaveTextContent(d.apiMessages.ESTIMATE_OUT_OF_DOMAIN);
    expect(screen.getByLabelText(c.outputTokens)).toHaveValue("500"); click(c.submit);
    expect(await screen.findByTestId("advanced-energy")).toBeInTheDocument();
  });
});

describe("mode lifecycle", () => {
  const landing = (locale: "it" | "en" = "en") => <Landing dictionary={getDictionary(locale)} locale={locale} maxTextCodePoints={50000} />;
  it("loads no Advanced data while hidden, preserves drafts, clears on lifecycle/locale", async () => {
    const fetch = mock(); const view = render(landing()); expect(fetch).not.toHaveBeenCalled();
    change(d.inputShell.modes.text.fieldLabel, "Blame draft"); click(d.productModes.advanced); await fill();
    change(c.reference, "Local draft"); click(c.submit); await screen.findByTestId("advanced-energy");
    click(d.productModes.blame); expect(screen.getByLabelText(d.inputShell.modes.text.fieldLabel)).toHaveValue("Blame draft");
    click(d.productModes.advanced); expect(screen.getByTestId("advanced-energy")).toBeVisible();
    fireEvent(window, new Event("pagehide")); fireEvent(window, new Event("pageshow"));
    click(d.productModes.advanced); await fill(); expect(screen.getByLabelText(c.reference)).toHaveValue("");
    view.rerender(landing("it")); expect(screen.getByRole("button", { name: "Blame" })).toHaveAttribute("aria-pressed", "true");
    click(getDictionary("it").productModes.advanced); await screen.findByRole("option", { name: "Provider A" });
    expect(screen.getByLabelText(getDictionary("it").advanced.outputTokens)).toHaveValue("");
  });
  it("cancels Advanced work on mode switch and ignores stale replies", async () => {
    const fetch = mock(); render(landing()); click(d.productModes.advanced); await fill();
    let finish!: (value: Response) => void;
    fetch.mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }));
    click(c.submit); const signal = fetch.mock.calls[1]![1].signal as AbortSignal;
    click(d.productModes.blame); expect(signal.aborted).toBe(true);
    await act(async () => finish(response(result)));
    click(d.productModes.advanced); expect(screen.queryByTestId("advanced-energy")).not.toBeInTheDocument();
    expect(screen.getByLabelText(c.outputTokens)).toHaveValue("500");
    expect(screen.getByRole("button", { name: c.submit })).toBeEnabled();
  });
  it("cancels Blame work on switching without losing the draft", async () => {
    const fetch = mock(); render(landing()); let finish!: (value: Response) => void;
    fetch.mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }));
    change(d.inputShell.modes.text.fieldLabel, "Pending draft"); click(d.analysis.submit); click(d.productModes.advanced);
    expect(fetch.mock.calls[0]![1].signal.aborted).toBe(true);
    await act(async () => finish(response(sharingFixture)));
    click(d.productModes.blame);
    expect(screen.getByLabelText(d.inputShell.modes.text.fieldLabel)).toHaveValue("Pending draft");
    await waitFor(() => expect(screen.getByRole("button", { name: d.analysis.submit })).toBeEnabled());
  });
});
