import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getBookmakers, getBookmakerDisplayName } from "@/lib/quotes/bookmakers";
import { BookmakerLink } from "@/lib/components/BookmakerLink";
import { getBookmakerUrlByUseCase } from "@/lib/quotes/bookmakerUrls";
import { localeToCountryCode } from "@/i18n/routing";
import { getBonusOrderForCountry } from "@/lib/bonusOrderConfig";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("bonus");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function BonusPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const t = await getTranslations("bonus");
  const { locale } = await params;
  const country = localeToCountryCode[locale] || "IT";
  const withBonus = getBookmakers().filter(
    (bm) =>
      bm.isActive &&
      (bm.countries?.includes(country) ||
        bm.country === country ||
        bm.countryConfig?.[country]) &&
      bm.countryConfig?.[country]?.bonusDescription
  );

  const order = getBonusOrderForCountry(country);
  const bookmakers = order?.length
    ? (() => {
        const byId = new Map(withBonus.map((bm) => [bm.id, bm]));
        const result = [];
        for (const id of order) {
          const bm = byId.get(id);
          if (bm) result.push(bm);
        }
        for (const bm of withBonus) {
          if (!order.includes(bm.id)) result.push(bm);
        }
        return result;
      })()
    : withBonus;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:px-5 md:py-8">
      <h1 className="text-xl font-bold text-[var(--foreground)] md:text-2xl">{t("title")}</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--foreground-muted)] md:text-base">{t("description")}</p>

      <div className="mt-6 space-y-4 md:space-y-5">
        {bookmakers.map((bm) => {
          const bonusDescription =
            bm.countryConfig?.[country]?.bonusDescription;
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
            ) ||
            bm.affiliateUrl;

          if (!bonusDescription) return null;

          return (
            <div
              key={bm.id}
              className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm md:p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  {bm.logoUrl && (
                    <img src={bm.logoUrl} alt="" className="h-10 w-10 object-contain md:h-12 md:w-12" />
                  )}
                  <div>
                    <h2 className="text-base font-bold text-[var(--foreground)] md:text-lg">{getBookmakerDisplayName(bm)}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--foreground-muted)] md:text-base">{bonusDescription}</p>
                  </div>
                </div>
                {bonusUrl && (
                  <BookmakerLink
                    href={bonusUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    bookmakerName={getBookmakerDisplayName(bm)}
                    locale={locale}
                    className="shrink-0 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
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
