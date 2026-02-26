"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import RichTextEditor from "@/app/ad2min3k/components/RichTextEditor";

type Bookmaker = {
  id: string;
  siteId?: string;
  name: string;
  displayName?: string | null;
  slug: string;
  country: string;
  countries?: string[];
  countryConfig?: Record<string, unknown>;
  logoUrl: string;
  faviconUrl?: string | null;
  affiliateUrl: string;
  quoteButtonUrl?: string | null;
  url2?: string | null;
  url2UseCase?: string;
  url3?: string | null;
  url3UseCase?: string;
  isActive: boolean;
  apiProvider: string;
  apiBaseUrl?: string;
  apiKey: string;
  apiBookmakerKey?: string;
  apiConfig: { markets: string[] };
  apiDocumentationUrl?: string | null;
  apiEndpoint?: string | null;
  apiAuthType?: "query" | "header" | "bearer";
  apiSecret?: string | null;
  apiMappingConfig?: {
    homeTeam?: string;
    awayTeam?: string;
    odds1?: string;
    oddsX?: string;
    odds2?: string;
    eventsPath?: string;
  } | null;
  apiDiscoveryStatus?: string;
  apiLeagueMapping?: Record<string, string>;
  apiRequestConfig?: {
    method?: "GET" | "POST";
    queryParams?: Record<string, string>;
    bodyTemplate?: Record<string, unknown>;
  };
};

const USE_CASES = ["scommetti", "registrati", "bonus", "casino", "sport"];

