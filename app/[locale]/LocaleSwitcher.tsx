"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { routing, localeToCountry } from "@/i18n/routing";

const LOCALE_LABELS: Record<string, string> = {
  it: "IT",
  fr: "FR",
  es: "ES",
  de: "DE",
  en: "UK",
  "pt-BR": "BR",
  "en-NG": "NG",
  "en-KE": "KE",
  "en-GH": "GH",
};

export default function LocaleSwitcher() {
  const pathname = usePathname();
  const currentLocale = useLocale();

  return (
    <div className="flex flex-wrap items-center gap-1 text-xs">
      {routing.locales.map((locale) => {
        const isActive = currentLocale === locale;
        return (
          <Link
            key={locale}
            href={pathname || "/"}
            locale={locale}
            className={`rounded px-2 py-1 transition ${
              isActive
                ? "bg-[var(--accent)] text-white font-medium"
                : "text-[var(--foreground-muted)] hover:bg-slate-100 hover:text-[var(--foreground)]"
            }`}
            title={localeToCountry[locale] ?? locale}
          >
            {LOCALE_LABELS[locale] ?? locale.toUpperCase()}
          </Link>
        );
      })}
    </div>
  );
}
