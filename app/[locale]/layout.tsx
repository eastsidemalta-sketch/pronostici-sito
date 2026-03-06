import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations, getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { routing, localeToCountry } from "@/i18n/routing";
import { getDefaultLocale } from "@/lib/markets";
import { getOgMetadata } from "@/lib/seo/ogMetadata";
import { Link } from "@/i18n/navigation";
import { getLegalLinkAndTitle } from "@/lib/legalData";
import { getFooterDisclaimerLines } from "@/lib/footerDisclaimerConfig";
import FooterDisclaimer18Plus from "./FooterDisclaimer18Plus";
import MobileBottomNav from "./MobileBottomNav";
import CookieConsent from "./CookieConsent";
import MobileMenu from "./MobileMenu";
import MobileMenuWrapper from "./MobileMenuWrapper";
import HeaderCountrySelector from "./HeaderCountrySelector";
import BaseSchemaJsonLd from "./BaseSchemaJsonLd";
import { RichText } from "@/lib/components/RichText";
import { Suspense } from "react";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const og = getOgMetadata(locale);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://playsignal.io";
  return {
    title: { default: og.title, template: "%s | PlaySignal" },
    description: og.description,
    openGraph: {
      title: og.title,
      description: og.description,
      images: [{ url: `${baseUrl}/og-image.png`, width: 1200, height: 630, alt: "PlaySignal - See the signal. Play it." }],
    },
    twitter: {
      card: "summary_large_image",
      title: og.title,
      description: og.description,
      images: ["/og-image.png"],
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "common" });
  const tFooter = await getTranslations({ locale, namespace: "footer" });
  const tCookies = await getTranslations({ locale, namespace: "cookies" });
  const country = localeToCountry[locale] ?? locale;
  const termsLink = getLegalLinkAndTitle(locale, "terms");
  const privacyLink = getLegalLinkAndTitle(locale, "privacy");
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
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
              {t("quotesAndPredictions")}
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
          {/* Selettore paese: desktop a destra, mobile accanto al logo */}
          <div className="flex shrink-0 items-center">
            <HeaderCountrySelector />
          </div>
        </div>
      </header>

      <div className="pb-[calc(4rem+max(env(safe-area-inset-bottom),10px))] md:pb-0">
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

      <Suspense fallback={null}>
        <MobileBottomNav />
      </Suspense>
      <CookieConsent />
    </MobileMenuWrapper>
    </NextIntlClientProvider>
  );
}
