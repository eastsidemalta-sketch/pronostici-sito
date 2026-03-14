import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Demo componenti",
  description: "Anteprima box quote, bonus e colori",
};

export default function DemoPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-xl font-bold">Demo componenti</h1>
      <p className="mb-8 text-sm text-[var(--foreground-muted)]">
        Anteprima di come appaiono i box quote con favicon su sfondo bianco e i bottoni bonus (giallo/arancione).
      </p>

      {/* Box quote 1X2 con favicon su sfondo bianco */}
      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold text-[var(--foreground-muted)]">Box quote (favicon su sfondo bianco)</h2>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm">
          <div className="flex justify-center gap-2">
            <div className="flex flex-col items-center">
              <span className="mb-1 text-[10px] font-medium text-[var(--foreground-muted)]">1</span>
              <div className="flex min-w-[5rem] overflow-hidden rounded-lg border border-[var(--card-border)]">
                <div className="flex shrink-0 items-center justify-center border-r border-gray-200 bg-white px-2 py-2">
                  <img src="/logos/bet365.svg" alt="" className="h-7 w-7 object-contain" />
                </div>
                <div className="flex flex-1 items-center justify-center bg-slate-100 px-2 py-2">
                  <span className="text-xs font-bold text-[var(--best-odds)]">2.10</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <span className="mb-1 text-[10px] font-medium text-[var(--foreground-muted)]">X</span>
              <div className="flex min-w-[5rem] overflow-hidden rounded-lg border border-[var(--card-border)]">
                <div className="flex shrink-0 items-center justify-center border-r border-gray-200 bg-white px-2 py-2">
                  <img src="/logos/placeholder.svg" alt="" className="h-7 w-7 object-contain" />
                </div>
                <div className="flex flex-1 items-center justify-center bg-slate-100 px-2 py-2">
                  <span className="text-xs font-bold text-[var(--best-odds)]">3.40</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <span className="mb-1 text-[10px] font-medium text-[var(--foreground-muted)]">2</span>
              <div className="flex min-w-[5rem] overflow-hidden rounded-lg border border-[var(--card-border)]">
                <div className="flex shrink-0 items-center justify-center border-r border-gray-200 bg-white px-2 py-2">
                  <img src="/logos/circular.svg" alt="" className="h-7 w-7 object-contain" />
                </div>
                <div className="flex flex-1 items-center justify-center bg-slate-100 px-2 py-2">
                  <span className="text-xs font-bold text-[var(--best-odds)]">3.20</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottoni bonus giallo e arancione */}
      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold text-[var(--foreground-muted)]">Bottoni bonus</h2>
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-1 text-xs text-[var(--foreground-muted)]">Giallo – logo su bianco, testo su giallo</p>
            <a
              href="#"
              className="flex w-full overflow-hidden rounded-lg border border-[var(--card-border)] transition hover:opacity-95"
            >
              <div className="flex shrink-0 items-center justify-center border-r border-gray-200 bg-white px-3 py-2">
                <img src="/logos/bet365.svg" alt="" className="h-6 w-6 object-contain" />
              </div>
              <div className="flex flex-1 items-center justify-center bg-[#ffe71e] px-4 py-3 text-sm font-extrabold text-black">
                100€ DI BONUS
              </div>
            </a>
          </div>
          <div>
            <p className="mb-1 text-xs text-[var(--foreground-muted)]">Arancione – logo su bianco, testo su arancione</p>
            <a
              href="#"
              className="flex w-full overflow-hidden rounded-lg border border-[var(--card-border)] transition hover:opacity-95"
            >
              <div className="flex shrink-0 items-center justify-center border-r border-gray-200 bg-white px-3 py-2">
                <img src="/logos/bet365.svg" alt="" className="h-6 w-6 object-contain" />
              </div>
              <div className="flex flex-1 items-center justify-center bg-[#f57003] px-4 py-3 text-sm font-extrabold text-black">
                100€ DI BONUS
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Box arancione sui pronostici */}
      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold text-[var(--foreground-muted)]">Box arancione sui pronostici</h2>
        <p className="mb-4 text-xs text-[var(--foreground-muted)]">
          Come appare il bottone bonus arancione sotto le percentuali 1X2 quando &quot;Mostra anche nel box Pronostici&quot; è attivo.
        </p>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start sm:justify-end">
            <div className="flex flex-col items-center gap-2">
              <div className="flex justify-center gap-2">
                <div className="flex flex-col items-center">
                  <span className="mb-1 text-[10px] font-medium text-[var(--foreground-muted)]">1</span>
                  <div className="flex min-w-[4rem] items-center justify-center rounded-lg bg-[var(--accent)] px-2.5 py-2">
                    <span className="text-xs font-bold text-white md:text-sm">38%</span>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <span className="mb-1 text-[10px] font-medium text-[var(--foreground-muted)]">X</span>
                  <div className="flex min-w-[4rem] items-center justify-center rounded-lg bg-slate-100 px-2.5 py-2">
                    <span className="text-xs font-bold text-[var(--accent)] md:text-sm">25%</span>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <span className="mb-1 text-[10px] font-medium text-[var(--foreground-muted)]">2</span>
                  <div className="flex min-w-[4rem] items-center justify-center rounded-lg bg-slate-100 px-2.5 py-2">
                    <span className="text-xs font-bold text-[var(--accent)] md:text-sm">37%</span>
                  </div>
                </div>
              </div>
              <a href="#" className="text-[10px] font-medium text-[var(--accent)] underline-offset-2 hover:underline">
                Pronostici completi &gt;
              </a>
              <a
                href="#"
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-black/25 bg-[#f57003] px-2.5 py-1.5 text-[10px] font-extrabold text-black transition hover:bg-[#f57003]/90"
              >
                <img src="/logos/bet365.svg" alt="" className="h-4 w-4 shrink-0 object-contain" />
                <span>100€ DI BONUS</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Tabella quote con favicon su sfondo bianco */}
      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold text-[var(--foreground-muted)]">Tabella quote (favicon su sfondo bianco)</h2>
        <div className="overflow-hidden rounded-lg border border-[var(--card-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] bg-slate-50">
                <th className="px-3 py-2 text-left text-xs font-semibold">Bookmaker</th>
                <th className="px-3 py-2 text-center text-xs font-semibold">1</th>
                <th className="px-3 py-2 text-center text-xs font-semibold">X</th>
                <th className="px-3 py-2 text-center text-xs font-semibold">2</th>
                <th className="w-20 px-3 py-2 text-center text-xs font-semibold">Sito</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="flex items-center gap-2 px-3 py-2">
                  <div className="flex shrink-0 items-center justify-center rounded border border-gray-200 bg-white p-1.5">
                    <img src="/logos/bet365.svg" alt="" className="h-6 w-6 object-contain md:h-8 md:w-8" />
                  </div>
                  <span className="text-xs font-medium">Unibet</span>
                </td>
                <td className="px-3 py-2 text-center text-xs font-semibold">2.10</td>
                <td className="px-3 py-2 text-center text-xs font-semibold">3.40</td>
                <td className="px-3 py-2 text-center text-xs font-semibold">3.20</td>
                <td className="px-3 py-2 text-center">
                  <span className="inline-flex rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white">Scommetti</span>
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="flex items-center gap-2 px-3 py-2">
                  <div className="flex shrink-0 items-center justify-center rounded border border-gray-200 bg-white p-1.5">
                    <img src="/logos/placeholder.svg" alt="" className="h-6 w-6 object-contain md:h-8 md:w-8" />
                  </div>
                  <span className="text-xs font-medium">Parions Sport</span>
                </td>
                <td className="px-3 py-2 text-center text-xs font-semibold">2.08</td>
                <td className="px-3 py-2 text-center text-xs font-semibold">3.45</td>
                <td className="px-3 py-2 text-center text-xs font-semibold">3.25</td>
                <td className="px-3 py-2 text-center">
                  <span className="inline-flex rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white">Scommetti</span>
                </td>
              </tr>
              <tr>
                <td className="flex items-center gap-2 px-3 py-2">
                  <div className="flex shrink-0 items-center justify-center rounded border border-gray-200 bg-white p-1.5">
                    <img src="/logos/circular.svg" alt="" className="h-6 w-6 object-contain md:h-8 md:w-8" />
                  </div>
                  <span className="text-xs font-medium">Bet365</span>
                </td>
                <td className="px-3 py-2 text-center text-xs font-semibold">2.05</td>
                <td className="px-3 py-2 text-center text-xs font-semibold">3.50</td>
                <td className="px-3 py-2 text-center text-xs font-semibold">3.30</td>
                <td className="px-3 py-2 text-center">
                  <span className="inline-flex rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white">Scommetti</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <Link
        href="/"
        className="inline-block rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
      >
        ← Torna alla home
      </Link>
    </main>
  );
}
