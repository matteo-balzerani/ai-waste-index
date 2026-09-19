import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";

import { defaultLocale, locales, type Locale } from "./config";

export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (acceptLanguage === null || acceptLanguage.trim() === "") {
    return defaultLocale;
  }

  try {
    const requestedLanguages = new Negotiator({
      headers: { "accept-language": acceptLanguage },
    }).languages();

    return match(requestedLanguages, locales, defaultLocale) as Locale;
  } catch {
    return defaultLocale;
  }
}
