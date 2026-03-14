import { getBookmakers } from "@/lib/quotes/bookmakers";
import Link from "next/link";
import BookmakerListClient from "./BookmakerListClient";

export default function AdminBookmakersPage() {
  const bookmakers = getBookmakers();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Siti di scommesse</h2>
        <div className="flex items-center gap-3">
          <Link
            href="/ad2min3k/team-aliases-by-provider?tab=leghe"
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Mapping leghe
          </Link>
          <Link
            href="/ad2min3k/bookmakers/new"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            + Nuovo sito
          </Link>
          <Link
            href="/ad2min3k"
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            ← Dashboard
          </Link>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6">
        <p className="mb-4 text-sm text-neutral-600">
          Clicca su un bookmaker per modificare Nome, Logo, URL, API e link per
          il bottone quote. Puoi mettere in pausa (nascondere dal sito) o eliminare.
        </p>

        <BookmakerListClient bookmakers={bookmakers} />
      </div>
    </main>
  );
}
