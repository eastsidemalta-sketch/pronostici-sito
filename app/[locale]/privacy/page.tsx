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
  dpo: "dpo@eastside.agency",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const { title } = getLegalLinkAndTitle(locale, "privacy");
  const t = await getTranslations("legal");
  const pageTitle = title || t("privacyTitle");
  return {
    title: `${pageTitle} | PlaySignal`,
    description: "Privacy policy and cookie management for PlaySignal.",
  };
}

export default async function PrivacyPage() {
  const locale = await getLocale();
  const t = await getTranslations("legal");
  const tCookies = await getTranslations("cookies");
  const { title } = getLegalLinkAndTitle(locale, "privacy");
  const adminFullText = getLegalFullText(locale, "privacy");

  const pageTitle = title || t("privacyTitle");

  if (adminFullText) {
    const { linkName: termsLinkName } = getLegalLinkAndTitle(locale, "terms");
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
            <Link href="/termini-e-condizioni" className="text-sm underline hover:text-[var(--accent)]">
              {termsLinkName}
            </Link>
            <Link href="/cookie-settings" className="text-sm underline hover:text-[var(--accent)]">
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

      <h1 className="mt-6 text-2xl font-semibold text-[var(--foreground)]">{t("privacyTitle")}</h1>
      <p className="mt-2 text-sm text-[var(--foreground-muted)]">{t("privacyLastUpdate")}</p>

      <div className="prose prose-sm mt-8 max-w-none text-[var(--foreground-muted)]">
        <p className="leading-relaxed">{t("privacyIntro1")}</p>
        <p className="mt-4 leading-relaxed">{t("privacyIntro2")}</p>
        <p className="mt-4 leading-relaxed">{t("privacyIntro3")}</p>

        <h2 className="mt-10 text-lg font-semibold text-[var(--foreground)]">{t("privacyS1Title")}</h2>
        <h3 className="mt-4 text-base font-medium text-[var(--foreground)]">{t("privacyS1aTitle")}</h3>
        <p className="mt-2 leading-relaxed">{t("privacyS1aP1")}</p>
        <h3 className="mt-4 text-base font-medium text-[var(--foreground)]">{t("privacyS1bTitle")}</h3>
        <p className="mt-2 leading-relaxed">{t("privacyS1bP1")}</p>

        <h2 className="mt-10 text-lg font-semibold text-[var(--foreground)]">{t("privacyS2Title")}</h2>
        <p className="mt-2 leading-relaxed">{t("privacyS2P1")}</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>{t("privacyS2Essential")}</li>
          <li>{t("privacyS2Analytics")}</li>
          <li>{t("privacyS2Marketing")}</li>
        </ul>
        <p className="mt-4 leading-relaxed">{t("privacyS2P2")}</p>

        <h2 className="mt-10 text-lg font-semibold text-[var(--foreground)]">{t("privacyS3Title")}</h2>
        <p className="mt-2 leading-relaxed">{t("privacyS3P1")}</p>

        <h2 className="mt-10 text-lg font-semibold text-[var(--foreground)]">{t("privacyS4Title")}</h2>
        <p className="mt-2 leading-relaxed">{t("privacyS4P1")}</p>

        <h2 className="mt-10 text-lg font-semibold text-[var(--foreground)]">{t("privacyS5Title")}</h2>
        <p className="mt-2 leading-relaxed">{t("privacyS5P1")}</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>{t("privacyS5Access")}</li>
          <li>{t("privacyS5Rectify")}</li>
          <li>{t("privacyS5Delete")}</li>
          <li>{t("privacyS5Limit")}</li>
          <li>{t("privacyS5Portability")}</li>
          <li>{t("privacyS5Oppose")}</li>
          <li>{t("privacyS5Revoke")}</li>
          <li>{t("privacyS5Complaint")}</li>
        </ul>
        <p className="mt-4 leading-relaxed">{t("privacyS5P2")}</p>

        <h2 className="mt-10 text-lg font-semibold text-[var(--foreground)]">{t("privacyS6Title")}</h2>
        <p className="mt-2 leading-relaxed">{t("privacyS6P1")}</p>

        <h2 className="mt-10 text-lg font-semibold text-[var(--foreground)]">{t("privacyS7Title")}</h2>
        <p className="mt-2 leading-relaxed">{t("privacyS7P1")}</p>

        <h2 className="mt-10 text-lg font-semibold text-[var(--foreground)]">{t("privacyS8Title")}</h2>
        <p className="mt-2 leading-relaxed">{t("privacyS8P1")}</p>

        <p className="mt-6 leading-relaxed">{t("privacyFooterP1")}</p>

        <div className="mt-12 border-t border-[var(--card-border)] pt-6">
          <p className="text-xs text-[var(--foreground-muted)]">{t("privacyFooter")}</p>
          <div className="mt-4 flex flex-wrap gap-4">
            <Link href="/termini-e-condizioni" className="text-sm underline hover:text-[var(--accent)]">
              {t("privacyTermsLink")}
            </Link>
            <Link href="/cookie-settings" className="text-sm underline hover:text-[var(--accent)]">
              {t("termsCookieLink")}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
