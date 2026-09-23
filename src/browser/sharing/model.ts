import type { PublicResult } from "@/contracts";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

export interface ShareModel {
  brand: string;
  context: string;
  scoreLabel: string;
  score: string;
  classLabel: string;
  className: string;
  methodology: string;
  disclaimer: string;
  demoNotice: string | null;
  experimentalNotice: string | null;
  badgeText: string;
  resultText: string;
  metrics: Array<{ label: string; value: string; range: string }>;
}
// Presentation only. No input content, URL, image or estimator calculation is available here.
export function createShareModel(
  result: PublicResult,
  locale: Locale,
  analysis: Dictionary["analysis"],
  share: Dictionary["sharing"],
  brand: string,
): ShareModel {
  const format = new Intl.NumberFormat(locale, { maximumSignificantDigits: 3 });
  const score = `${new Intl.NumberFormat(locale).format(result.score)}/100`;
  const methodology = `${analysis.methodologyVersion}: ${result.methodologyVersion}`;
  const demoNotice = result.methodologyVersion.startsWith("stub-")
    ? analysis.demoNotice
    : null;
  const experimentalNotice = result.methodologyVersion.startsWith("experimental-")
    ? analysis.experimentalNotice : null;
  const disclaimer = [share.disclaimer,
    ...(result.score === 0 && result.estimates.energyWh.value > 0 ? [analysis.zeroScoreNotice] : []),
  ].join(" ");
  const summary = [
    brand,
    share.context,
    `${analysis.scoreLabel}: ${score}`,
    `${analysis.classLabel} ${result.class}`,
  ];
  const footer = [
    methodology,
    disclaimer,
    ...(demoNotice ? [demoNotice] : []),
    ...(experimentalNotice ? [experimentalNotice] : []),
  ];
  const metrics = [
    [analysis.energy, "energyWh", "Wh"],
    [analysis.carbon, "co2eGrams", "gCO2e"],
    [analysis.water, "waterMl", "mL"],
  ] as const;
  return {
    brand,
    context: share.context,
    scoreLabel: analysis.scoreLabel,
    score,
    classLabel: analysis.classLabel,
    className: result.class,
    methodology,
    disclaimer,
    demoNotice,
    experimentalNotice,
    metrics: metrics.map(([label, key, unit]) => {
      const metric = result.estimates[key];
      return { label, value: `${format.format(metric.value)} ${unit}`,
        range: `${analysis.estimatedRange}: ${format.format(metric.low)}–${format.format(metric.high)} ${unit}` };
    }),
    badgeText: [...summary, ...footer].join("\n"),
    resultText: [
      ...summary,
      "",
      analysis.estimatesTitle,
      ...metrics.map(([label, key, unit]) => {
        const metric = result.estimates[key];
        return `${label}: ${format.format(metric.value)} ${unit} (${analysis.estimatedRange}: ${format.format(metric.low)}–${format.format(metric.high)} ${unit})`;
      }),
      "",
      ...footer,
    ].join("\n"),
  };
}
