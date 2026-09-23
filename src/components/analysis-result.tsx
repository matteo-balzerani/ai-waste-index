"use client";

import { useEffect, useRef } from "react";
import type { PublicResult } from "@/contracts";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
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
  const metrics = [
    { key: "energyWh", label: copy.energy, unit: "Wh", icon: "↯" },
    { key: "co2eGrams", label: copy.carbon, unit: "gCO2e", icon: "◌" },
    { key: "waterMl", label: copy.water, unit: "mL", icon: "◒" },
  ] as const;
  return (
    <section className="analysis-result" aria-labelledby="result-title">
      <div className="result-heading">
        <h1 id="result-title" ref={heading} tabIndex={-1}>{copy.resultTitle}</h1>
        <button className="text-action" type="button" onClick={onReset}>
          <span aria-hidden="true">↺</span> {copy.newAnalysis}
        </button>
      </div>
      <div className="result-ticket">
        <div className="score-summary">
          <div className="score-main">
            <p className="eyebrow">{copy.scoreLabel}</p>
            <p className="score-value">{result.score}<span>/100</span></p>
          </div>
          <div className="class-badge">
            <span>{copy.classLabel}</span><strong>{result.class}</strong>
          </div>
        </div>
        <div className="result-meta">
          <span className="estimate-chip">
            <span aria-hidden="true" className="status-dot" />
            {result.methodologyVersion.startsWith("experimental-") ? copy.experimentalLabel : sharing.disclaimer}
          </span>
          <span className="version-label">{result.methodologyVersion}</span>
        </div>
        {result.methodologyVersion.startsWith("stub-") && <p className="demo-notice" role="note">{copy.demoNotice}</p>}
        {result.score === 0 && result.estimates.energyWh.value > 0 && <p className="zero-notice" role="note">{copy.zeroScoreNotice}</p>}
        <div className="metrics-heading"><h2>{copy.estimatesTitle}</h2></div>
        <div className="metric-grid">
          {metrics.map(({ key, label, unit, icon }) => {
            const metric = result.estimates[key];
            return <article className="metric" key={key}>
              <h3><span className={`metric-icon ${key}`} aria-hidden="true">{icon}</span>{label}</h3>
              <p className="metric-value"><span className="sr-only">{copy.estimatedValue} </span><strong>{format.format(metric.value)}</strong> <span>{unit}</span></p>
              <p className="metric-range"><span>{copy.estimatedRange}</span><br />{format.format(metric.low)}–{format.format(metric.high)} {unit}</p>
            </article>;
          })}
        </div>
        <details className="methodology-copy">
          <summary>{copy.methodologyTitle}</summary>
          <div className="disclosure-body">
            {result.methodologyVersion.startsWith("experimental-") && <p>{copy.experimentalNotice}</p>}
            <p>{copy.methodologyBody}</p><p>{copy.disclaimer}</p><p>{copy.privacy}</p>
          </div>
        </details>
      </div>
      <ResultSharing result={result} locale={locale} analysis={copy} copy={sharing} brand={brand} />
    </section>
  );
}
