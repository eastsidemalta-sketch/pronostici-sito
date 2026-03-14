import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getUpcomingFixtures } from "@/lib/apiFootball";
import { localeToCountryCode } from "@/i18n/routing";
import { isSportEnabledForCountry } from "@/lib/sportsPerCountryData";
import FixturesList from "../FixturesList";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("calcio");
  return {
    title: t("future"),
    description: t("description"),
  };
}

export const dynamic = "force-dynamic";

function groupByLeagueAndDate(fixtures: any[]) {
  const acc: Record<string, { league: any; date: string; matches: any[] }> = {};
  fixtures?.forEach((match: any) => {
    const dateStr = new Date(match.fixture.date).toISOString().split("T")[0];
    const key = `${match.league.id}-${dateStr}`;
    if (!acc[key]) {
      acc[key] = { league: match.league, date: dateStr, matches: [] };
    }
    acc[key].matches.push(match);
  });
  return Object.values(acc).sort((a, b) => a.date.localeCompare(b.date));
}

export default async function FutureFixturesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const country = localeToCountryCode[locale] ?? "IT";
  const t = await getTranslations("calcio");
  const fixtures =
    isSportEnabledForCountry(country, "calcio")
      ? await getUpcomingFixtures()
      : [];
  const leagues = groupByLeagueAndDate(fixtures ?? []);
  const totalMatches = fixtures?.length ?? 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("future")}</h1>
        <Link
          href="/pronostici-quote/calcio"
          className="text-sm text-[var(--foreground)] underline hover:text-[var(--foreground-muted)]"
        >
          {t("seeLive")}
        </Link>
      </div>

      <section className="mb-8">
        <div className="prose prose-sm max-w-none text-[var(--foreground-muted)]">
          <p>{t("futureIntro")}</p>
          <h2 className="mt-6 text-base font-semibold text-[var(--foreground)]">Cosa trovi qui</h2>
          <p>{t("futureCosaTrovi")}</p>
          <h2 className="mt-6 text-base font-semibold text-[var(--foreground)]">Perché consultarla</h2>
          <p>{t("futurePercheConsultarla")}</p>
          <h2 className="mt-6 text-base font-semibold text-[var(--foreground)]">Collegamenti utili</h2>
          <p>{t("futureCollegamentiUtili")}</p>
        </div>
      </section>

      {totalMatches > 0 ? (
        <FixturesList
          leagues={leagues}
          totalMatches={totalMatches}
          locale={locale}
        />
      ) : (
        <div className="rounded-xl border bg-neutral-50 p-8 text-center">
          <p className="text-gray-600">{t("noFutureMatches")}</p>
        </div>
      )}
    </main>
  );
}
