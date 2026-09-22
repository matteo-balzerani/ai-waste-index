import { describe, expect, it } from "vitest";
import { createShareModel } from "@/browser/sharing/model";
import { getDictionary } from "@/i18n/dictionaries";
import { sharingFixture } from "./helpers/sharing";

describe("public sharing presentation", () => {
  it.each(["it", "en"] as const)("includes experimental status and zero-score meaning in every %s share", locale => {
    const d = getDictionary(locale);
    const model = createShareModel({ ...sharingFixture, score: 0, methodologyVersion: "experimental-contract-fixture" }, locale, d.analysis, d.sharing, d.landing.brand);
    expect(model.experimentalNotice).toBe(d.analysis.experimentalNotice);
    expect(model.demoNotice).toBeNull();
    for (const text of [model.resultText, model.badgeText]) {
      expect(text).toContain(d.analysis.experimentalNotice);
      expect(text).toContain(d.analysis.zeroScoreNotice);
      expect(text).not.toContain(d.analysis.demoNotice);
    }
  });
  it.each(["it", "en"] as const)(
    "preserves returned fields and disclosure in every %s output",
    (locale) => {
      const dictionary = getDictionary(locale);
      const before = JSON.stringify(sharingFixture);
      const model = createShareModel(
        sharingFixture,
        locale,
        dictionary.analysis,
        dictionary.sharing,
        dictionary.landing.brand,
      );
      for (const text of [model.resultText, model.badgeText]) {
        expect(text).toContain("23/100");
        expect(text).toContain(`${dictionary.analysis.classLabel} G`);
        expect(text).toContain(sharingFixture.methodologyVersion);
        expect(text).toContain(dictionary.sharing.disclaimer);
        expect(text).toContain(dictionary.sharing.context);
        expect(text).toContain(dictionary.analysis.demoNotice);
        expect(text).not.toMatch(/https?:|data:|blob:/);
      }
      expect(model.resultText).toContain(
        locale === "it" ? "1,25 Wh" : "1.25 Wh",
      );
      expect(model.resultText).toContain(
        locale === "it" ? "0,1–3 Wh" : "0.1–3 Wh",
      );
      expect(model.resultText).toContain("0–0 gCO2e");
      expect(model.resultText).toContain("1–3 mL");
      expect(model.badgeText).not.toContain("gCO2e");
      expect(JSON.stringify(sharingFixture)).toBe(before);
    },
  );
  it.each([0, 100])(
    "formats score %s without deriving the returned class",
    (score) => {
      const d = getDictionary("en");
      const model = createShareModel(
        {
          ...sharingFixture,
          score,
          class: "C",
          methodologyVersion: "method-v2 👋",
        },
        "en",
        d.analysis,
        d.sharing,
        d.landing.brand,
      );
      expect(model.score).toBe(`${score}/100`);
      expect(model.className).toBe("C");
      expect(model.methodology).toContain("method-v2 👋");
      expect(model.demoNotice).toBeNull();
      expect(model.resultText).not.toContain(d.analysis.demoNotice);
    },
  );
});
