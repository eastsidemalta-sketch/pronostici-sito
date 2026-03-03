import { redirect } from "next/navigation";
import { getBookmakers } from "@/lib/quotes/bookmakers";
import { RedirectContent } from "./RedirectContent";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ url?: string; name?: string; logo?: string }>;
};

/** Estrae i domini consentiti dai bookmaker configurati */
function getAllowedHosts(): Set<string> {
  const hosts = new Set<string>();
  const bookmakers = getBookmakers();
  for (const bm of bookmakers) {
    if (bm.affiliateUrl) {
      try {
        const u = new URL(bm.affiliateUrl);
        hosts.add(u.hostname.toLowerCase().replace(/^www\./, ""));
      } catch {
        /* skip */
      }
    }
    if (bm.quoteButtonUrl) {
      try {
        const u = new URL(bm.quoteButtonUrl);
        hosts.add(u.hostname.toLowerCase().replace(/^www\./, ""));
      } catch {
        /* skip */
      }
    }
    if (bm.countryConfig) {
      for (const cfg of Object.values(bm.countryConfig)) {
        for (const link of cfg.links || []) {
          try {
            const u = new URL(link.url);
            hosts.add(u.hostname.toLowerCase().replace(/^www\./, ""));
          } catch {
            /* skip */
          }
        }
      }
    }
  }
  return hosts;
}

function isUrlAllowed(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const allowed = getAllowedHosts();
  return allowed.has(host) || Array.from(allowed).some((a) => host === a || host.endsWith(`.${a}`));
  } catch {
    return false;
  }
}

export const metadata = {
  robots: "noindex, nofollow",
};

export default async function RedirectPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const url = sp.url;
  const name = sp.name ?? "sito partner";
  const logo = sp.logo;

  if (!url || !url.startsWith("https://")) {
    redirect(`/${locale}`);
  }

  if (!isUrlAllowed(url)) {
    redirect(`/${locale}`);
  }

  const logoUrl = logo && logo.startsWith("/") ? decodeURIComponent(logo) : null;

  return (
    <RedirectContent
      targetUrl={url}
      bookmakerName={decodeURIComponent(name)}
      bookmakerLogoUrl={logoUrl}
    />
  );
}
