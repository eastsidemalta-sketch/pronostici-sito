/**
 * Mostra subito quando si naviga (es. click logo, menu).
 * Riduce la percezione di lentezza mentre il server carica i dati.
 */
export default function LocaleLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent"
          aria-hidden
        />
        <p className="text-sm text-[var(--foreground-muted)]">Caricamento…</p>
      </div>
    </div>
  );
}
