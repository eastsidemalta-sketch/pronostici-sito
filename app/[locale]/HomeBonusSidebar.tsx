import { getBookmakers } from "@/lib/quotes/bookmakers";
import { getBookmakerUrlByUseCase } from "@/lib/quotes/bookmakerUrls";
import { BookmakerLink } from "@/lib/components/BookmakerLink";

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
            <BookmakerLink
              key={bm.id}
              href={bm.bonusUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              bookmakerName={bm.name}
              locale={locale}
              className="flex min-h-[52px] items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-2.5 shadow-sm transition hover:border-[var(--accent)]/40 hover:shadow-md sm:min-h-[56px] lg:p-3"
            >
              {bm.logoUrl && (
                <img src={bm.logoUrl} alt="" className="h-10 w-10 shrink-0 object-contain lg:h-11 lg:w-11" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-[var(--foreground)] lg:text-sm">{bm.name}</div>
                <div className="mt-0.5 truncate text-[11px] text-[var(--foreground-muted)] lg:text-xs">
                  {bm.bonusDescription}
                </div>
              </div>
              <span className="shrink-0 text-[11px] font-semibold text-[var(--accent)] lg:text-xs">
                Ottieni →
              </span>
            </BookmakerLink>
          ))}
        </div>
      </div>
    </aside>
  );
}
