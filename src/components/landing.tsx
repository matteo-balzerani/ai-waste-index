import { locales, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

import { AnalysisInput } from "./analysis-input";
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

export function Landing({
  dictionary,
  locale,
  maxTextCodePoints,
  maxUrlChars,
  ocrLimits,
}: LandingProps) {
  const { landing, navigation } = dictionary;

  return (
    <div className="site-shell" style={themeStyle}>
      <header className="site-header">
        <span className="brand"><BrandMark />{landing.brand}</span>
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

      <main className="landing-main">
        <AnalysisInput
          key={locale}
          copy={dictionary.inputShell}
          dictionary={dictionary}
          locale={locale}
          maxTextCodePoints={maxTextCodePoints}
          maxUrlChars={maxUrlChars}
          ocrLimits={ocrLimits}
        />

      </main>
      <footer className="site-footer">
        <details className="estimate-notice">
          <summary>{dictionary.inputShell.estimateLink}</summary>
          <div className="disclosure-body">
            <h2>{landing.estimateNoticeTitle}</h2>
            <p>{landing.estimateNoticeBody}</p>
            <p>{dictionary.analysis.methodologyBody}</p>
            <p>{dictionary.analysis.experimentalNotice}</p>
            <p>{dictionary.analysis.disclaimer}</p>
            <p>{dictionary.inputShell.privacyNotice}</p>
          </div>
        </details>
      </footer>
    </div>
  );
}
