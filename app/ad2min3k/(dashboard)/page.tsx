import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h2 className="text-2xl font-semibold mb-6">Dashboard</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/ad2min3k/bookmakers"
          className="rounded-xl border bg-white p-6 shadow-sm hover:border-emerald-500 hover:shadow transition"
        >
          <h3 className="font-semibold">Bookmaker</h3>
          <p className="mt-2 text-sm text-neutral-600">
            Gestisci bookmaker, link affiliate e paesi
          </p>
        </Link>
        <Link
          href="/ad2min3k/sports"
          className="rounded-xl border bg-white p-6 shadow-sm hover:border-emerald-500 hover:shadow transition"
        >
          <h3 className="font-semibold">Sport per paese</h3>
          <p className="mt-2 text-sm text-neutral-600">
            Gestisci quali rubriche sport sono attive in ogni paese
          </p>
        </Link>
        <Link
          href="/ad2min3k/menus"
          className="rounded-xl border bg-white p-6 shadow-sm hover:border-emerald-500 hover:shadow transition"
        >
          <h3 className="font-semibold">Menu e sottomenu</h3>
          <p className="mt-2 text-sm text-neutral-600">
            Gestisci menu (sport) e sottomenu (competizioni) per paese
          </p>
        </Link>
        <Link
          href="/ad2min3k/leagues"
          className="rounded-xl border bg-white p-6 shadow-sm hover:border-emerald-500 hover:shadow transition"
        >
          <h3 className="font-semibold">Competizioni</h3>
          <p className="mt-2 text-sm text-neutral-600">
            Seleziona quali campionati e coppe mostrare nel sito
          </p>
        </Link>
        <Link
          href="/ad2min3k/bonus"
          className="rounded-xl border bg-white p-6 shadow-sm hover:border-emerald-500 hover:shadow transition"
        >
          <h3 className="font-semibold">Bonus</h3>
          <p className="mt-2 text-sm text-neutral-600">
            Ordina i bonus dei bookmaker per paese (trascina per riordinare)
          </p>
        </Link>
        <Link
          href="/ad2min3k/sites"
          className="rounded-xl border bg-white p-6 shadow-sm hover:border-emerald-500 hover:shadow transition"
        >
          <h3 className="font-semibold">Siti di scommesse</h3>
          <p className="mt-2 text-sm text-neutral-600">
            Ordina i siti di scommesse per paese (trascina per riordinare)
          </p>
        </Link>
        <Link
          href="/ad2min3k/team-aliases"
          className="rounded-xl border bg-white p-6 shadow-sm hover:border-emerald-500 hover:shadow transition"
        >
          <h3 className="font-semibold">Alias squadre</h3>
          <p className="mt-2 text-sm text-neutral-600">
            Mappa nomi squadre per matching quote (API-Football ↔ bookmaker)
          </p>
        </Link>
        <Link
          href="/ad2min3k/matching-report"
          className="rounded-xl border bg-white p-6 shadow-sm hover:border-emerald-500 hover:shadow transition"
        >
          <h3 className="font-semibold">Report matching</h3>
          <p className="mt-2 text-sm text-neutral-600">
            Analizza matching automatico, vedi errori e applica correzioni
          </p>
        </Link>
        <Link
          href="/ad2min3k/legal"
          className="rounded-xl border bg-white p-6 shadow-sm hover:border-emerald-500 hover:shadow transition"
        >
          <h3 className="font-semibold">Testi legali</h3>
          <p className="mt-2 text-sm text-neutral-600">
            Termini e Condizioni, Privacy Policy: titolo, link e testo completo
          </p>
        </Link>
        <Link
          href="/ad2min3k/telegram-banner"
          className="rounded-xl border bg-white p-6 shadow-sm hover:border-emerald-500 hover:shadow transition"
        >
          <h3 className="font-semibold">Banner Telegram</h3>
          <p className="mt-2 text-sm text-neutral-600">
            Testo, bottone e link canale per paese (ogni 5 partite nella home)
          </p>
        </Link>
      </div>
    </main>
  );
}
