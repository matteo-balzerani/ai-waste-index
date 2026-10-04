import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnalysisResult } from "@/components/analysis-result";
import { createShareModel } from "@/browser/sharing/model";
import { getDictionary } from "@/i18n/dictionaries";
import { sharingFixture } from "./helpers/sharing";

// Arbitrary black-box values; no scientific fixtures or method/version lookup table.
for (const locale of ["it", "en"] as const) {
  describe(`${locale}: version-independent disclosures`, () => {
    const d = getDictionary(locale);
    for (const version of ["experimental-public-fixture", "0.7.3-example", "preview-public-fixture"]) {
      it(`preserves real estimate meaning for ${version}`, () => {
        const result = { ...sharingFixture, score: 0, methodologyVersion: version,
          estimates: { ...sharingFixture.estimates, energyWh: { low: 0.000001, value: 0.000002, high: 0.000003 } } };
        const model = createShareModel(result, locale, d.analysis, d.sharing, d.landing.brand);
        const openInfo = vi.fn();
        render(<AnalysisResult result={result} locale={locale} copy={d.analysis} sharing={d.sharing} brand={d.landing.brand} onReset={() => {}} onEnvironmentInfo={openInfo} />);
        expect(screen.getByText(d.analysis.experimentalLabel)).toBeInTheDocument();
        expect(screen.queryByText(d.analysis.environmentNotice)).not.toBeInTheDocument();
        expect(screen.queryByText(version)).not.toBeInTheDocument();
        for (const label of [d.analysis.compactCarbon, d.analysis.compactWater]) {
          fireEvent.click(screen.getByRole("button", { name: `${label}: ${d.analysis.environmentInfo}` }));
        }
        expect(openInfo).toHaveBeenCalledTimes(2);
        for (const text of [model.badgeText, model.resultText]) {
          for (const required of [version, d.analysis.scopeNotice, d.analysis.scoreBasis,
            d.analysis.experimentalNotice, d.analysis.zeroScoreNotice, d.sharing.disclaimer]) expect(text).toContain(required);
          expect(text).not.toContain(d.analysis.demoNotice);
        }
        for (const required of [d.analysis.environmentNotice, d.analysis.disclaimer, d.analysis.inferenceNotice,
          d.analysis.comparabilityNotice]) expect(model.resultText).toContain(required);
        expect(model.badgeText).not.toContain(d.analysis.environmentNotice);
        expect(model.metrics[0]!.value).toBe(`${new Intl.NumberFormat(locale, { maximumSignificantDigits: 3 }).format(0.000002)} Wh`);
        for (const metric of model.metrics.slice(1)) {
          expect(metric.label).toContain("*"); expect(metric.range).toContain("*");
        }
      });
    }
    it("labels all stub values as demonstration, without experimental claims", () => {
      const model = createShareModel(sharingFixture, locale, d.analysis, d.sharing, d.landing.brand);
      expect(model.experimentalNotice).toBeNull();
      for (const text of [model.badgeText, model.resultText]) {
        expect(text).toContain(d.analysis.demoNotice);
        expect(text).not.toContain(d.analysis.experimentalNotice);
        expect(text).not.toContain(d.analysis.generationNotice);
      }
      expect(model.metrics[0]!.label).toBe(d.analysis.demoEnergy);
    });
  });
}
