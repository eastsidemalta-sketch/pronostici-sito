"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/ad2min3k", label: "Dashboard" },
  { href: "/ad2min3k/bookmakers", label: "Bookmaker" },
  { href: "/ad2min3k/sports", label: "Sport per paese" },
  { href: "/ad2min3k/menus", label: "Menu e sottomenu" },
  { href: "/ad2min3k/leagues", label: "Competizioni" },
  { href: "/ad2min3k/bonus", label: "Bonus" },
  { href: "/ad2min3k/sites", label: "Siti di scommesse" },
  { href: "/ad2min3k/team-aliases", label: "Alias squadre" },
  { href: "/ad2min3k/team-aliases-by-provider", label: "Mapping per provider" },
  { href: "/ad2min3k/leghe", label: "Mapping leghe" },
  { href: "/ad2min3k/matching-report", label: "Report matching" },
  { href: "/ad2min3k/legal", label: "Testi legali" },
  { href: "/ad2min3k/telegram-banner", label: "Banner Telegram" },
  { href: "/ad2min3k/telegram-posts", label: "Post Telegram" },
  { href: "/ad2min3k/footer-disclaimer", label: "Disclaimer footer" },
];

export default function AdminSidebar() {
  const pathname = usePathname() ?? "";

  return (
    <aside className="w-56 shrink-0 border-r border-neutral-200 bg-white">
      <nav className="sticky top-0 flex flex-col gap-0.5 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/ad2min3k"
              ? pathname === "/ad2min3k"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-emerald-100 font-medium text-emerald-800"
                  : "text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
