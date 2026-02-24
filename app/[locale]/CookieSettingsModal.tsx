"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CookiePreferences } from "@/lib/cookieConsent";

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

interface Props {
  onSave: (prefs: CookiePreferences) => void;
  onClose: () => void;
  initialPrefs: CookiePreferences;
}

export default function CookieSettingsModal({ onSave, onClose, initialPrefs }: Props) {
  const t = useTranslations("cookies");
  const [analytics, setAnalytics] = useState(initialPrefs.analytics);
  const [marketing, setMarketing] = useState(initialPrefs.marketing);

  const handleSave = () => {
    onSave({
      essential: true,
      analytics,
      marketing,
      timestamp: Date.now(),
    });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" aria-hidden onClick={onClose} />
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--card-border)] bg-white shadow-xl"
        role="dialog"
        aria-labelledby="cookie-settings-title"
        aria-modal="true"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-[var(--card-border)] bg-white px-4 py-3">
          <h2 id="cookie-settings-title" className="text-lg font-semibold text-[var(--foreground)]">
            {t("settingsTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--foreground-muted)] transition hover:bg-slate-100 hover:text-[var(--foreground)]"
            aria-label={t("close")}
          >
            <CloseIcon />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <p className="text-sm text-[var(--foreground-muted)]">
            {t("settingsDescription")}{" "}
            <Link href="/privacy" className="underline hover:text-[var(--accent)]">
              {t("privacyPolicy")}
            </Link>
          </p>

          {/* Essential - always on */}
          <div className="flex items-start justify-between gap-4 rounded-lg border border-[var(--card-border)] p-4">
            <div>
              <h3 className="font-semibold text-[var(--foreground)]">{t("essentialTitle")}</h3>
              <p className="mt-1 text-xs text-[var(--foreground-muted)]">{t("essentialDesc")}</p>
            </div>
            <span className="shrink-0 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-[var(--foreground-muted)]">
              {t("alwaysActive")}
            </span>
          </div>

          {/* Analytics */}
          <div className="flex items-start justify-between gap-4 rounded-lg border border-[var(--card-border)] p-4">
            <div>
              <h3 className="font-semibold text-[var(--foreground)]">{t("analyticsTitle")}</h3>
              <p className="mt-1 text-xs text-[var(--foreground-muted)]">{t("analyticsDesc")}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={analytics}
              onClick={() => setAnalytics(!analytics)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                analytics ? "bg-[var(--accent)]" : "bg-slate-200"
              }`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
                  analytics ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>

          {/* Marketing */}
          <div className="flex items-start justify-between gap-4 rounded-lg border border-[var(--card-border)] p-4">
            <div>
              <h3 className="font-semibold text-[var(--foreground)]">{t("marketingTitle")}</h3>
              <p className="mt-1 text-xs text-[var(--foreground-muted)]">{t("marketingDesc")}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={marketing}
              onClick={() => setMarketing(!marketing)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                marketing ? "bg-[var(--accent)]" : "bg-slate-200"
              }`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
                  marketing ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--card-border)] p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-slate-50"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            {t("savePreferences")}
          </button>
        </div>
      </div>
    </div>
  );
}
