import { afterEach, describe, expect, it, vi } from "vitest";
import { countVisibleTokens } from "@/browser/tokens/count";
import { createTokenCounter } from "@/browser/tokens/client";
import { textInputError, textTokenSource } from "@/browser/tokens/types";

afterEach(() => vi.useRealTimers());

describe("visible-text tokenization", () => {
  // Public o200k_base examples from the OpenAI cookbook, not energy fixtures.
  it.each([["antidisestablishmentarianism", 6], ["2 + 2 = 4", 7], ["お誕生日おめでとう", 8]] as const)(
    "matches the published tokenizer example %s", (text, count) => expect(countVisibleTokens(text)).toBe(count),
  );
  it("treats special-token spellings as ordinary text and preserves whitespace", () => {
    expect(countVisibleTokens("<|endoftext|>")).toBe(7);
    expect(countVisibleTokens("Hello")).toBe(1);
    expect(countVisibleTokens("Hello  ")).toBe(2);
  });
  it("validates full Unicode code points without trimming or truncating the bound", () => {
    expect(textInputError("😀".repeat(50_000))).toBeNull();
    expect(textInputError("😀".repeat(50_001))).toBe("tooLarge");
    expect(textInputError(" ".repeat(50_000) + "a")).toBe("tooLarge");
    expect(textInputError("\uD800")).toBe("invalidText");
    expect(textInputError(" \n\t")).toBe("emptyText");
    expect(() => countVisibleTokens("")).toThrow("INVALID_TEXT");
  });
  it("only marks verified exact provider/model selections as compatible", () => {
    for (const model of ["gpt-4o", "gpt-4o-mini", "gpt-5"]) expect(textTokenSource("openai", model)).toBe("text-matched");
    for (const [provider, model] of [["anthropic", "claude-sonnet-4-5"], ["google_genai", "gemini-2.5-flash"],
      ["mistralai", "mistral-small-latest"], ["openai", "gpt-5-unknown"], ["other", "gpt-5"]]) {
      expect(textTokenSource(provider!, model!)).toBe("text-reference");
    }
  });
});

function setup() {
  const worker = { postMessage: vi.fn(), terminate: vi.fn(), onmessage: null, onerror: null, onmessageerror: null } as unknown as Worker;
  const make = vi.fn(() => worker), controller = new AbortController();
  return { worker, make, controller, count: createTokenCounter(make) };
}
describe("bounded local count worker", () => {
  it("sends the full text only to a worker and terminates on success", async () => {
    const { count, worker, controller } = setup();
    const promise = count("  Local 😀\n", controller.signal);
    expect(worker.postMessage).toHaveBeenCalledWith("  Local 😀\n");
    worker.onmessage?.call(worker, new MessageEvent("message", { data: { count: 8 } }));
    await expect(promise).resolves.toBe(8);
    expect(worker.terminate).toHaveBeenCalledOnce(); expect(worker.onmessage).toBeNull();
  });
  it.each([{ count: 0 }, { count: 1.5 }, { count: 1_000_001 }, { count: NaN }, { error: "failure" }, null])(
    "fails closed on malformed worker output %#", async data => {
      const { count, worker, controller } = setup();
      const promise = count("local", controller.signal);
      worker.onmessage?.call(worker, new MessageEvent("message", { data }));
      await expect(promise).rejects.toThrow("TOKEN_COUNT_UNAVAILABLE");
      expect(worker.terminate).toHaveBeenCalledOnce();
    },
  );
  it("terminates at deadline, rejects once and ignores late completion", async () => {
    vi.useFakeTimers();
    const { count, worker, controller } = setup();
    const promise = count("local", controller.signal), rejected = expect(promise).rejects.toThrow("TOKEN_COUNT_UNAVAILABLE");
    const late = worker.onmessage;
    await vi.advanceTimersByTimeAsync(10_000); await rejected;
    late?.call(worker, new MessageEvent("message", { data: { count: 9 } }));
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it("aborts immediately and does not create workers for invalid or pre-aborted inputs", async () => {
    const { count, worker, make, controller } = setup();
    const promise = count("local", controller.signal); controller.abort();
    await expect(promise).rejects.toThrow(); expect(worker.terminate).toHaveBeenCalledOnce();
    await expect(count("new", controller.signal)).rejects.toThrow();
    await expect(count(" ", new AbortController().signal)).rejects.toThrow();
    expect(make).toHaveBeenCalledOnce();
  });
  it("suppresses worker diagnostics and terminates on load failure", async () => {
    const { count, worker, controller } = setup();
    const promise = count("local", controller.signal), event = new ErrorEvent("error", { message: "sensitive", cancelable: true });
    worker.onerror?.call(worker, event);
    await expect(promise).rejects.toThrow("TOKEN_COUNT_UNAVAILABLE");
    expect(event.defaultPrevented).toBe(true); expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
