"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { localeToCountry, localeToCountryCode } from "@/i18n/routing";
import type { SitesOrderConfig } from "@/lib/sitesOrderConfig";

const COUNTRY_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(localeToCountryCode).map(([locale, code]) => [
    code,
    localeToCountry[locale] || code,
  ])
);

const COUNTRIES = ["IT", "FR", "ES", "DE", "UK", "BR", "NG", "KE", "GH"];

type BookmakerForList = {
  id: string;
  siteId?: string;
  name: string;
  isActive: boolean;
};

function applyOrder(
  bookmakers: BookmakerForList[],
  order: string[] | undefined
): BookmakerForList[] {
  if (!order?.length) return bookmakers;
  const byId = new Map(bookmakers.map((b) => [b.id, b]));
  const result: BookmakerForList[] = [];
  for (const id of order) {
    const b = byId.get(id);
    if (b) result.push(b);
  }
  for (const b of bookmakers) {
    if (!order.includes(b.id)) result.push(b);
  }
  return result;
}

export default function AdminSitesPage() {
  const router = useRouter();
  const [config, setConfig] = useState<SitesOrderConfig>({});
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("IT");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [bookmakersByCountry, setBookmakersByCountry] = useState<
    Record<string, BookmakerForList[]>
  >({});

  // Form creazione nuovo sito
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createForm, setCreateForm] = useState({
    name: "",
    displayName: "",
    country: "IT",
    countries: ["IT"] as string[],
    logoUrl: "",
    affiliateUrl: "",
    apiProvider: "the_odds_api" as "the_odds_api" | "direct",
    apiDocumentationUrl: "",
    apiEndpoint: "",
    apiKey: "",
    apiAuthType: "query" as "query" | "header" | "bearer",
    pauseOddsApi: false,
    /** Se impostato, carica API e dati dalla scheda cliente (es. IT-002 per Netwin) */
    profileSiteId: "" as string,
  });

  const bookmakersForCountry = bookmakersByCountry[selectedCountry] || [];
  const order = config.byCountry?.[selectedCountry];
  const orderedList = applyOrder(bookmakersForCountry, order);

  useEffect(() => {
    fetch("/api/ad2min3k/sites")
      .then((r) => r.json())
      .then((data) => {
        setConfig(data.config || {});
        setCountries(data.countries || ["IT", "FR", "ES", "DE", "UK", "BR", "NG", "KE", "GH"]);
        setBookmakersByCountry(data.bookmakersByCountry || {});
        if (data.countries?.length && !selectedCountry) {
          setSelectedCountry(data.countries[0]);
        }
      })
      .catch(() => {
        setConfig({});
        setCountries(["IT", "FR", "ES", "DE", "UK", "BR", "NG", "KE", "GH"]);
      })
      .finally(() => setLoading(false));
  }, []);

  function moveItem(fromIndex: number, toIndex: number) {
    const ids = orderedList.map((b) => b.id);
    const [removed] = ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, removed);
    setConfig((c) => ({
      ...c,
      byCountry: {
        ...c.byCountry,
        [selectedCountry]: ids,
      },
    }));
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.setData("application/json", JSON.stringify({ id }));
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(id);
  }

  function handleDragLeave() {
    setDragOverId(null);
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    setDraggedId(null);
    setDragOverId(null);
    const fromIndex = orderedList.findIndex((b) => b.id === draggedId);
    const toIndex = orderedList.findIndex((b) => b.id === targetId);
    if (fromIndex >= 0 && toIndex >= 0 && fromIndex !== toIndex) {
      moveItem(fromIndex, toIndex);
    }
  }

  function handleDragEnd() {
    setDraggedId(null);
    setDragOverId(null);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/ad2min3k/sites", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Errore nel salvataggio");
        return;
      }
      setError("");
    } catch {
      setError("Errore di connessione");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/ad2min3k/bookmakers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name || "Nuovo sito",
          displayName: createForm.displayName || undefined,
          country: createForm.country,
          countries: createForm.countries,
          logoUrl: createForm.logoUrl || undefined,
          affiliateUrl: createForm.affiliateUrl || undefined,
          apiProvider: createForm.apiProvider,
          apiDocumentationUrl: createForm.apiDocumentationUrl || undefined,
          apiEndpoint: createForm.apiEndpoint || undefined,
          apiKey: createForm.apiKey || undefined,
          apiAuthType: createForm.apiAuthType,
          pauseOddsApi: createForm.pauseOddsApi,
          profileSiteId: createForm.profileSiteId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "Errore nella creazione");
        return;
      }
      setShowCreate(false);
      setCreateForm({
        name: "",
        displayName: "",
        country: "IT",
        countries: ["IT"],
        logoUrl: "",
        affiliateUrl: "",
        apiProvider: "the_odds_api",
        apiDocumentationUrl: "",
        apiEndpoint: "",
        apiKey: "",
        apiAuthType: "query",
        pauseOddsApi: false,
        profileSiteId: "",
      });
      router.push(`/ad2min3k/bookmakers/${data.bookmaker.id}`);
      router.refresh();
    } catch {
      setCreateError("Errore di connessione");
    } finally {
      setCreating(false);
    }
  }

  function toggleCountryInCreate(code: string) {
    setCreateForm((f) => ({
      ...f,
      countries: f.countries.includes(code)
        ? f.countries.filter((c) => c !== code)
        : [...f.countries, code],
    }));
  }

  function applyNetwinPreset() {
    setCreateForm((f) => ({
      ...f,
      name: "Netwin_It",
      displayName: "Netwin",
      country: "IT",
      countries: ["IT"],
      apiProvider: "direct",
      pauseOddsApi: true,
      profileSiteId: "IT-002",
    }));
  }

  async function handlePauseToggle(bmId: string) {
    try {
      const listRes = await fetch("/api/ad2min3k/bookmakers");
      const { bookmakers } = await listRes.json();
      const bm = bookmakers?.find((b: { id: string }) => b.id === bmId);
      if (!bm) return;
      const res = await fetch("/api/ad2min3k/bookmakers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...bm, isActive: !bm.isActive }),
      });
      if (!res.ok) return;
      setBookmakersByCountry((prev) => {
        const next = { ...prev };
        const list = next[selectedCountry];
        if (list) {
          next[selectedCountry] = list.map((b) =>
            b.id === bmId ? { ...b, isActive: !b.isActive } : b
          );
        }
        return next;
      });
      router.refresh();
    } catch {
      setError("Errore nel cambio stato");
    }
  }

  async function handleDelete(bmId: string) {
    if (!confirm("Eliminare definitivamente questo sito? L'operazione non è reversibile.")) return;
    try {
      const res = await fetch(`/api/ad2min3k/bookmakers/${bmId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Errore nell'eliminazione");
        return;
      }
      setBookmakersByCountry((prev) => {
        const next = { ...prev };
        const list = next[selectedCountry];
        if (list) {
          next[selectedCountry] = list.filter((b) => b.id !== bmId);
        }
        return next;
      });
      setConfig((c) => {
        const order = c.byCountry?.[selectedCountry];
        if (!order) return c;
        return {
          ...c,
          byCountry: {
            ...c.byCountry,
            [selectedCountry]: order.filter((id) => id !== bmId),
          },
        };
      });
      router.refresh();
    } catch {
      setError("Errore di connessione");
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-neutral-600">Caricamento…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/ad2min3k"
          className="text-sm text-neutral-600 hover:text-neutral-900"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Crea nuovo sito - in evidenza */}
      <div className="mb-8 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-6">
        {!showCreate ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-emerald-900">
                Crea nuovo sito di scommesse
              </h2>
              <p className="mt-1 text-sm text-emerald-700">
                Aggiungi un nuovo bookmaker con nome, logo, paesi, link affiliate e configurazione API.
                Poi integra le quote con il link alla documentazione.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-700"
            >
              + Crea nuovo sito
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-emerald-900">
                Nuovo sito – informazioni complete
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={applyNetwinPreset}
                  className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                >
                  Preset Netwin Italia
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="text-sm text-neutral-500 hover:text-neutral-700"
                >
                  Annulla
                </button>
              </div>
            </div>

            {createError && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {createError}
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-4">
                <h4 className="text-sm font-medium uppercase text-neutral-500">
                  Identità e branding
                </h4>
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="Es. Bet365, PMU"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    Nome visibile
                  </label>
                  <input
                    type="text"
                    value={createForm.displayName}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, displayName: e.target.value }))
                    }
                    className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="Nome mostrato sul sito (opzionale)"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    Logo (URL)
                  </label>
                  <input
                    type="url"
                    value={createForm.logoUrl}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, logoUrl: e.target.value }))
                    }
                    className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="https://... o /logos/xxx.png"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    Paese principale
                  </label>
                  <select
                    value={createForm.country}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, country: e.target.value }))
                    }
                    className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {COUNTRY_NAMES[c] || c} ({c})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Paesi dove è visibile
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COUNTRIES.map((c) => (
                      <label
                        key={c}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={createForm.countries.includes(c)}
                          onChange={() => toggleCountryInCreate(c)}
                          className="rounded border-neutral-300"
                        />
                        {c}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    Link affiliate (URL di base)
                  </label>
                  <input
                    type="url"
                    value={createForm.affiliateUrl}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, affiliateUrl: e.target.value }))
                    }
                    className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium uppercase text-neutral-500">
                  API e integrazione quote
                </h4>
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    Provider API
                  </label>
                  <select
                    value={createForm.apiProvider}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        apiProvider: e.target.value as "the_odds_api" | "direct",
                      }))
                    }
                    className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="the_odds_api">The Odds API (aggregatore)</option>
                    <option value="direct">API diretta del bookmaker</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    Link documentazione API
                  </label>
                  <input
                    type="url"
                    value={createForm.apiDocumentationUrl}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        apiDocumentationUrl: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="https://docs.example.com/api"
                  />
                  <p className="mt-1 text-xs text-neutral-500">
                    Per integrare le quote: incolla il link alla doc in inglese
                  </p>
                </div>
                {createForm.apiProvider === "direct" && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-neutral-700">
                        Endpoint API quote
                      </label>
                      <input
                        type="url"
                        value={createForm.apiEndpoint}
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            apiEndpoint: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="https://api.bookmaker.com/v1/odds"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-neutral-700">
                        Chiave API
                      </label>
                      <input
                        type="text"
                        value={createForm.apiKey}
                        onChange={(e) =>
                          setCreateForm((f) => ({ ...f, apiKey: e.target.value }))
                        }
                        className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="Api-Key o token"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-neutral-700">
                        Tipo autenticazione
                      </label>
                      <select
                        value={createForm.apiAuthType}
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            apiAuthType: e.target.value as "query" | "header" | "bearer",
                          }))
                        }
                        className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="query">Query param</option>
                        <option value="header">Header (X-Api-Key)</option>
                        <option value="bearer">Bearer token</option>
                      </select>
                    </div>
                  </>
                )}
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={createForm.pauseOddsApi}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, pauseOddsApi: e.target.checked }))
                      }
                      className="rounded border-neutral-300"
                    />
                    <span className="text-sm font-medium text-amber-900">
                      Metti in pausa i bookmaker The Odds API
                    </span>
                  </label>
                  <p className="mt-1 text-xs text-amber-800">
                    Quando crei il nuovo sito con API diretta, metti in pausa i siti che usano The Odds API (es. Bet365, PMU).
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-emerald-200 pt-4">
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-emerald-600 px-6 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {creating ? "Creazione…" : "Crea sito"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-neutral-300 px-6 py-2 font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Annulla
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-2 text-xl font-semibold">Ordine siti di scommesse per paese</h2>
        <p className="mb-6 text-sm text-neutral-600">
          Trascina i siti per definire l&apos;ordine di visualizzazione nella pagina Siti di scommesse.
          L&apos;ordine è specifico per ogni paese.
        </p>

        <div className="mb-6">
          <p className="mb-2 text-xs font-medium uppercase text-neutral-500">Paese</p>
          <div className="flex flex-wrap gap-2">
            {countries.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setSelectedCountry(code)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  selectedCountry === code
                    ? "bg-emerald-600 text-white"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                }`}
              >
                {COUNTRY_NAMES[code] || code} ({code})
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase text-neutral-500">
            Trascina per riordinare ({orderedList.length} siti)
          </p>
          {orderedList.length === 0 ? (
            <p className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center text-sm text-neutral-500">
              Nessun sito configurato per questo paese. Aggiungi il bookmaker e configuralo
              per il paese in Admin → Bookmaker.
            </p>
          ) : (
            <ul className="space-y-2">
              {orderedList.map((bm) => (
                <li
                  key={bm.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, bm.id)}
                  onDragOver={(e) => handleDragOver(e, bm.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, bm.id)}
                  onDragEnd={handleDragEnd}
                  className={`flex cursor-grab items-center gap-3 rounded-lg border p-3 transition active:cursor-grabbing ${
                    draggedId === bm.id
                      ? "opacity-50"
                      : dragOverId === bm.id
                        ? "border-emerald-500 bg-emerald-50"
                        : !bm.isActive
                          ? "border-neutral-200 bg-neutral-50 opacity-75"
                          : "border-neutral-200 bg-white hover:bg-neutral-50"
                  }`}
                >
                  <span
                    className="text-neutral-400"
                    aria-hidden
                  >
                    ⋮⋮
                  </span>
                  <span className={`min-w-0 flex-1 font-medium ${!bm.isActive ? "text-neutral-500" : ""}`}>
                    {bm.name}
                  </span>
                  <span className="text-xs text-neutral-400 shrink-0">
                    {bm.siteId ? `(${bm.siteId})` : `(${bm.id})`}
                  </span>
                  {!bm.isActive && (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      In pausa
                    </span>
                  )}
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePauseToggle(bm.id);
                      }}
                      className="rounded px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900"
                      title={bm.isActive ? "Metti in pausa (nascondi dal sito)" : "Riprendi (mostra sul sito)"}
                    >
                      {bm.isActive ? "Pausa" : "Riprendi"}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(bm.id);
                      }}
                      className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
                      title="Elimina definitivamente"
                    >
                      Elimina
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-6 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Salvataggio…" : "Salva"}
          </button>
        </div>
      </div>
    </main>
  );
}
