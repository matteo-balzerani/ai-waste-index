import { notFound } from "next/navigation";

import { Landing } from "@/components/landing";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

interface LocalePageProps {
  params: Promise<{ locale: string }>;
}

export default async function LocalePage({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return <Landing dictionary={getDictionary(locale)} locale={locale} />;
}
