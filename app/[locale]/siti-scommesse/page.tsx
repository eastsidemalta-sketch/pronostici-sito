import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getBookmakers, getBookmakerDisplayName } from "@/lib/quotes/bookmakers";
import { BookmakerLink } from "@/lib/components/BookmakerLink";
import {
  getBookmakerUrl,
  getBookmakerUrlByUseCase,
} from "@/lib/quotes/bookmakerUrls";
import { localeToCountryCode } from "@/i18n/routing";
import { getSitesOrderForCountry } from "@/lib/sitesOrderConfig";
import { RichText } from "@/lib/components/RichText";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sitiScommesse");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function SitiScommessePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const t = await getTranslations("sitiScommesse");
  const { locale } = await params;
  const country = localeToCountryCode[locale] || "IT";
  const allForCountry = getBookmakers().filter(
    (bm) =>
      bm.isActive &&
      (bm.countries?.includes(country) ||
        bm.country === country ||
        bm.countryConfig?.[country])
  );

  const order = getSitesOrderForCountry(country);
  const bookmakers = order?.length
    ? (() => {
        const byId = new Map(allForCountry.map((bm) => [bm.id, bm]));
        const result = [];
        for (const id of order) {
          const bm = byId.get(id);
          if (bm) result.push(bm);
        }
        for (const bm of allForCountry) {
          if (!order.includes(bm.id)) result.push(bm);
        }
        return result;
      })()
    : allForCountry;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:px-5 md:py-8">
      <h1 className="text-xl font-bold text-[var(--foreground)] md:text-2xl">{t("title")}</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--foreground-muted)] md:text-base">{t("description")}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-5">
        {bookmakers.map((bm) => {
          const siteUrl =
            getBookmakerUrl(bm.apiBookmakerKey || bm.id, country) ||
            bm.affiliateUrl;
          const bonusUrl =
            getBookmakerUrlByUseCase(
              bm.apiBookmakerKey || bm.id,
              "bonus",
              country
            ) ||
            getBookmakerUrlByUseCase(
              bm.apiBookmakerKey || bm.id,
              "registrati",
              country
            );
          const bonusDescription =
            bm.countryConfig?.[country]?.bonusDescription;

          return (
            <div
              key={bm.id}
              className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm transition hover:shadow-md md:p-5"
            >
              <div className="flex items-center gap-4">
                {bm.logoUrl && (
                    <img src={bm.logoUrl} alt="" className="h-10 w-10 object-contain md:h-12 md:w-12" />
                )}
                <h2 className="text-base font-bold text-[var(--foreground)] md:text-lg">{getBookmakerDisplayName(bm)}</h2>
              </div>

              <div className="mt-3">
                <h3 className="text-xs font-semibold text-[var(--foreground)] md:text-sm">Bonus</h3>
                {bonusDescription ? (
                  <RichText
                    as="p"
                    text={bonusDescription}
                    className="mt-1 text-sm leading-relaxed text-[var(--foreground-muted)] md:text-base"
                  />
                ) : (
                  <p className="mt-1 text-sm leading-relaxed text-[var(--foreground-muted)] md:text-base">
                    —
                  </p>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {siteUrl && (
                  <BookmakerLink
                    href={siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    bookmakerName={getBookmakerDisplayName(bm)}
                    locale={locale}
                    className="inline-flex min-h-[36px] items-center justify-center rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
                  >
                    Vai al sito
                  </BookmakerLink>
                )}
                {(bonusUrl || siteUrl) && bonusDescription && (
                  <BookmakerLink
                    href={bonusUrl || siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    bookmakerName={getBookmakerDisplayName(bm)}
                    locale={locale}
                    className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-light)]"
                  >
                    Ottieni bonus
                  </BookmakerLink>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
