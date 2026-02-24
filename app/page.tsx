import { redirect } from "next/navigation";

/**
 * Root page: redirect to default locale.
 * With localePrefix "always", the middleware redirects / to /it. This fallback
 * handles edge cases where the middleware might not run (e.g. matcher miss).
 */
export default function RootPage() {
  redirect("/it");
}


