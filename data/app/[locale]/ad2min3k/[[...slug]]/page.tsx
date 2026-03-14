import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string; slug?: string[] }>;
};

/**
 * Admin è fuori dal routing i18n (escluso dal middleware).
 * Questa route gestisce /it/ad2min3k, /en/ad2min3k ecc. reindirizzando a /ad2min3k.
 */
export default async function LocaleAdminRedirectPage({ params }: Props) {
  const { slug } = await params;
  const path = slug?.length ? `/${slug.join("/")}` : "";
  redirect(`/ad2min3k${path}`);
}
