import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { routing, localeToCountry } from "@/i18n/routing";
import { getDefaultLocale } from "@/lib/markets";
import { Link } from "@/i18n/navigation";
import { getLegalLinkAndTitle } from "@/lib/legalData";
import { getFooterDisclaimerLines } from "@/lib/footerDisclaimerConfig";
import FooterDisclaimer18Plus from "./FooterDisclaimer18Plus";
import MobileBottomNav from "./MobileBottomNav";
import CookieConsent from "./CookieConsent";
import MobileMenu from "./MobileMenu";
import MobileMenuWrapper from "./MobileMenuWrapper";
import BaseSchemaJsonLd from "./BaseSchemaJsonLd";
import { RichText } from "@/lib/components/RichText";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations("common");
  const tFooter = await getTranslations("footer");
  const tCookies = await getTranslations("cookies");
  const country = localeToCountry[locale] ?? locale;
  const termsLink = getLegalLinkAndTitle(locale, "terms");
  const privacyLink = getLegalLinkAndTitle(locale, "privacy");

  return (
    <MobileMenuWrapper>
      {locale === getDefaultLocale() && <BaseSchemaJsonLd />}
      <header className="sticky top-0 z-50 border-b border-[var(--card-border)] bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-0.5 sm:px-4 sm:py-2 md:px-5">
          {/* Mobile: hamburger a sinistra */}
          <div className="flex shrink-0 items-center md:hidden">
            <MobileMenu />
          </div>
          {/* Logo a sinistra */}
          <div className="flex min-w-0 flex-1 justify-center md:flex-initial md:justify-start">
            <Link href="/" className="flex items-center">
              <img
                src="/playsignal-logo.png"
                alt="PlaySignal"
                className="h-6 w-auto sm:h-10 md:h-11"
              />
            </Link>
          </div>
          {/* Nav desktop: Quote e Pronostici, Bonus, Siti Scommesse */}
          <nav className="hidden md:flex md:items-center md:gap-0">
            <Link
              href="/"
              className="rounded px-2 py-2 text-base font-semibold text-[var(--foreground-muted)] transition hover:text-[var(--accent)] md:px-2.5 md:text-lg"
            >
              Quote e Pronostici
            </Link>
            <Link
              href="/bonus"
              className="rounded px-2 py-2 text-base font-semibold text-[var(--foreground-muted)] transition hover:text-[var(--accent)] md:px-2.5 md:text-lg"
            >
              {t("bonus")}
            </Link>
            <Link
              href="/siti-scommesse"
              className="rounded px-2 py-2 text-base font-semibold text-[var(--foreground-muted)] transition hover:text-[var(--accent)] md:px-2.5 md:text-lg"
            >
              {t("sitiScommesse")}
            </Link>
          </nav>
          {/* Spacer su mobile per bilanciare hamburger */}
          <div className="w-9 shrink-0 md:hidden" aria-hidden />
        </div>
      </header>

      <div className="pb-[calc(2.75rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </div>

      <footer className="mt-12 border-t border-[var(--card-border)] bg-white">
        <div className="mx-auto max-w-6xl px-3 py-6 text-sm text-[var(--foreground-muted)] sm:px-4 sm:py-8 md:px-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <Link href="/">
                  <img
                    src="/playsignal-logo.png"
                    alt="PlaySignal"
                    className="h-9 w-auto sm:h-10 md:h-11"
                  />
                </Link>
                <span>
                  {tFooter("copyright", {
                    year: new Date().getFullYear(),
                    country,
                  })}
                </span>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <Link href="/privacy" className="hover:text-[var(--accent)]">
                    {privacyLink.linkName}
                  </Link>
                  <Link href="/termini-e-condizioni" className="hover:text-[var(--accent)]">
                    {termsLink.linkName}
                  </Link>
                  <Link href="/cookie-settings" className="hover:text-[var(--accent)]">
                    {tCookies("cookieSettings")}
                  </Link>
                </div>
              </div>
            </div>
            <div className="border-t border-[var(--card-border)] pt-4 text-xs">
              <p className="inline">
                <FooterDisclaimer18Plus className="mr-1.5 align-middle" />
                {getFooterDisclaimerLines(locale)
                  .filter((l) => l.trim())
                  .map((line, i, arr) => (
                    <span key={`${i}-${line.slice(0, 12)}`}>
                      <RichText as="span" text={line} />
                      {i < arr.length - 1 ? " – " : null}
                    </span>
                  ))}
              </p>
            </div>
          </div>
        </div>
      </footer>

      <MobileBottomNav />
      <CookieConsent />
    </MobileMenuWrapper>
  );
}
