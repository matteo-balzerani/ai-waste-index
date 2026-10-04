"use client";

import { useEffect, useRef } from "react";
import type { PublicResult } from "@/contracts";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import { classStyle } from "@/presentation/theme";
import { UiIcon } from "./ui-icon";
import { ResultSharing } from "./result-sharing";

export function AnalysisResult({ result, locale, copy, sharing, brand, onReset, onEnvironmentInfo }: {
  result: PublicResult;
  locale: Locale;
  copy: Dictionary["analysis"];
  sharing: Dictionary["sharing"];
  brand: string;
  onReset: () => void;
  onEnvironmentInfo: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  // Display formatting only: all values and the class come from the API.
  const format = new Intl.NumberFormat(locale, { maximumSignificantDigits: 3 });
  const demo = result.methodologyVersion.startsWith("stub-");
  const metrics = [
    { key: "energyWh", label: copy.compactEnergy, unit: "Wh", icon: "energy" },
    { key: "co2eGrams", label: copy.compactCarbon, unit: "gCO2e", icon: "carbon" },
    { key: "waterMl", label: copy.compactWater, unit: "mL", icon: "water" },
  ] as const;
  return (
    <section className="analysis-result" aria-labelledby="result-title">
      <div className="result-heading">
        <h1 id="result-title" className="sr-only" ref={heading} tabIndex={-1}>{copy.resultTitle}</h1>
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
        </div>
        <div className="metric-grid">
          {metrics.map(({ key, label, unit, icon }) => {
            const metric = result.estimates[key];
            const environmental = !demo && key !== "energyWh";
            return <article className="metric" key={key}>
              <h2><span className={`metric-icon ${key}`} aria-hidden="true"><UiIcon name={icon} /></span>{label}
                {environmental && <button className="metric-info" type="button" aria-haspopup="dialog"
                  aria-label={`${label}: ${copy.environmentInfo}`} onClick={onEnvironmentInfo}>*</button>}
              </h2>
              <p className="metric-value"><span className="sr-only">{demo ? copy.demoLabel : copy.estimatedValue} </span><strong>{format.format(metric.value)}</strong> <span>{unit}</span></p>
              <p className="metric-range"><span className="sr-only">{demo ? copy.demoRange : copy.estimatedRange}: </span>{format.format(metric.low)}–{format.format(metric.high)} {unit}
                {environmental && <button className="metric-info" type="button" aria-haspopup="dialog"
                  aria-label={`${label}: ${copy.estimatedRange} — ${copy.environmentInfo}`} onClick={onEnvironmentInfo}>*</button>}
              </p>
            </article>;
          })}
        </div>
      </div>
      <ResultSharing result={result} locale={locale} analysis={copy} copy={sharing} brand={brand} />
    </section>
  );
}
