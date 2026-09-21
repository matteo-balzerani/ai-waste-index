"use client";

import { useEffect, useRef } from "react";
import type { PublicResult } from "@/contracts";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

import { ResultSharing } from "./result-sharing";

export function AnalysisResult({
  result,
  locale,
  copy,
  sharing,
  brand,
  onReset,
}: {
  result: PublicResult;
  locale: Locale;
  copy: Dictionary["analysis"];
  sharing: Dictionary["sharing"];
  brand: string;
  onReset: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  // Display formatting only: no score/class or environmental calculation.
  const format = new Intl.NumberFormat(locale, { maximumSignificantDigits: 3 });
  const metrics = [
    { key: "energyWh", label: copy.energy, unit: "Wh" },
    { key: "co2eGrams", label: copy.carbon, unit: "gCO2e" },
    { key: "waterMl", label: copy.water, unit: "mL" },
  ] as const;
  return (
    <section className="analysis-result" aria-labelledby="result-title">
      <h2 id="result-title" ref={heading} tabIndex={-1}>
        {copy.resultTitle}
      </h2>
      {result.methodologyVersion.startsWith("stub-") && (
        <p className="demo-notice" role="note">
          {copy.demoNotice}
        </p>
      )}
      <div className="score-summary">
        <div>
          <p>{copy.scoreLabel}</p>
          <p className="score-value">
            {result.score}
            <span> / 100</span>
          </p>
        </div>
        <p className="class-badge">
          {copy.classLabel} <strong>{result.class}</strong>
        </p>
      </div>
      <h3>{copy.estimatesTitle}</h3>
      <div className="metric-grid">
        {metrics.map(({ key, label, unit }) => {
          const metric = result.estimates[key];
          return (
            <article className="metric" key={key}>
              <h4>{label}</h4>
              <p>
                {copy.estimatedValue}
                <br />
                <strong>
                  {format.format(metric.value)} {unit}
                </strong>
              </p>
              <p>
                {copy.estimatedRange}
                <br />
                {format.format(metric.low)}–{format.format(metric.high)} {unit}
              </p>
            </article>
          );
        })}
      </div>
      <div className="methodology-copy">
        <h3>{copy.methodologyTitle}</h3>
        <p>{copy.methodologyBody}</p>
        <p>
          {copy.methodologyVersion}: <span>{result.methodologyVersion}</span>
        </p>
        <p>{copy.disclaimer}</p>
      </div>
      <ResultSharing
        result={result}
        locale={locale}
        analysis={copy}
        copy={sharing}
        brand={brand}
      />
      <p className="privacy-notice">{copy.privacy}</p>
      <button className="primary-action" type="button" onClick={onReset}>
        {copy.newAnalysis}
      </button>
    </section>
  );
}
