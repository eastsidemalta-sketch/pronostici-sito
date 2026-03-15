"use client";

import { useLocale } from "next-intl";
import { trackEvent } from "@/lib/analytics/ga";
import { getRedirectToBookmakerUrl } from "@/lib/redirectToBookmaker";

type BookmakerLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  bookmakerName: string;
  sport?: string;
  locale?: string;
  matchSlug?: string;
  /** Logo del bookmaker per la pagina passarella (es. /logos/bet365.svg) */
  logoUrl?: string | null;
};

export function BookmakerLink({
  bookmakerName,
  sport = "calcio",
  locale: localeProp,
  matchSlug,
  logoUrl,
  href,
  children,
  onClick,
  ...props
}: BookmakerLinkProps) {
  const localeFromHook = useLocale();
  const locale = localeProp ?? localeFromHook;

  const isExternal = href?.startsWith("http");
  const finalHref =
    isExternal && href && bookmakerName
      ? getRedirectToBookmakerUrl(href, bookmakerName, locale, logoUrl)
      : href;

  return (
    <a
      {...props}
      href={finalHref}
      target={isExternal ? "_blank" : props.target}
      rel={isExternal ? "noopener noreferrer" : props.rel}
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
