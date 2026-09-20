import { describe, expect, it } from "vitest";

import { apiMessageCodes } from "@/contracts/codes";
import { defaultLocale, isLocale, locales } from "@/i18n/config";
import { assertDictionary, getDictionary } from "@/i18n/dictionaries";
import { negotiateLocale } from "@/i18n/negotiate";

describe("locale configuration", () => {
  it("supports exactly Italian and English with an explicit fallback", () => {
    expect(locales).toEqual(["it", "en"]);
    expect(defaultLocale).toBe("en");
    expect(isLocale("it")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
  });

  it.each([
    ["it-IT,it;q=0.9,en;q=0.5", "it"],
    ["en-GB,en;q=0.9,it;q=0.5", "en"],
    ["fr-FR,fr;q=0.9", "en"],
    ["*", "en"],
    ["not a language", "en"],
    [null, "en"],
    ["", "en"],
  ] as const)("negotiates %s as %s", (header, expected) => {
    expect(negotiateLocale(header)).toBe(expected);
  });
});

describe("translation dictionaries", () => {
  it.each(locales)("validates the %s dictionary", (locale) => {
    expect(() => assertDictionary(getDictionary(locale))).not.toThrow();
  });

  it.each(locales)("translates every documented API code in %s", (locale) => {
    const messages = getDictionary(locale).apiMessages;

    expect(Object.keys(messages).sort()).toEqual([...apiMessageCodes].sort());
    expect(Object.values(messages).every((message) => message.trim() !== "")).toBe(
      true,
    );
  });

  it("rejects missing, extra and blank dictionary values", () => {
    const missing = structuredClone(getDictionary("en")) as unknown as Record<
      string,
      unknown
    >;
    delete missing.navigation;

    const extra = structuredClone(getDictionary("en")) as unknown as Record<
      string,
      unknown
    >;
    extra.unexpected = "value";

    const blank = structuredClone(getDictionary("en"));
    blank.metadata.title = " ";

    expect(() => assertDictionary(missing)).toThrow(/keys/);
    expect(() => assertDictionary(extra)).toThrow(/keys/);
    expect(() => assertDictionary(blank)).toThrow(/string/);
  });
});
