import { notFound } from "next/navigation";

import { Landing } from "@/components/landing";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

import { loadInputLimits } from "@/server/analysis/config";

import { loadExtractionConfig } from "@/server/extraction/config";

import { loadOcrLimits } from "@/server/ocr-config";
import type { OcrLimits } from "@/browser/ocr/types";

export const dynamic = "force-dynamic";

interface LocalePageProps {
  params: Promise<{ locale: string }>;
}

export default async function LocalePage({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  let maxTextCodePoints: number | null = null;
  try {
    maxTextCodePoints = loadInputLimits().maxTextCodePoints;
  } catch {
    // Configuration values/errors must not be exposed to browser clients.
  }
  let maxUrlChars: number | null = null;
  try {
    maxUrlChars = loadExtractionConfig().maxUrlChars;
  } catch {
    /* Safe unavailable state. */
  }
  let ocrLimits: OcrLimits | null = null;
  try {
    ocrLimits = loadOcrLimits();
  } catch {
    /* Safe unavailable state. */
  }
  return (
    <Landing
      dictionary={getDictionary(locale)}
      locale={locale}
      maxTextCodePoints={maxTextCodePoints}
      maxUrlChars={maxUrlChars}
      ocrLimits={ocrLimits}
    />
  );
}
