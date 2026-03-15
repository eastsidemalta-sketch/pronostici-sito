/**
 * Schema.org JSON-LD base: Organization, WebSite, Sport.
 * Solo markup sicuri, nessun Event/Match/Odds/Review/FAQ.
 */

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://playsignal.io"
).replace(/\/$/, "");

const SITE_NAME = "PlaySignal";
const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export type BaseSchemaParams = {
  /** sameAs: profili social (opzionale, omettere se vuoto) */
  sameAs?: string[];
};

/**
 * JSON-LD @graph con Organization, WebSite, Sport.
 * Da iniettare nel layout principale.
 */
export function getBaseSchemaJsonLd(params?: BaseSchemaParams): object {
  const organization: Record<string, unknown> = {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
  };
  if (params?.sameAs?.length) {
    organization.sameAs = params.sameAs;
  }

  const sportId = `${SITE_URL}/#sport-calcio`;
  organization.knowsAbout = { "@id": sportId };

  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: SITE_URL,
        name: SITE_NAME,
        publisher: { "@id": ORGANIZATION_ID },
      },
      {
        "@type": "Sport",
        "@id": sportId,
        name: "Calcio",
      },
    ],
  };
}
