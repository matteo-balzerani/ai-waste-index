import { countTokens, setMergeCacheSize } from "gpt-tokenizer/encoding/o200k_base";
import { textInputError } from "./types";

// Only plain-text tokenization. No model pricing, chat framing or energy calculation.
setMergeCacheSize(0);
export function countVisibleTokens(text: string): number {
  if (textInputError(text)) throw new Error("INVALID_TEXT");
  return countTokens(text, { allowedSpecial: new Set(), disallowedSpecial: new Set() });
}
