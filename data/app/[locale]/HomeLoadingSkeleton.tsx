/**
 * Skeleton mostrato durante il caricamento dei dati home.
 * Mantiene il layout simile alla pagina reale per una transizione fluida.
 */
export default function HomeLoadingSkeleton() {
  return (
    <>
      {/* Banner placeholder - stessa altezza del vero banner */}
      <div className="fixed left-0 right-0 top-[40px] z-40 border-b border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm md:top-[60px]">
        <div className="mx-auto max-w-6xl px-3 py-1.5 sm:px-4 sm:py-1.5 md:px-5 md:py-1.5">
          <div className="flex gap-2">
            <div className="h-8 w-20 animate-pulse rounded bg-slate-200" />
            <div className="h-8 w-24 animate-pulse rounded bg-slate-200" />
            <div className="h-8 w-16 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      </div>

      <div className="h-[76px] shrink-0 md:h-[108px]" aria-hidden />

      <div className="mx-auto max-w-6xl px-3 pt-4 pb-2 sm:px-4 sm:pt-3 sm:pb-3 md:px-5 md:py-4">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-6">
          <div className="min-w-0 flex-1 space-y-4">
            {/* Data header */}
            <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
            {/* Match cards skeleton */}
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 animate-pulse rounded bg-slate-200" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                    <div className="flex gap-4">
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
                      <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-9 w-12 animate-pulse rounded bg-slate-200" />
                    <div className="h-9 w-12 animate-pulse rounded bg-slate-200" />
                    <div className="h-9 w-12 animate-pulse rounded bg-slate-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Sidebar placeholder */}
          <div className="hidden w-72 shrink-0 lg:block">
            <div className="h-64 animate-pulse rounded-lg border border-[var(--card-border)] bg-slate-100" />
          </div>
        </div>
      </div>
    </>
  );
}
