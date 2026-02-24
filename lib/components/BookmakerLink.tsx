"use client";

import { useLocale } from "next-intl";
import { trackEvent } from "@/lib/analytics/ga";

type BookmakerLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  bookmakerName: string;
  sport?: string;
  locale?: string;
  matchSlug?: string;
};

export function BookmakerLink({
  bookmakerName,
  sport = "calcio",
  locale: localeProp,
  matchSlug,
  children,
  onClick,
  ...props
}: BookmakerLinkProps) {
  const localeFromHook = useLocale();
  const locale = localeProp ?? localeFromHook;

  return (
    <a
      {...props}
      onClick={(e) => {
        trackEvent("bookmaker_click", {
          bookmaker_name: bookmakerName,
          sport,
          country: locale.toLowerCase(),
          ...(matchSlug && { match_slug: matchSlug }),
          page_path: typeof window !== "undefined" ? window.location.pathname : "",
        });
        onClick?.(e);
      }}
    >
      {children}
    </a>
  );
}
