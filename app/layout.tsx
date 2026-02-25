import type { Metadata } from "next";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://playsignal.io";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PlaySignal | Calcio, Quote e Analisi Partite",
    template: "%s | PlaySignal",
  },
  description:
    "Analisi basate su dati, probabilità e segnali intelligenti per interpretare le quote dei bookmaker. Confronta eventi sportivi e prendi decisioni più informate.",
  keywords: ["pronostici", "quote", "calcio", "scommesse", "partite", "1X2", "analisi"],
  authors: [{ name: "PlaySignal" }],
  creator: "PlaySignal",
  openGraph: {
    type: "website",
    locale: "it_IT",
    url: SITE_URL,
    siteName: "PlaySignal",
    title: "PlaySignal | Calcio, Quote e Analisi Partite",
    description: "Analisi basate su dati, probabilità e segnali intelligenti per interpretare le quote dei bookmaker. Confronta eventi sportivi e prendi decisioni più informate.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PlaySignal | Calcio, Quote e Analisi Partite",
    description: "Analisi basate su dati, probabilità e segnali intelligenti per interpretare le quote dei bookmaker. Confronta eventi sportivi e prendi decisioni più informate.",
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="bg-[var(--background)] text-[var(--foreground)]">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){window.dataLayer.push(arguments);}
  window.gtag('js', new Date());
  window.gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
