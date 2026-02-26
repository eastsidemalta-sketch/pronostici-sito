import { redirect } from "next/navigation";
import { getDefaultLocale } from "@/lib/markets";

/**
 * Root page: redirect to default market locale.
 * Config-driven: deriva da SUPPORTED_MARKETS (primo mercato attivo).
 */
export default function RootPage() {
  redirect(`/${getDefaultLocale()}`);
}


