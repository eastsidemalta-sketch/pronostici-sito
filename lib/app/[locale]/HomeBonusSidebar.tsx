import { getBookmakers, getBookmakerDisplayName } from "@/lib/quotes/bookmakers";
import { getBookmakerUrlByUseCase } from "@/lib/quotes/bookmakerUrls";
import { BookmakerLink } from "@/lib/components/BookmakerLink";
import { BookmakerLogo } from "@/lib/components/BookmakerLogo";
import { RichText } from "@/lib/components/RichText";

interface HomeBonusSidebarProps {
  country: string;
  locale?: string;
}

export default async function HomeBonusSidebar({ country, locale }: HomeBonusSidebarProps) {
  const bookmakers = getBookmakers().filter(
    (bm) =>
      bm.isActive &&
      (bm.countries?.includes(country) ||
        bm.country === country ||
        bm.countryConfig?.[country])
  );

  const withBonus = bookmakers
    .map((bm) => {
      const bonusDescription = bm.countryConfig?.[country]?.bonusDescription;
      const bonusUrl =
        getBookmakerUrlByUseCase(bm.apiBookmakerKey || bm.id, "bonus", country) ||
        getBookmakerUrlByUseCase(bm.apiBookmakerKey || bm.id, "registrati", country) ||
        bm.affiliateUrl;
      return { ...bm, bonusDescription, bonusUrl };
    })
    .filter((bm) => bm.bonusDescription);

  if (withBonus.length === 0) return null;

  return (
    <aside className="w-full shrink-0 lg:w-56">
      <div className="space-y-4 lg:sticky lg:top-28">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--foreground-muted)] sm:text-xs md:text-sm">
          Bonus siti scommesse
        </h3>
        <div className="space-y-3">
          {withBonus.map((bm) => (
            <div
              key={bm.id}
              className="flex flex-col gap-3 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-2.5 shadow-sm transition hover:border-[var(--accent)]/40 hover:shadow-md lg:p-3"
            >
              <div className="flex flex-row gap-2">
                {(bm.faviconUrl || bm.logoUrl) && (
                  <BookmakerLogo src={bm.faviconUrl || bm.logoUrl!} size="sm" title={getBookmakerDisplayName(bm)} className="shrink-0" />
                )}
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="text-xs font-semibold text-[var(--foreground)] lg:text-sm">{getBookmakerDisplayName(bm)}</div>
                  <div className="mt-0.5 text-[11px] leading-snug text-[var(--foreground-muted)] lg:text-xs">
                    <RichText as="span" text={bm.bonusDescription as string} />
                  </div>
                </div>
              </div>
              <BookmakerLink
                href={bm.bonusUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                bookmakerName={getBookmakerDisplayName(bm)}
                locale={locale}
                logoUrl={bm.logoUrl}
                className="inline-flex w-full items-center justify-center rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--accent-hover)] lg:text-sm"
              >
                Ottieni bonus
              </BookmakerLink>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
