import type { PublicResult } from "@/contracts";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

export interface ShareModel {
  brand: string;
  context: string;
  scoreLabel: string;
  score: string;
  scoreValue: string;
  classLabel: string;
  className: PublicResult["class"];
  methodology: string;
  disclaimer: string;
  demoNotice: string | null;
  experimentalNotice: string | null;
  badgeFooter: string[];
  cardFooter: string[];
  badgeText: string;
  resultText: string;
  metrics: Array<{ label: string; value: string; range: string }>;
}
// Presentation only: every numeric value and the exact version come from the black-box API.
export function createShareModel(
  result: PublicResult, locale: Locale, analysis: Dictionary["analysis"],
  share: Dictionary["sharing"], brand: string,
): ShareModel {
  const format = new Intl.NumberFormat(locale, { maximumSignificantDigits: 3 });
  const scoreValue = new Intl.NumberFormat(locale).format(result.score);
  const score = `${scoreValue}/100`;
  const methodology = `${analysis.methodologyVersion}: ${result.methodologyVersion} · ${result.source.name} ${result.source.version} · ${analysis.scoreVersion}: ${result.scoreVersion}`;
  const scenario = `${analysis.referenceScenario}: ${result.scenario.model} · ${result.scenario.outputTokens.toLocaleString(locale)} ${analysis.outputTokens}`;
  const warnings = result.warnings.map(code => analysis.warnings[code]);
  const demo = result.methodologyVersion.startsWith("stub-");
  const demoNotice = demo ? analysis.demoNotice : null;
  const experimentalNotice = demo ? null : analysis.experimentalNotice;
  const context = demo ? analysis.demoLabel : share.context;
  const disclaimer = [demo ? analysis.demoNotice : share.disclaimer,
    ...(result.score === 0 ? [analysis.zeroScoreNotice] : []),
  ].join(" ");
  const badgeFooter = [
    ...(!demo ? [scenario, analysis.tokenNotice, ...warnings, analysis.scopeNotice, analysis.scoreBasis, analysis.experimentalNotice] : []),
    disclaimer, methodology,
  ];
  const cardFooter = [
    ...(!demo ? [scenario, analysis.tokenNotice, ...warnings, analysis.scopeNotice, analysis.scoreBasis, analysis.environmentNotice,
      analysis.experimentalNotice, analysis.disclaimer, analysis.inferenceNotice, analysis.comparabilityNotice] : []),
    disclaimer, methodology,
  ];
  const summary = [brand, context, `${analysis.scoreLabel}: ${score}`, `${analysis.classLabel} ${result.class}`];
  const metrics = ([
    [demo ? analysis.demoEnergy : analysis.energy, "energyWh", "Wh"],
    [demo ? analysis.demoCarbon : analysis.carbon, "co2eGrams", "gCO2e"],
    [demo ? analysis.demoWater : analysis.water, "waterMl", "mL"],
  ] as const).map(([label, key, unit]) => {
    const metric = result.estimates[key];
    const rangeLabel = demo ? analysis.demoRange : analysis.estimatedRange + (key !== "energyWh" ? "*" : "");
    return { label, value: metric.kind === "point" ? `${format.format(metric.value)} ${unit}` : `${format.format(metric.low)}–${format.format(metric.high)} ${unit}`,
      range: metric.kind === "range" ? rangeLabel : (demo ? analysis.demoLabel : analysis.estimatedValue) };
  });
  return {
    brand, context, scoreLabel: analysis.scoreLabel, score, scoreValue,
    classLabel: analysis.classLabel, className: result.class, methodology, disclaimer,
    demoNotice, experimentalNotice, badgeFooter, cardFooter, metrics,
    badgeText: [...summary, ...badgeFooter].join("\n"),
    resultText: [...summary, "", demo ? analysis.demoLabel : analysis.estimatesTitle,
      ...metrics.map(metric => `${metric.label}: ${metric.value} (${metric.range})`),
      "", ...cardFooter].join("\n"),
  };
}
