"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

function getDisplayName(bm: { name: string; displayName?: string | null }): string {
  return (bm.displayName?.trim() || bm.name) || "";
}

type Bookmaker = {
  id: string;
  siteId?: string;
  name: string;
  displayName?: string | null;
  logoUrl: string;
  faviconUrl?: string | null;
  countries?: string[];
  country: string;
  affiliateUrl: string;
  isActive: boolean;
};

export default function BookmakerListClient({
  bookmakers,
}: {
  bookmakers: Bookmaker[];
}) {
  const router = useRouter();

  async function handlePauseToggle(e: React.MouseEvent, bm: Bookmaker) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch("/api/ad2min3k/bookmakers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...bm, isActive: !bm.isActive }),
      });
      if (res.ok) router.refresh();
    } catch {
      // ignore
    }
  }

  async function handleDelete(e: React.MouseEvent, bmId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Eliminare definitivamente questo sito? L'operazione non è reversibile.")) return;
    try {
      const res = await fetch(`/api/ad2min3k/bookmakers/${bmId}`, {
        method: "DELETE",
      });
      if (res.ok) router.refresh();
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-4">
      {bookmakers.map((bm) => (
        <Link
          key={bm.id}
          href={`/ad2min3k/bookmakers/${bm.id}`}
          className={`block rounded-lg border p-4 transition hover:border-emerald-500 hover:bg-neutral-50/50 ${
            !bm.isActive ? "border-neutral-200 bg-neutral-50/50 opacity-80" : ""
          }`}
        >
          <div className="flex items-center gap-4">
            {bm.logoUrl && (
              <img
                src={bm.logoUrl}
                alt=""
                className="h-10 w-10 shrink-0 object-contain"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {(bm.faviconUrl || bm.logoUrl) && (
                  <img
                    src={bm.faviconUrl || bm.logoUrl}
                    alt=""
                    className="h-6 w-6 shrink-0 rounded object-contain"
                  />
                )}
                <h3 className={`font-semibold ${!bm.isActive ? "text-neutral-500" : ""}`}>
                  {getDisplayName(bm)}
                </h3>
                {bm.siteId && (
                  <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs font-medium text-neutral-600">
                    {bm.siteId}
                  </span>
                )}
                {!bm.isActive && (
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    In pausa
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
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={(e) => handlePauseToggle(e, bm)}
                className="rounded px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900"
                title={bm.isActive ? "Metti in pausa (nascondi dal sito)" : "Riprendi (mostra sul sito)"}
              >
                {bm.isActive ? "Pausa" : "Riprendi"}
              </button>
              <button
                type="button"
                onClick={(e) => handleDelete(e, bm.id)}
                className="rounded px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
                title="Elimina definitivamente"
              >
                Elimina
              </button>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
