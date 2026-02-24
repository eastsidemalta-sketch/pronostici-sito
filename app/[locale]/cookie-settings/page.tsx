"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import {
  getCookieConsent,
  setCookieConsent,
  type CookiePreferences,
  DEFAULT_PREFERENCES,
} from "@/lib/cookieConsent";

export default function CookieSettingsPage() {
  const t = useTranslations("cookies");
  const locale = useLocale();
  const router = useRouter();
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prefs = getCookieConsent();
    if (prefs) {
      setAnalytics(prefs.analytics);
      setMarketing(prefs.marketing);
    } else {
      setAnalytics(DEFAULT_PREFERENCES.analytics);
      setMarketing(DEFAULT_PREFERENCES.marketing);
    }
  }, []);

  const handleSave = () => {
    setCookieConsent(
      {
        essential: true,
        analytics,
        marketing,
        timestamp: Date.now(),
      },
      locale
    );
    router.push("/");
  };

  if (!mounted) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="h-8 animate-pulse rounded bg-slate-100" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/" className="text-sm text-[var(--foreground-muted)] underline hover:text-[var(--accent)]">
        ← {t("backToHome")}
      </Link>
      <h1 className="mt-6 text-2xl font-semibold text-[var(--foreground)]">{t("settingsTitle")}</h1>
      <p className="mt-2 text-sm text-[var(--foreground-muted)]">
        {t("settingsDescription")}{" "}
        <Link href="/privacy" className="underline hover:text-[var(--accent)]">
          {t("privacyPolicy")}
        </Link>
      </p>

      <div className="mt-8 space-y-4">
        <div className="flex items-start justify-between gap-4 rounded-lg border border-[var(--card-border)] p-4">
          <div>
            <h2 className="font-semibold text-[var(--foreground)]">{t("essentialTitle")}</h2>
            <p className="mt-1 text-xs text-[var(--foreground-muted)]">{t("essentialDesc")}</p>
          </div>
          <span className="shrink-0 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-[var(--foreground-muted)]">
            {t("alwaysActive")}
          </span>
        </div>

        <div className="flex items-start justify-between gap-4 rounded-lg border border-[var(--card-border)] p-4">
          <div>
            <h2 className="font-semibold text-[var(--foreground)]">{t("analyticsTitle")}</h2>
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

        <div className="flex items-start justify-between gap-4 rounded-lg border border-[var(--card-border)] p-4">
          <div>
            <h2 className="font-semibold text-[var(--foreground)]">{t("marketingTitle")}</h2>
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

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          {t("savePreferences")}
        </button>
        <Link
          href="/"
          className="rounded-lg border border-[var(--card-border)] px-6 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-slate-50"
        >
          {t("cancel")}
        </Link>
      </div>
    </main>
  );
}
