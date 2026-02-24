"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useMobileMenu } from "./MobileMenuContext";
import { SPORTS } from "@/lib/homeMenu";

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect width="20" height="5" x="2" y="7" />
      <path d="M12 22V7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}

function BallIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function SportIcon({ sportKey }: { sportKey: string }) {
  const icons: Record<string, React.ReactNode> = {
    calcio: <BallIcon />,
    tennis: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22c-4.97 0-9-4.03-9-9s4.03-9 9-9 9 4.03 9 9-4.03 9-9 9Z" />
      <path d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
    ),
    basket: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
    ),
    rugby: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
    ),
  };
  return <>{icons[sportKey] ?? <BallIcon />}</>;
}

export default function MobileMenuOverlay() {
  const { isOpen, closeMenu, view, setView } = useMobileMenu();
  const t = useTranslations("common");

  if (!isOpen) return null;

  const showMainMenu = view === "main";
  const showSportsMenu = view === "sports";

  return (
    <>
      <div
        className="fixed inset-0 z-[70] bg-black/50 md:hidden"
        aria-hidden
        onClick={closeMenu}
      />
      <div className="fixed inset-0 z-[70] overflow-y-auto md:hidden">
        <div
          className="min-h-full bg-[var(--card-bg)] text-[var(--foreground)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-4">
            {showSportsMenu ? (
              <button
                type="button"
                onClick={() => setView("main")}
                className="flex items-center gap-2 text-[var(--foreground)] transition hover:text-[var(--accent)]"
              >
                <ChevronLeftIcon />
                <span className="text-sm font-medium">{t("menu")}</span>
              </button>
            ) : (
              <Link href="/" onClick={closeMenu} className="flex items-center">
                <img src="/playsignal-logo.png" alt="PlaySignal" className="h-7 w-auto" />
              </Link>
            )}
            <button
              type="button"
              onClick={closeMenu}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--foreground)] transition hover:bg-[var(--background)]"
              aria-label={t("closeMenu")}
            >
              <CloseIcon />
            </button>
          </div>

          {/* Menu principale (hamburger): Home, Quote, Pronostici, Bonus, Bookmakers */}
          {showMainMenu && (
            <div className="border-t border-[var(--card-border)] px-4 py-2">
              <Link
                href="/"
                onClick={closeMenu}
                className="flex w-full items-center justify-between gap-3 border-b border-[var(--card-border)] py-3 transition hover:bg-[var(--background)]"
              >
                <span className="font-medium uppercase tracking-wide">{t("home")}</span>
                <ChevronRightIcon />
              </Link>
              <button
                type="button"
                onClick={() => setView("sports")}
                className="flex w-full items-center justify-between gap-3 border-b border-[var(--card-border)] py-3 transition hover:bg-[var(--background)]"
              >
                <span className="font-medium uppercase tracking-wide">{t("quotes")}</span>
                <ChevronRightIcon />
              </button>
              <button
                type="button"
                onClick={() => setView("sports")}
                className="flex w-full items-center justify-between gap-3 border-b border-[var(--card-border)] py-3 transition hover:bg-[var(--background)]"
              >
                <span className="font-medium uppercase tracking-wide">{t("predictions")}</span>
                <ChevronRightIcon />
              </button>
              <Link
                href="/bonus"
                onClick={closeMenu}
                className="flex items-center justify-between gap-3 border-b border-[var(--card-border)] py-3 transition hover:bg-[var(--background)]"
              >
                <span className="font-medium uppercase tracking-wide">{t("bonus")}</span>
                <ChevronRightIcon />
              </Link>
              <Link
                href="/siti-scommesse"
                onClick={closeMenu}
                className="flex items-center justify-between gap-3 py-3 transition hover:bg-[var(--background)]"
              >
                <span className="font-medium uppercase tracking-wide">{t("bookmakers")}</span>
                <ChevronRightIcon />
              </Link>
            </div>
          )}

          {/* Menu sport (Calcio, Tennis, ecc.) */}
          {showSportsMenu && (
            <div className="border-t border-[var(--card-border)] px-4 py-2">
              {SPORTS.map((sport) => (
                <Link
                  key={sport.key}
                  href={sport.href}
                  onClick={closeMenu}
                  className="flex items-center justify-between gap-3 border-b border-[var(--card-border)] py-3 transition hover:bg-[var(--background)]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[var(--accent)]">
                      <SportIcon sportKey={sport.key} />
                    </span>
                    <span className="font-medium uppercase tracking-wide">{sport.label}</span>
                  </div>
                  <ChevronRightIcon />
                </Link>
              ))}
              <Link
                href="/bonus"
                onClick={closeMenu}
                className="flex items-center justify-between gap-3 border-b border-[var(--card-border)] py-3 transition hover:bg-[var(--background)]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[var(--accent)]">
                    <GiftIcon />
                  </span>
                  <span className="font-medium uppercase tracking-wide">{t("bonus")}</span>
                </div>
                <ChevronRightIcon />
              </Link>
              <Link
                href="/siti-scommesse"
                onClick={closeMenu}
                className="flex items-center justify-between gap-3 py-3 transition hover:bg-[var(--background)]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[var(--accent)]">
                    <GlobeIcon />
                  </span>
                  <span className="font-medium uppercase tracking-wide">{t("bookmakers")}</span>
                </div>
                <ChevronRightIcon />
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
