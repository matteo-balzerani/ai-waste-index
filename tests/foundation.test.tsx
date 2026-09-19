import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Landing } from "@/components/landing";
import { getDictionary } from "@/i18n/dictionaries";

describe("public application foundation", () => {
  it.each(["it", "en"] as const)(
    "renders the %s landing content from its dictionary",
    (locale) => {
      const dictionary = getDictionary(locale);
      render(<Landing dictionary={dictionary} locale={locale} />);

      expect(
        screen.getByRole("heading", { name: dictionary.landing.title }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("navigation", {
          name: dictionary.navigation.languageSelectorLabel,
        }),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { current: "page" })).toHaveAttribute(
        "href",
        `/${locale}`,
      );
    },
  );
});
