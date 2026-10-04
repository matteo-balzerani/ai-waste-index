export type TokenSource = "declared" | "text-matched" | "text-reference";
export const TOKENIZER_LABEL = "o200k_base · gpt-tokenizer 4.0.0";

export function textTokenSource(provider: string, model: string): TokenSource {
  return provider === "openai" && ["gpt-4o-mini", "gpt-4o", "gpt-5"].includes(model)
    ? "text-matched" : "text-reference";
}

export function textInputError(text: string): "emptyText" | "tooLarge" | "invalidText" | null {
  if ([...text].length > 50_000) return "tooLarge";
  if (!text.isWellFormed()) return "invalidText";
  return text.trim() ? null : "emptyText";
}
