"use client";

import { useTranslations } from "next-intl";
import { useMobileMenu } from "./MobileMenuContext";

function HamburgerIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

export default function MobileMenu() {
  const { openMenu } = useMobileMenu();
  const t = useTranslations("common");

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openMenu();
      }}
      className="relative z-10 flex min-h-[36px] min-w-[36px] cursor-pointer select-none items-center justify-center rounded-lg text-[var(--foreground-muted)] transition hover:bg-slate-100 hover:text-[var(--foreground)] active:opacity-70 md:hidden"
      aria-label={t("openMenu")}
    >
      <HamburgerIcon />
    </button>
  );
}
