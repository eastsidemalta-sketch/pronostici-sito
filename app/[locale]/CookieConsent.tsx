"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  getCookieConsent,
  setCookieConsent,
  hasUserConsented,
  type CookiePreferences,
  DEFAULT_PREFERENCES,
} from "@/lib/cookieConsent";
import CookieSettingsModal from "./CookieSettingsModal";

export default function CookieConsent() {
  const t = useTranslations("cookies");
  const locale = useLocale();
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setVisible(!hasUserConsented(locale));
  }, [locale]);

  const acceptAll = () => {
    setCookieConsent(
      {
        ...DEFAULT_PREFERENCES,
        essential: true,
        analytics: true,
        marketing: true,
      },
      locale
    );
    setVisible(false);
  };

  const rejectAll = () => {
    setCookieConsent(
      {
        ...DEFAULT_PREFERENCES,
        essential: true,
        analytics: false,
        marketing: false,
      },
      locale
    );
    setVisible(false);
  };

  const openSettings = () => {
    setShowSettings(true);
  };

  const handleSaveSettings = (prefs: CookiePreferences) => {
    setCookieConsent(prefs, locale);
    setVisible(false);
    setShowSettings(false);
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  if (!visible && !showSettings) return null;

  return (
    <>
      {visible && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[100] border-t border-[var(--card-border)] bg-white p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] md:bottom-4 md:left-4 md:right-auto md:max-w-md md:rounded-xl md:border"
          role="dialog"
          aria-labelledby="cookie-consent-title"
          aria-describedby="cookie-consent-desc"
        >
          <div className="mx-auto max-w-6xl md:mx-0">
            <h2 id="cookie-consent-title" className="text-sm font-semibold text-[var(--foreground)]">
              {t("title")}
            </h2>
            <p id="cookie-consent-desc" className="mt-1 text-xs text-[var(--foreground-muted)]">
              {t("description")}{" "}
              <Link href="/privacy" className="underline hover:text-[var(--accent)]">
                {t("privacyPolicy")}
              </Link>
            </p>
            <div className="mt-4 flex flex-nowrap justify-between gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={acceptAll}
                className="min-w-0 flex-1 rounded-lg bg-[var(--accent)] px-2 py-1.5 text-[10px] font-semibold text-white transition hover:opacity-90 active:scale-[0.98] sm:flex-initial sm:px-4 sm:py-2 sm:text-xs"
              >
                {t("acceptAll")}
              </button>
              <button
                type="button"
                onClick={rejectAll}
                className="min-w-0 flex-1 rounded-lg border border-[var(--card-border)] bg-white px-2 py-1.5 text-[10px] font-semibold text-[var(--foreground)] transition hover:bg-slate-50 active:scale-[0.98] sm:flex-initial sm:px-4 sm:py-2 sm:text-xs"
              >
                {t("rejectAll")}
              </button>
              <button
                type="button"
                onClick={openSettings}
                className="min-w-0 flex-1 rounded-lg border border-[var(--card-border)] bg-white px-2 py-1.5 text-[10px] font-semibold text-[var(--foreground)] transition hover:bg-slate-50 active:scale-[0.98] sm:flex-initial sm:px-4 sm:py-2 sm:text-xs"
              >
                {t("managePreferences")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <CookieSettingsModal
          onSave={handleSaveSettings}
          onClose={handleCloseSettings}
          initialPrefs={getCookieConsent() ?? DEFAULT_PREFERENCES}
        />
      )}
    </>
  );
}