export default function AdminBookmakerEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [bm, setBm] = useState<Bookmaker | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState("");
  const [testingApi, setTestingApi] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; rawBody?: string; error?: string } | null>(null);
  const [discoverResult, setDiscoverResult] = useState<{
    ok: boolean;
    mapping?: Record<string, string>;
    error?: string;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/ad2min3k/bookmakers`)
      .then((r) => r.json())
      .then((data) => {
        const found = data.bookmakers?.find((b: Bookmaker) => b.id === id);
        setBm(found || null);
      })
      .catch(() => setBm(null))
      .finally(() => setLoading(false));
  }, [id]);

  function handleChange(field: keyof Bookmaker, value: unknown) {
    if (!bm) return;
    setBm({ ...bm, [field]: value });
  }

  async function handleFaviconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !bm) return;
    setUploadingFavicon(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("favicon", file);
      const res = await fetch(`/api/ad2min3k/bookmakers/${id}/favicon`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Errore ${res.status}: nel caricamento del favicon`);
        return;
      }
      setBm({ ...bm, faviconUrl: data.faviconUrl });
    } catch (err) {
      setError("Errore di connessione. Controlla la console per dettagli.");
      console.error("Favicon upload error:", err);
    } finally {
      setUploadingFavicon(false);
      e.target.value = "";
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !bm) return;
    setUploadingLogo(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch(`/api/ad2min3k/bookmakers/${id}/logo`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Errore ${res.status}: nel caricamento del logo`);
        return;
      }
      setBm({ ...bm, logoUrl: data.logoUrl });
    } catch (err) {
      setError("Errore di connessione. Controlla la console per dettagli.");
      console.error("Logo upload error:", err);
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bm) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/ad2min3k/bookmakers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bm),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Errore nel salvataggio");
        return;
      }
      router.push("/ad2min3k/bookmakers");
      router.refresh();
    } catch {
      setError("Errore di connessione");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-neutral-600">Caricamento…</p>
      </main>
    );
  }

  if (!bm) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-red-600">Bookmaker non trovato</p>
        <Link href="/ad2min3k/bookmakers" className="mt-4 inline-block text-sm text-emerald-600 hover:underline">
          ← Torna ai bookmaker
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/ad2min3k/bookmakers"
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            ← Siti di scommesse
          </Link>
          {bm.siteId && (
            <span className="rounded bg-emerald-50 px-3 py-1 font-mono text-sm font-semibold text-emerald-800">
              {bm.siteId}
            </span>
          )}
        </div>
        <Link
          href={`/ad2min3k/bookmakers/${id}/matching-report`}
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          Report matching →
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="rounded-xl border bg-white p-6">
          <h3 className="mb-4 font-semibold">Generale</h3>
          {bm.siteId && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-medium uppercase text-emerald-700">
                ID sito
              </p>
              <p className="mt-1 font-mono text-lg font-semibold text-emerald-900">
                {bm.siteId}
              </p>
              <p className="mt-1 text-xs text-emerald-700">
                Usa questo ID per bonus, API e integrazioni. Non modificabile.
              </p>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Nome</label>
              <input
                type="text"
                value={bm.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Nome visibile sito</label>
              <input
                type="text"
                value={bm.displayName ?? ""}
                onChange={(e) => handleChange("displayName", e.target.value || null)}
                className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="Nome mostrato sul sito (se vuoto usa Nome)"
              />
              <p className="mt-1 text-xs text-neutral-500">Es: Bet365, Bet 365, PMU Sport…</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Logo</label>
              <div className="flex flex-wrap items-center gap-3">
                {bm.logoUrl && (
                  <img
                    src={bm.logoUrl}
                    alt="Logo"
                    className="h-10 w-10 shrink-0 rounded object-contain border border-neutral-200"
                  />
                )}
                <input
                  type="text"
                  value={bm.logoUrl}
                  onChange={(e) => handleChange("logoUrl", e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="/logos/bet365.png"
                />
                <label className="cursor-pointer shrink-0 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                  <input
                    type="file"
                    accept=".ico,.png,.svg,.jpg,.jpeg,.webp"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="sr-only"
                  />
                  {uploadingLogo ? "Caricamento…" : "Carica logo"}
                </label>
              </div>
              <p className="mt-1 text-xs text-neutral-500">Oppure incolla URL. Formati: .ico, .png, .svg, .jpg, .webp (max 1MB)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Favicon</label>
              <div className="flex items-center gap-4">
                {bm.faviconUrl && (
                  <img
                    src={bm.faviconUrl}
                    alt="Favicon"
                    className="h-8 w-8 rounded object-contain border border-neutral-200"
                  />
                )}
                <label className="cursor-pointer rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                  <input
                    type="file"
                    accept=".ico,.png,.svg,.jpg,.jpeg,.webp"
                    onChange={handleFaviconUpload}
                    disabled={uploadingFavicon}
                    className="sr-only"
                  />
                  {uploadingFavicon ? "Caricamento…" : bm.faviconUrl ? "Cambia favicon" : "Carica favicon"}
                </label>
              </div>
              <p className="mt-1 text-xs text-neutral-500">.ico, .png, .svg, .jpg, .webp (max 512KB)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Paese</label>
              <input
                type="text"
                value={bm.country}
                onChange={(e) => handleChange("country", e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="IT"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Url di base</label>
              <input
                type="url"
                value={bm.affiliateUrl}
                onChange={(e) => handleChange("affiliateUrl", e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6">
          <h3 className="mb-4 font-semibold">Url2 e Url3</h3>
          <p className="mb-4 text-sm text-neutral-600">
            Definisci URL aggiuntivi e dove utilizzarli (es. registrati, bonus).
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Url2</label>
              <input
                type="url"
                value={bm.url2 || ""}
                onChange={(e) => handleChange("url2", e.target.value || null)}
                className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="https://..."
              />
              <select
                value={bm.url2UseCase || ""}
                onChange={(e) => handleChange("url2UseCase", e.target.value || undefined)}
                className="mt-2 w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Dove utilizzare Url2</option>
                {USE_CASES.map((uc) => (
                  <option key={uc} value={uc}>{uc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Url3</label>
              <input
                type="url"
                value={bm.url3 || ""}
                onChange={(e) => handleChange("url3", e.target.value || null)}
                className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="https://..."
              />
              <select
                value={bm.url3UseCase || ""}
                onChange={(e) => handleChange("url3UseCase", e.target.value || undefined)}
                className="mt-2 w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Dove utilizzare Url3</option>
                {USE_CASES.map((uc) => (
                  <option key={uc} value={uc}>{uc}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6">
          <h3 className="mb-4 font-semibold">Link per bottone quote</h3>
          <p className="mb-4 text-sm text-neutral-600">
            URL usato per il bottone &quot;Scommetti&quot; nella tabella quote. Se vuoto, usa il link da countryConfig o url di base.
          </p>
          <input
            type="url"
            value={bm.quoteButtonUrl || ""}
            onChange={(e) => handleChange("quoteButtonUrl", e.target.value || null)}
            className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="https://..."
          />
        </div>

        <div className="rounded-xl border bg-white p-6">
          <h3 className="mb-4 font-semibold">Bonus in Box partita</h3>
          <p className="mb-4 text-sm text-neutral-600">
            Configura i box bonus sotto &quot;Tutte le quote&quot; e &quot;Pronostici completi&quot;. Puoi usare testi e URL diversi per ciascuno.
          </p>
          {(Object.keys(bm.countryConfig || {}) as string[]).length === 0 ? (
            <p className="text-sm text-neutral-500">
              Aggiungi almeno un paese in countryConfig (es. IT, DE) per configurare il Bonus in Box.
            </p>
          ) : (
            <div className="space-y-6">
              {(Object.keys(bm.countryConfig || {}) as string[]).map((countryCode) => {
                const cfg = (bm.countryConfig as Record<string, {
                  matchBoxBonusEnabled?: boolean; matchBoxBonusInPronosticiEnabled?: boolean;
                  matchBoxButtonText?: string; matchBoxButtonUrl?: string;
                  matchBoxPronosticiButtonText?: string; matchBoxPronosticiButtonUrl?: string;
                  matchBoxButtonColor?: "yellow" | "orange"; bonusDescription?: string; links?: unknown[];
                }>)?.[countryCode] || {};
                const updateMatchBox = (updates: Record<string, unknown>) => {
                  const next = { ...(bm.countryConfig || {}) };
                  next[countryCode] = { ...cfg, ...updates };
                  handleChange("countryConfig", next);
                };
                return (
                  <div key={countryCode} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                    <h4 className="mb-4 font-medium text-neutral-800">{countryCode}</h4>

                    {/* Box sotto "Tutte le quote" */}
                    <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
                      <h5 className="mb-3 text-sm font-semibold text-neutral-700">Box sotto &quot;Tutte le quote&quot;</h5>
                      <div className="space-y-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!cfg.matchBoxBonusEnabled}
                            onChange={(e) => updateMatchBox({ matchBoxBonusEnabled: e.target.checked })}
                          />
                          <span className="text-sm">Attiva bonus</span>
                        </label>
                        <div>
                          <RichTextEditor
                            label="Testo bottone"
                            value={cfg.matchBoxButtonText || ""}
                            onChange={(v) => updateMatchBox({ matchBoxButtonText: v || undefined })}
                            rows={2}
                            placeholder="100€ DI BONUS"
                            singleLine
                            preview={false}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">URL redirect</label>
                          <input
                            type="url"
                            value={cfg.matchBoxButtonUrl || ""}
                            onChange={(e) => updateMatchBox({ matchBoxButtonUrl: e.target.value || undefined })}
                            className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Box sotto "Pronostici completi" */}
                    <div className="mb-4 rounded-lg border border-neutral-200 bg-white p-4">
                      <h5 className="mb-3 text-sm font-semibold text-neutral-700">Box sotto &quot;Pronostici completi&quot;</h5>
                      <div className="space-y-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!cfg.matchBoxBonusInPronosticiEnabled}
                            onChange={(e) => updateMatchBox({ matchBoxBonusInPronosticiEnabled: e.target.checked })}
                          />
                          <span className="text-sm">Attiva bonus</span>
                        </label>
                        <div>
                          <RichTextEditor
                            label="Testo bottone (opzionale, se vuoto usa quello delle quote)"
                            value={cfg.matchBoxPronosticiButtonText || ""}
                            onChange={(v) => updateMatchBox({ matchBoxPronosticiButtonText: v || undefined })}
                            rows={2}
                            placeholder="Es. Pronostici gratis"
                            singleLine
                            preview={false}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">URL redirect (opzionale, se vuoto usa quello delle quote)</label>
                          <input
                            type="url"
                            value={cfg.matchBoxPronosticiButtonUrl || ""}
                            onChange={(e) => updateMatchBox({ matchBoxPronosticiButtonUrl: e.target.value || undefined })}
                            className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Colore (comune) */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Colore box (per entrambi)</label>
                      <select
                        value={cfg.matchBoxButtonColor || "yellow"}
                        onChange={(e) => updateMatchBox({ matchBoxButtonColor: e.target.value as "yellow" | "orange" })}
                        className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="yellow">Giallo</option>
                        <option value="orange">Arancione</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-white p-6">
          <h3 className="mb-4 font-semibold">Fonte dati quote</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 mb-2">Provider</label>
            <select
              value={bm.apiProvider || "the_odds_api"}
              onChange={(e) => handleChange("apiProvider", e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="the_odds_api">The Odds API (aggregatore, per test)</option>
              <option value="direct">API diretta del bookmaker</option>
            </select>
          </div>

          {bm.apiProvider === "the_odds_api" ? (
            <>
              <p className="mb-4 text-sm text-neutral-600">
                URL API quote e settaggi (The Odds API). La chiave usa THE_ODDS_API_KEY da .env se non impostata.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">URL base API</label>
                  <input
                    type="url"
                    value={bm.apiBaseUrl || ""}
                    onChange={(e) => handleChange("apiBaseUrl", e.target.value || undefined)}
                    className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="https://api.the-odds-api.com/v4 (default)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">API Key (opzionale)</label>
                  <input
                    type="text"
                    value={bm.apiKey || ""}
                    onChange={(e) => handleChange("apiKey", e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="Lasciare vuoto per usare globale"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Chiave bookmaker API (es. bet365)</label>
                  <input
                    type="text"
                    value={bm.apiBookmakerKey || ""}
                    onChange={(e) => handleChange("apiBookmakerKey", e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="bet365"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Markets (separati da virgola)</label>
                  <input
                    type="text"
                    value={bm.apiConfig?.markets?.join(", ") || "h2h"}
                    onChange={(e) =>
                      handleChange("apiConfig", {
                        ...bm.apiConfig,
                        markets: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) || ["h2h"],
                      })
                    }
                    className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="h2h"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-neutral-600">
                Inserisci documentazione, endpoint e chiavi fornite dal bookmaker. Il sistema prova a fare il matching automatico.
              </p>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">URL documentazione API</label>
                <input
                  type="url"
                  value={bm.apiDocumentationUrl || ""}
                  onChange={(e) => handleChange("apiDocumentationUrl", e.target.value || null)}
                  className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="https://docs.bookmaker.com/api"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Endpoint API quote (URL completo)</label>
                <input
                  type="url"
                  value={bm.apiEndpoint || ""}
                  onChange={(e) => handleChange("apiEndpoint", e.target.value || null)}
                  className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="https://api.bookmaker.com/v1/odds"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Come inviare la chiave</label>
                <select
                  value={bm.apiAuthType || "query"}
                  onChange={(e) => handleChange("apiAuthType", e.target.value as "query" | "header" | "bearer")}
                  className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="query">Query (apiKey=xxx nell&apos;URL)</option>
                  <option value="header">Header (X-Api-Key)</option>
                  <option value="bearer">Bearer token</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">API Key</label>
                <input
                  type="password"
                  value={bm.apiKey || ""}
                  onChange={(e) => handleChange("apiKey", e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Chiave fornita dal bookmaker"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">API Secret (opzionale)</label>
                <input
                  type="password"
                  value={bm.apiSecret || ""}
                  onChange={(e) => handleChange("apiSecret", e.target.value || null)}
                  className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Chiave segreta aggiuntiva"
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  disabled={testingApi || !bm.apiEndpoint}
                  onClick={async () => {
                    setTestingApi(true);
                    setTestResult(null);
                    setDiscoverResult(null);
                    setError("");
                    try {
                      const res = await fetch(`/api/ad2min3k/bookmakers/${id}/test-api`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          apiEndpoint: bm.apiEndpoint,
                          apiKey: bm.apiKey,
                          apiSecret: bm.apiSecret,
                          authType: bm.apiAuthType,
                        }),
                      });
                      const data = await res.json();
                      setTestResult(data);
                      if (data.ok) handleChange("apiDiscoveryStatus", "testing");
                      else handleChange("apiDiscoveryStatus", "failed");
                    } catch {
                      setTestResult({ ok: false, error: "Errore di connessione" });
                    } finally {
                      setTestingApi(false);
                    }
                  }}
                  className="rounded-lg border border-emerald-600 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                >
                  {testingApi ? "Test in corso…" : "Testa connessione"}
                </button>
                <button
                  type="button"
                  disabled={discovering || !testResult?.ok || !testResult?.rawBody}
                  onClick={async () => {
                    setDiscovering(true);
                    setDiscoverResult(null);
                    setError("");
                    try {
                      const res = await fetch(`/api/ad2min3k/bookmakers/${id}/discover-mapping`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ rawBody: testResult?.rawBody }),
                      });
                      const data = await res.json();
                      setDiscoverResult(data);
                      if (data.ok && data.mapping) {
                        handleChange("apiMappingConfig", {
                          eventsPath: data.mapping.eventsPath,
                          homeTeam: data.mapping.homeTeam,
                          awayTeam: data.mapping.awayTeam,
                          odds1: data.mapping.odds1,
                          oddsX: data.mapping.oddsX,
                          odds2: data.mapping.odds2,
                        });
                        handleChange("apiDiscoveryStatus", "matched");
                      } else {
                        handleChange("apiDiscoveryStatus", "failed");
                      }
                    } catch {
                      setDiscoverResult({ ok: false, error: "Errore" });
                    } finally {
                      setDiscovering(false);
                    }
                  }}
                  className="rounded-lg border border-blue-600 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                >
                  {discovering ? "Analisi…" : "Prova matching automatico"}
                </button>
              </div>

              {testResult && (
                <div className={`rounded-lg border p-3 text-sm ${testResult.ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                  {testResult.ok ? (
                    <>
                      <p className="font-medium text-green-800">Connessione riuscita</p>
                      <p className="mt-1 text-green-700">
                        Risposta ricevuta ({testResult.rawBody?.length ?? 0} caratteri). Usa &quot;Prova matching automatico&quot; per analizzare la struttura.
                      </p>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-green-700">Mostra risposta raw</summary>
                        <pre className="mt-2 max-h-48 overflow-auto rounded bg-white p-2 text-xs">{testResult.rawBody?.slice(0, 3000)}</pre>
                      </details>
                    </>
                  ) : (
                    <p className="text-red-700">{testResult.error || "Connessione fallita"}</p>
                  )}
                </div>
              )}

              {discoverResult && (
                <div className={`rounded-lg border p-3 text-sm ${discoverResult.ok ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
                  {discoverResult.ok ? (
                    <>
                      <p className="font-medium text-green-800">Mapping scoperto</p>
                      <pre className="mt-2 rounded bg-white p-2 text-xs">
                        {JSON.stringify(discoverResult.mapping, null, 2)}
                      </pre>
                      <p className="mt-2 text-green-700">Salva il bookmaker per applicare il mapping.</p>
                    </>
                  ) : (
                    <p className="text-amber-800">{discoverResult.error}</p>
                  )}
                </div>
              )}

              {bm.apiMappingConfig && (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Mapping attuale (modificabile)</label>
                  <textarea
                    value={JSON.stringify(bm.apiMappingConfig, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        handleChange("apiMappingConfig", parsed);
                      } catch {
                        // ignora JSON non valido
                      }
                    }}
                    className="w-full rounded border border-neutral-300 p-2 font-mono text-xs"
                    rows={8}
                  />
                </div>
              )}

              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <label className="block text-sm font-medium text-neutral-700 mb-2">Mapping leghe (leagueId → ID bookmaker)</label>
                <p className="mb-2 text-xs text-neutral-600">
                  Es: {`{"135": "serie_a", "140": "laliga"}`} — 135=Serie A, 140=La Liga. Usa l&apos;ID del bookmaker per filtrare.
                </p>
                <textarea
                  value={JSON.stringify(bm.apiLeagueMapping ?? {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      handleChange("apiLeagueMapping", parsed);
                    } catch {
                      // ignora
                    }
                  }}
                  className="w-full rounded border border-neutral-300 p-2 font-mono text-xs"
                  rows={4}
                  placeholder='{"135": "serie_a"}'
                />
              </div>

              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <label className="block text-sm font-medium text-neutral-700 mb-2">Config richiesta (opzionale)</label>
                <p className="mb-2 text-xs text-neutral-600">
                  method, queryParams, bodyTemplate per POST. Es: {`{"method": "POST", "bodyTemplate": {"sport": "soccer"}}`}
                </p>
                <textarea
                  value={JSON.stringify(bm.apiRequestConfig ?? {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      handleChange("apiRequestConfig", parsed);
                    } catch {
                      // ignora
                    }
                  }}
                  className="w-full rounded border border-neutral-300 p-2 font-mono text-xs"
                  rows={4}
                  placeholder='{"method": "GET", "queryParams": {}}'
                />
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-white p-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={bm.isActive}
              onChange={(e) => handleChange("isActive", e.target.checked)}
            />
            <span className="font-medium">Bookmaker attivo</span>
          </label>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-6 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Salvataggio…" : "Salva"}
          </button>
          <Link
            href="/ad2min3k/bookmakers"
            className="rounded-lg border px-6 py-2 font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Annulla
          </Link>
        </div>
      </form>
    </main>
  );
}
