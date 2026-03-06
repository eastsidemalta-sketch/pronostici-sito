"use client";

import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={active ? "text-[var(--nav-bar-active)]" : "text-[var(--nav-bar-inactive)]"}
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function OddsIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={active ? "text-[var(--nav-bar-active)]" : "text-[var(--nav-bar-inactive)]"}
    >
      <path d="M12 2v4" />
      <path d="m4.93 4.93 2.83 2.83" />
      <path d="M2 12h4" />
      <path d="m4.93 19.07 2.83-2.83" />
      <path d="M12 18v4" />
      <path d="m17.24 6.76 2.83-2.83" />
      <path d="M18 12h4" />
      <path d="m19.07 19.07-2.83-2.83" />
      <path d="m6.76 17.24-2.83 2.83" />
    </svg>
  );
}

function PredictionsIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={active ? "text-[var(--nav-bar-active)]" : "text-[var(--nav-bar-inactive)]"}
    >
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  );
}

function BonusIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={active ? "text-[var(--nav-bar-active)]" : "text-[var(--nav-bar-inactive)]"}
    >
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function SitesIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={active ? "text-[var(--nav-bar-active)]" : "text-[var(--nav-bar-inactive)]"}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

/** Contenuto nav: usa useSearchParams solo dopo mount client (evita suspend/error SSR) */
function MobileBottomNavContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("common");

  const path = pathname.replace(/\/$/, "").split("/").filter(Boolean);
  const tab = searchParams.get("tab");
  const isOnPronosticiQuote = pathname.includes("pronostici-quote");

  const isHome = path.length <= 1;
  const isQuote = (isHome && tab !== "pronostici") || (isOnPronosticiQuote && tab !== "pronostici");
  const isPronostici = tab === "pronostici" && (isOnPronosticiQuote || isHome);
  const isBonus = pathname.includes("bonus");
  const isSiti = pathname.includes("siti-scommesse");

  const navContent = (
    <nav
      data-mobile-bottom-nav
      className="fixed left-0 right-0 bottom-0 z-50 flex min-h-[66px] max-h-[90px] items-center justify-around gap-0.5 border-t border-[var(--card-border)] bg-[var(--nav-bar-bg)] px-4 pb-[max(env(safe-area-inset-bottom),10px)] pt-2 md:hidden"
    >
      <Link
        href="/"
        className="flex min-w-0 flex-1 flex-col items-center gap-0.5 px-0.5 py-2 active:opacity-70"
      >
        <HomeIcon active={isHome} />
        <span className={`text-[9px] font-medium ${isHome ? "text-[var(--nav-bar-active)]" : "text-[var(--nav-bar-inactive)]"}`}>
          Home
        </span>
      </Link>
      <Link
        href="/"
        className="flex min-w-0 flex-1 flex-col items-center gap-0.5 px-0.5 py-2 active:opacity-70"
      >
        <OddsIcon active={isQuote} />
        <span className={`text-[9px] font-medium ${isQuote ? "text-[var(--nav-bar-active)]" : "text-[var(--nav-bar-inactive)]"}`}>
          {t("quotes")}
        </span>
      </Link>
      <Link
        href="/?tab=pronostici"
        className="flex min-w-0 flex-1 flex-col items-center gap-0.5 px-0.5 py-2 active:opacity-70"
      >
        <PredictionsIcon active={isPronostici} />
        <span className={`text-[9px] font-medium ${isPronostici ? "text-[var(--nav-bar-active)]" : "text-[var(--nav-bar-inactive)]"}`}>
          {t("predictions")}
        </span>
      </Link>
      <Link
        href="/bonus"
        className="flex min-w-0 flex-1 flex-col items-center gap-0.5 px-0.5 py-2 active:opacity-70"
      >
        <BonusIcon active={isBonus} />
        <span className={`text-[9px] font-medium ${isBonus ? "text-[var(--nav-bar-active)]" : "text-[var(--nav-bar-inactive)]"}`}>
          {t("bonus")}
        </span>
      </Link>
      <Link
        href="/siti-scommesse"
        className="flex min-w-0 flex-1 flex-col items-center gap-0.5 px-0.5 py-2 active:opacity-70"
      >
        <SitesIcon active={isSiti} />
        <span className={`whitespace-nowrap text-[9px] font-medium ${isSiti ? "text-[var(--nav-bar-active)]" : "text-[var(--nav-bar-inactive)]"}`}>
          {t("sitiScommesseShort") ?? t("sitiScommesse")}
        </span>
      </Link>
    </nav>
  );

  return createPortal(navContent, document.body);
}

export default function MobileBottomNav() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /* Render solo su client: evita useSearchParams in SSR (causa error/suspend) */
  if (!mounted || typeof document === "undefined") return null;
  return <MobileBottomNavContent />;
}
