import { getBookmakers, getBookmakerDisplayName } from "@/lib/quotes/bookmakers";
import Link from "next/link";

export default function AdminBookmakersPage() {
  const bookmakers = getBookmakers();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Siti di scommesse</h2>
        <div className="flex items-center gap-3">
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
          il bottone quote.
        </p>

        <div className="space-y-4">
          {bookmakers.map((bm) => (
            <Link
              key={bm.id}
              href={`/ad2min3k/bookmakers/${bm.id}`}
              className="block rounded-lg border p-4 hover:border-emerald-500 hover:bg-neutral-50/50 transition"
            >
              <div className="flex items-center gap-4">
                {bm.logoUrl && (
                  <img
                    src={bm.logoUrl}
                    alt=""
                    className="h-10 w-10 object-contain"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{getBookmakerDisplayName(bm)}</h3>
                    {bm.siteId && (
                      <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs font-medium text-neutral-600">
                        {bm.siteId}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-neutral-600">
                    Paesi: {bm.countries?.join(", ") || bm.country}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {bm.affiliateUrl}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
