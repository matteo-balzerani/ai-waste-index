"use client";

import { useEffect, useRef, useState } from "react";
import { locales, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

import { AnalysisInput, type AnalysisInputHandle } from "./analysis-input";
import { AdvancedInput } from "./advanced-input";
import { themeStyle } from "@/presentation/theme";
import { BrandMark } from "./brand-mark";

import type { OcrLimits } from "@/browser/ocr/types";

interface LandingProps {
  dictionary: Dictionary;
  locale: Locale;
  maxTextCodePoints: number | null;
  maxUrlChars?: number | null;
  ocrLimits?: OcrLimits | null;
}

export function Landing(props: LandingProps) {
  return <ProductSurface key={props.locale} {...props} />;
}

function ProductSurface({
  dictionary,
  locale,
  maxTextCodePoints,
  maxUrlChars,
  ocrLimits,
}: LandingProps) {
  const { landing, navigation } = dictionary;
  const [mode, setMode] = useState<"blame" | "advanced">("blame");
  const [generation, setGeneration] = useState(0);
  const blame = useRef<AnalysisInputHandle>(null);

  useEffect(() => {
    const discard = () => { setMode("blame"); setGeneration(value => value + 1); };
    window.addEventListener("pagehide", discard);
    window.addEventListener("pageshow", discard);
    return () => {
      window.removeEventListener("pagehide", discard);
      window.removeEventListener("pageshow", discard);
    };
  }, []);

  return (
    <div className="site-shell" style={themeStyle}>
      <header className="site-header">
        <span className="brand"><BrandMark />{landing.brand}</span>
        <div className="product-modes" role="group" aria-label={dictionary.productModes.label}>
          {(["blame", "advanced"] as const).map(value => <button key={value} type="button"
            aria-pressed={mode === value} aria-controls={`product-${value}`}
            onClick={() => {
              if (value === "advanced" && mode === "blame") blame.current?.suspend();
              setMode(value);
            }}>{dictionary.productModes[value]}</button>)}
        </div>
        <nav aria-label={navigation.languageSelectorLabel}>
          <ul className="locale-list">
            {locales.map((candidate) => (
              <li key={candidate}>
                <a
                  aria-current={candidate === locale ? "page" : undefined}
                  className="locale-link"
                  href={`/${candidate}`}
                  hrefLang={candidate}
                  aria-label={candidate === "it" ? navigation.italian : navigation.english}
                >
                  {candidate.toUpperCase()}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <div id="product-blame" className="mode-surface" hidden={mode !== "blame"}>
        <AnalysisInput
          key={generation}
          ref={blame}
          active={mode === "blame"}
          copy={dictionary.inputShell}
          dictionary={dictionary}
          locale={locale}
          maxTextCodePoints={maxTextCodePoints}
          maxUrlChars={maxUrlChars}
          ocrLimits={ocrLimits}
      />
      </div>
      <div id="product-advanced" className="mode-surface" hidden={mode !== "advanced"}>
        <AdvancedInput key={generation} dictionary={dictionary} />
      </div>
    </div>
  );
}
