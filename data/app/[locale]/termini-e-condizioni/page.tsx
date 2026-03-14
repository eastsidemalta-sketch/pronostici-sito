import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getLegalLinkAndTitle,
  getLegalFullText,
} from "@/lib/legalData";
import { plainTextToHtml } from "@/lib/plainTextToHtml";

const COMPANY = {
  name: "East Side Ltd",
  address: "84 Luqa Briffa Street, Savoy Gardens Block D, GZR1503 Gzira, Malta",
  registration: "C74040",
  vat: "MT23084935",
  email: "customercare@easyside.agency",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const { title } = getLegalLinkAndTitle(locale, "terms");
  const t = await getTranslations("legal");
  const pageTitle = title || t("termsTitle");
  return {
    title: `${pageTitle} | PlaySignal`,
    description: "Terms and conditions of use for PlaySignal.",
  };
}

export default async function TerminiPage() {
  const locale = await getLocale();
  const t = await getTranslations("legal");
  const tCookies = await getTranslations("cookies");
  const { title } = getLegalLinkAndTitle(locale, "terms");
  const adminFullText = getLegalFullText(locale, "terms");

  const pageTitle = title || t("termsTitle");

  if (adminFullText) {
    const { linkName: privacyLinkName } = getLegalLinkAndTitle(locale, "privacy");
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <Link href="/" className="text-sm text-[var(--foreground-muted)] underline hover:text-[var(--accent)]">
          ← {tCookies("backToHome")}
        </Link>

        <h1 className="mt-6 text-2xl font-semibold text-[var(--foreground)]">{pageTitle}</h1>

        <div
          className="prose prose-sm mt-8 max-w-none text-[var(--foreground-muted)]"
          dangerouslySetInnerHTML={{ __html: plainTextToHtml(adminFullText) }}
        />

        <div className="mt-12 border-t border-[var(--card-border)] pt-6">
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="text-sm hover:text-[var(--accent)]">
              {privacyLinkName}
            </Link>
            <Link href="/cookie-settings" className="text-sm hover:text-[var(--accent)]">
              {tCookies("cookieSettings")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="text-sm text-[var(--foreground-muted)] underline hover:text-[var(--accent)]">
        ← {tCookies("backToHome")}
      </Link>

      <h1 className="mt-6 text-2xl font-semibold text-[var(--foreground)]">{t("termsTitle")}</h1>
      <p className="mt-2 text-sm text-[var(--foreground-muted)]">{t("termsLastUpdate")}</p>

      <div className="prose prose-sm mt-8 max-w-none text-[var(--foreground-muted)]">
        <p className="leading-relaxed">{t("termsIntro1")}</p>
        <p className="mt-4 leading-relaxed">{t("termsIntro2")}</p>
        <p className="mt-4 leading-relaxed">
          {t("termsIntro3")}{" "}
          <a href={`mailto:${COMPANY.email}`} className="underline hover:text-[var(--accent)]">
            {COMPANY.email}
          </a>
          .
        </p>
        <p className="mt-6 leading-relaxed">{t("termsIntro4")}</p>

        <h2 className="mt-10 text-lg font-semibold text-[var(--foreground)]">{t("termsS1Title")}</h2>
        <p className="mt-2 leading-relaxed">{t("termsS1P1")}</p>
        <p className="mt-2 leading-relaxed">{t("termsS1P2")}</p>

        <h2 className="mt-10 text-lg font-semibold text-[var(--foreground)]">{t("termsS2Title")}</h2>
        <p className="mt-2 leading-relaxed">{t("termsS2P1")}</p>

        <h2 className="mt-10 text-lg font-semibold text-[var(--foreground)]">{t("termsS3Title")}</h2>
        <p className="mt-2 leading-relaxed">{t("termsS3P1")}</p>
        <p className="mt-2 leading-relaxed">{t("termsS3P2")}</p>

        <h2 className="mt-10 text-lg font-semibold text-[var(--foreground)]">{t("termsS4Title")}</h2>
        <p className="mt-2 leading-relaxed">{t("termsS4P1")}</p>

        <h2 className="mt-10 text-lg font-semibold text-[var(--foreground)]">{t("termsS5Title")}</h2>
        <p className="mt-2 leading-relaxed">{t("termsS5P1")}</p>

        <h2 className="mt-10 text-lg font-semibold text-[var(--foreground)]">{t("termsS6Title")}</h2>
        <p className="mt-2 leading-relaxed">{t("termsS6P1")}</p>

        <h2 className="mt-10 text-lg font-semibold text-[var(--foreground)]">{t("termsS7Title")}</h2>
        <p className="mt-2 leading-relaxed">{t("termsS7P1")}</p>

        <h2 className="mt-10 text-lg font-semibold text-[var(--foreground)]">{t("termsS8Title")}</h2>
        <p className="mt-2 leading-relaxed">{t("termsS8P1")}</p>

        <h2 className="mt-10 text-lg font-semibold text-[var(--foreground)]">{t("termsS9Title")}</h2>
        <p className="mt-2 leading-relaxed">{t("termsS9P1")}</p>

        <div className="mt-12 border-t border-[var(--card-border)] pt-6">
          <p className="text-xs text-[var(--foreground-muted)]">{t("termsFooter")}</p>
          <div className="mt-4 flex flex-wrap gap-4">
            <Link href="/privacy" className="text-sm hover:text-[var(--accent)]">
              {t("termsPrivacyLink")}
            </Link>
            <Link href="/cookie-settings" className="text-sm hover:text-[var(--accent)]">
              {t("termsCookieLink")}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
