"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { MenuItem } from "@/lib/homeMenu";

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

const SCROLL_AMOUNT = 100;

interface HomeBannerProps {
  menuItems: MenuItem[];
  labels: {
    allSports: string;
    allCompetitions: string;
  };
  /** Quando sulla pagina calcio, sport è sempre "calcio" se non in query */
  defaultSport?: string;
}

export default function HomeBanner({
  menuItems,
  labels,
  defaultSport,
}: HomeBannerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sport = searchParams.get("sport") ?? defaultSport ?? "all";
  const league = searchParams.get("league") ?? "all";
  const leagueScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const t = useTranslations("common");

  const updateLeagueScrollState = () => {
    const el = leagueScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };

  useEffect(() => {
    const el = leagueScrollRef.current;
    if (!el) return;
    updateLeagueScrollState();
    el.addEventListener("scroll", updateLeagueScrollState);
    const ro = new ResizeObserver(updateLeagueScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateLeagueScrollState);
      ro.disconnect();
    };
  }, [sport]);

  const scrollLeague = (direction: "left" | "right") => {
    const el = leagueScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === "left" ? -SCROLL_AMOUNT : SCROLL_AMOUNT, behavior: "smooth" });
  };

  function setSport(s: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("sport", s);
    if (s !== "calcio") next.delete("league");
    const targetPath = pathname.replace(/\/calcio\/?$/, "") || pathname;
    router.push(`${targetPath}?${next.toString()}`);
  }

  function setLeague(l: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (l === "all") next.delete("league");
    else next.set("league", l);
    router.push(`${pathname}?${next.toString()}`);
  }

  const calcioItem = menuItems.find((m) => m.key === "calcio");
  const hasCompetitions = calcioItem?.subItems && calcioItem.subItems.length > 0;

  return (
    <div className="flex flex-col gap-0">
      {/* Sport tabs */}
      <div className="overflow-x-auto pt-1 pb-0.5 sm:pt-1.5 sm:pb-1 md:pt-1.5 md:pb-1 scrollbar-hide [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max justify-start gap-2 sm:min-w-0 sm:flex-wrap">
          <button
            type="button"
            onClick={() => setSport("all")}
            className={`min-h-[28px] shrink-0 rounded px-2.5 py-1 text-[11px] font-semibold transition active:scale-[0.98] sm:min-h-[32px] sm:px-2.5 sm:py-1.5 md:min-h-[30px] md:px-3 md:py-1.5 ${
              sport === "all"
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "bg-slate-100 text-[var(--foreground-muted)] hover:bg-slate-200"
            }`}
          >
            {labels.allSports}
          </button>
          {menuItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSport(item.key)}
            className={`min-h-[28px] shrink-0 rounded px-2.5 py-1 text-[11px] font-semibold transition active:scale-[0.98] sm:min-h-[32px] sm:px-2.5 sm:py-1.5 md:min-h-[30px] md:px-3 md:py-1.5 ${
              sport === item.key
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "bg-slate-100 text-[var(--foreground-muted)] hover:bg-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bandone competizioni - scroll orizzontale con frecce */}
      {sport === "calcio" && hasCompetitions && (
        <div className="mt-1.5 flex items-center gap-0 border-t border-[var(--card-border)] pt-1.5 md:mt-1 md:pt-1">
          <button
            type="button"
            onClick={() => scrollLeague("left")}
            disabled={!canScrollLeft}
            className="flex min-h-[28px] min-w-[28px] shrink-0 items-center justify-center rounded-lg text-[var(--foreground-muted)] transition hover:bg-slate-100 hover:text-[var(--foreground)] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--foreground-muted)]"
            aria-label={t("scrollLeft")}
          >
            <ChevronLeftIcon />
          </button>
          <div
            ref={leagueScrollRef}
            className="flex flex-1 overflow-x-auto scrollbar-hide [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            style={{ scrollBehavior: "smooth" }}
          >
            <div className="flex min-w-max gap-1.5 px-1">
              <button
                type="button"
                onClick={() => setLeague("all")}
                className={`min-h-[28px] shrink-0 rounded px-2 py-1 text-[10px] font-medium transition active:scale-[0.98] sm:min-h-[26px] sm:px-2 sm:py-1 md:text-[11px] ${
                  league === "all"
                    ? "bg-[var(--accent)] text-white"
                    : "bg-slate-100 text-[var(--foreground-muted)] hover:bg-slate-200"
                }`}
              >
                {labels.allCompetitions}
              </button>
              {calcioItem!.subItems.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setLeague(String(sub.id))}
                  className={`min-h-[28px] shrink-0 rounded px-2 py-1 text-[10px] font-medium transition active:scale-[0.98] sm:min-h-[26px] sm:px-2 sm:py-1 md:text-[11px] whitespace-nowrap ${
                    league === String(sub.id)
                      ? "bg-[var(--accent)] text-white"
                      : "bg-slate-100 text-[var(--foreground-muted)] hover:bg-slate-200"
                  }`}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => scrollLeague("right")}
            disabled={!canScrollRight}
            className="flex min-h-[28px] min-w-[28px] shrink-0 items-center justify-center rounded-lg text-[var(--foreground-muted)] transition hover:bg-slate-100 hover:text-[var(--foreground)] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--foreground-muted)]"
            aria-label={t("scrollRight")}
          >
            <ChevronRightIcon />
          </button>
        </div>
      )}
    </div>
  );
}
