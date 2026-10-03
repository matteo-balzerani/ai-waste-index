"use client";

import { useEffect, useRef } from "react";
import type { PublicResult } from "@/contracts";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import { classStyle } from "@/presentation/theme";
import { UiIcon } from "./ui-icon";
import { ResultSharing } from "./result-sharing";

export function AnalysisResult({ result, locale, copy, sharing, brand, onReset }: {
  result: PublicResult;
  locale: Locale;
  copy: Dictionary["analysis"];
  sharing: Dictionary["sharing"];
  brand: string;
  onReset: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  // Display formatting only: all values and the class come from the API.
  const format = new Intl.NumberFormat(locale, { maximumSignificantDigits: 3 });
  const demo = result.methodologyVersion.startsWith("stub-");
  const metrics = [
    { key: "energyWh", label: demo ? copy.demoEnergy : copy.energy, unit: "Wh", icon: "energy" },
    { key: "co2eGrams", label: demo ? copy.demoCarbon : copy.carbon, unit: "gCO2e", icon: "carbon" },
    { key: "waterMl", label: demo ? copy.demoWater : copy.water, unit: "mL", icon: "water" },
  ] as const;
  return (
    <section className="analysis-result" aria-labelledby="result-title">
      <div className="result-heading">
        <h1 id="result-title" ref={heading} tabIndex={-1}>{copy.resultTitle}</h1>
        <button className="text-action" type="button" onClick={onReset}>
          <UiIcon name="refresh" /> {copy.newAnalysis}
        </button>
      </div>
      <div className="result-ticket">
        <div className="score-summary">
          <div className="score-main">
            <p className="eyebrow">{copy.scoreLabel}</p>
            <p className="score-value">{result.score}<span>/100</span></p>
          </div>
          <div className="class-badge" style={classStyle(result.class)}>
            <span>{copy.classLabel}</span><strong>{result.class}</strong>
          </div>
        </div>
        <div className="result-meta">
          <span className="estimate-chip">
            <span aria-hidden="true" className="status-dot" />
            {demo ? copy.demoLabel : copy.experimentalLabel}
          </span>
          <span className="version-label">{copy.methodologyVersion}: {result.methodologyVersion}</span>
        </div>
        {demo && <p className="demo-notice" role="note">{copy.demoNotice}</p>}
        {result.score === 0 && <p className="zero-notice" role="note">{copy.zeroScoreNotice}</p>}
        {!demo && <div className="result-disclosures">
          <p>{copy.generationNotice} {copy.scoreBasis}</p>
          <p>{copy.experimentalNotice} {sharing.disclaimer}</p>
        </div>}
        <div className="metrics-heading"><h2>{demo ? copy.demoLabel : copy.estimatesTitle}</h2></div>
        <div className="metric-grid">
          {metrics.map(({ key, label, unit, icon }) => {
            const metric = result.estimates[key];
            return <article className="metric" key={key} aria-describedby={!demo && key !== "energyWh" ? "environment-note" : undefined}>
              <h3><span className={`metric-icon ${key}`} aria-hidden="true"><UiIcon name={icon} /></span>{label}</h3>
              <p className="metric-value"><span className="sr-only">{demo ? copy.demoLabel : copy.estimatedValue} </span><strong>{format.format(metric.value)}</strong> <span>{unit}</span></p>
              <p className="metric-range"><span>{demo ? copy.demoRange : copy.estimatedRange}{!demo && key !== "energyWh" ? "*" : ""}</span><br />{format.format(metric.low)}–{format.format(metric.high)} {unit}</p>
            </article>;
          })}
        </div>
        {!demo && <p id="environment-note" className="environment-note" role="note">{copy.environmentNotice}</p>}
        <details className="methodology-copy">
          <summary>{copy.methodologyTitle}</summary>
          <div className="disclosure-body">
            {!demo && <><p>{copy.methodologyBody}</p><p>{copy.disclaimer}</p><p>{copy.inferenceNotice}</p><p>{copy.comparabilityNotice}</p></>}<p>{copy.privacy}</p>
          </div>
        </details>
      </div>
      <ResultSharing result={result} locale={locale} analysis={copy} copy={sharing} brand={brand} />
    </section>
  );
}
