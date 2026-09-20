import Link from "next/link";

import { locales, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

import { AnalysisInput } from "./analysis-input";

interface LandingProps {
  dictionary: Dictionary;
  locale: Locale;
}

export function Landing({ dictionary, locale }: LandingProps) {
  const { landing, navigation } = dictionary;

  return (
    <div className="site-shell">
      <header className="site-header">
        <span className="brand">{landing.brand}</span>
        <nav aria-label={navigation.languageSelectorLabel}>
          <ul className="locale-list">
            {locales.map((candidate) => (
              <li key={candidate}>
                <Link
                  aria-current={candidate === locale ? "page" : undefined}
                  className="locale-link"
                  href={`/${candidate}`}
                  hrefLang={candidate}
                >
                  {candidate === "it" ? navigation.italian : navigation.english}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="landing-main">
        <section className="hero" aria-labelledby="page-title">
          <h1 id="page-title">{landing.title}</h1>
          <p>{landing.description}</p>
        </section>

        <AnalysisInput copy={dictionary.inputShell} />

        <aside className="estimate-notice" aria-labelledby="estimate-notice-title">
          <h2 id="estimate-notice-title">{landing.estimateNoticeTitle}</h2>
          <p>{landing.estimateNoticeBody}</p>
        </aside>
      </main>
    </div>
  );
}
