"use client";

import { useState, useRef, useEffect } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { routing, localeToCountry } from "@/i18n/routing";

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "";

/** Restituisce il path senza prefisso locale (evita /pt-BR/pt-BR) */
function pathWithoutLocale(pathname: string): string {
  const path = (pathname || "/").replace(/\/$/, "") || "/";
  const locales = routing.locales as readonly string[];
  for (const loc of locales) {
    if (path === `/${loc}`) return "/";
    if (path.startsWith(`/${loc}/`)) return path.slice(`/${loc}`.length) || "/";
  }
  return path || "/";
}

/** Full page navigation per cambio paese: evita cache client e garantisce dati corretti */
function getLocaleHref(locale: string, pathWithoutLoc: string): string {
  const path = pathWithoutLoc === "/" ? "" : pathWithoutLoc;
  return `${BASE_URL}/${locale}${path}`;
}

/** Mappa locale -> codice ISO paese per circle-flags (bandiere circolari SVG) */
const LOCALE_TO_ISO: Record<string, string> = {
  it: "it",
  "pt-BR": "br",
  fr: "fr",
  es: "es",
  de: "de",
  en: "gb",
  "en-NG": "ng",
  "en-KE": "ke",
  "en-GH": "gh",
  "es-CO": "co",
};

const CIRCLE_FLAGS_CDN = "https://hatscripts.github.io/circle-flags/flags";

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function HeaderCountrySelector() {
  const pathname = usePathname();
  const currentLocale = useLocale();
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const activeLocales = routing.locales as readonly string[];
  const pathForLink = pathWithoutLocale(pathname);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentName = localeToCountry[currentLocale] ?? currentLocale;
  const currentIso = LOCALE_TO_ISO[currentLocale] ?? "xx";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-white px-2.5 py-1.5 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--accent)]/50 hover:bg-[var(--background)] md:px-3 md:py-2"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t("selectCountry")}
      >
        <img
          src={`${CIRCLE_FLAGS_CDN}/${currentIso}.svg`}
          alt=""
          className="h-5 w-5 shrink-0 rounded-full object-cover md:h-6 md:w-6"
          width={24}
          height={24}
        />
        <span className="max-w-[80px] truncate sm:max-w-[100px]">{currentName}</span>
        <ChevronDownIcon className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded-lg border border-[var(--card-border)] bg-white py-1 shadow-lg"
        >
          {activeLocales.map((locale) => {
            const isActive = currentLocale === locale;
            const name = localeToCountry[locale] ?? locale;
            const iso = LOCALE_TO_ISO[locale] ?? "xx";
            const href = getLocaleHref(locale, pathForLink);
            return (
              <li key={locale} role="option" aria-selected={isActive}>
                <a
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm transition block w-full ${
                    isActive
                      ? "bg-[var(--accent-light)] font-semibold text-[var(--accent)]"
                      : "text-[var(--foreground)] hover:bg-[var(--background)]"
                  }`}
                >
                  <img
                    src={`${CIRCLE_FLAGS_CDN}/${iso}.svg`}
                    alt=""
                    className="h-5 w-5 shrink-0 rounded-full object-cover"
                    width={20}
                    height={20}
                  />
                  {name}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
