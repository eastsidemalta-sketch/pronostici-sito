"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ProviderMapping = Record<string, string | string[]>;
type MappingConfig = Record<string, ProviderMapping>;
type CategoryMapping = Record<string, string[]>;
type CategoryConfig = Record<string, CategoryMapping>;

const TABS = ["squadre", "categorie"] as const;

export default function AdminTeamAliasesByProviderPage() {
  const [mapping, setMapping] = useState<MappingConfig>({});
  const [categoryMapping, setCategoryMapping] = useState<CategoryConfig>({});
  const [defaultCategories, setDefaultCategories] = useState<string[]>([]);
  const [samples, setSamples] = useState<Record<string, Array<{ homeTeam: string; awayTeam: string }>>>({});
  const [providers, setProviders] = useState<Array<{ key: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("squadre");

  useEffect(() => {
    fetch("/api/ad2min3k/team-aliases-by-provider")
      .then((r) => r.json())
      .then((data) => {
        setMapping(data.mapping ?? {});
        setCategoryMapping(data.categoryMapping ?? {});
        setDefaultCategories(data.defaultCategories ?? []);
        setSamples(data.samples ?? {});
        setProviders(data.providers ?? []);
        if (!selectedProvider && (data.providers ?? [])[0]) {
          setSelectedProvider(data.providers[0].key);
        }
      })
      .catch(() => setError("Errore caricamento"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/ad2min3k/team-aliases-by-provider", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapping, categoryMapping }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || (res.status === 401 ? "Effettua il login per salvare" : "Errore salvataggio"));
        return;
      }
      setSuccess("Salvato correttamente");
    } catch {
      setError("Errore di connessione");
    } finally {
      setSaving(false);
    }
  }

  function updateMapping(providerKey: string, apiFootballName: string, providerName: string) {
    setMapping((prev) => {
      const next = { ...prev };
      if (!next[providerKey]) next[providerKey] = {};
      if (!providerName.trim()) {
        delete next[providerKey][apiFootballName];
        if (Object.keys(next[providerKey]).length === 0) delete next[providerKey];
      } else {
        next[providerKey][apiFootballName] = providerName.trim();
      }
      return next;
    });
  }

  function addEntry(providerKey: string) {
    setMapping((prev) => ({
      ...prev,
      [providerKey]: { ...(prev[providerKey] ?? {}), "": "" },
    }));
  }

  function updateCategoryMapping(providerKey: string, category: string, variants: string[]) {
    setCategoryMapping((prev) => {
      const next = { ...prev };
      if (!next[providerKey]) next[providerKey] = {};
      next[providerKey][category] = variants.filter(Boolean);
      return next;
    });
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-neutral-600">Caricamento…</p>
      </main>
    );
  }

  const provider = selectedProvider || providers[0]?.key;
  const providerMapping = mapping[provider] ?? {};
  const providerCategoryMapping = categoryMapping[provider] ?? {};
  const categories = [...new Set([...defaultCategories, ...Object.keys(providerCategoryMapping)])];
  const sample = samples[provider] ?? [];
  const uniqueTeams = new Set<string>();
  sample.forEach((s) => {
    if (s.homeTeam) uniqueTeams.add(s.homeTeam);
    if (s.awayTeam) uniqueTeams.add(s.awayTeam);
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/ad2min3k" className="text-sm text-neutral-600 hover:text-neutral-900">
          ← Dashboard
        </Link>
        <Link
          href="/ad2min3k/team-aliases"
          className="text-sm text-neutral-600 hover:text-neutral-900"
        >
          Alias generici →
        </Link>
      </div>

      <h2 className="text-2xl font-semibold mb-2">Mapping Squadre e Categorie</h2>
      <p className="text-sm text-neutral-600 mb-4">
        Mappa i nostri nomi (squadre, Over, Under, 1X2, ecc.) con quelli usati da ogni sito di scommesse.
      </p>

      <div className="mb-6 flex gap-2 border-b border-neutral-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === tab
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-neutral-600 hover:text-neutral-900"
            }`}
          >
            {tab === "squadre" ? "Mapping Squadre" : "Mapping Categorie"}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-6 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>
      )}

      <div className="mb-6 flex gap-2">
        {providers.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setSelectedProvider(p.key)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium ${
              selectedProvider === p.key
                ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                : "border-neutral-300 hover:bg-neutral-50"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {provider && activeTab === "squadre" && (
        <>
          <h3 className="text-lg font-medium mb-3">
            Campione partite da {providers.find((p) => p.key === provider)?.name} ({sample.length}{" "}
            partite)
          </h3>
          <div className="mb-6 max-h-48 overflow-y-auto rounded-lg border bg-neutral-50 p-3 text-xs">
            {sample.length === 0 ? (
              <p className="text-neutral-500">Nessun dato. Visita una pagina con quote per popolare la cache.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left">
                    <th className="pb-1 font-medium">Home (provider)</th>
                    <th className="pb-1 font-medium">Away (provider)</th>
                  </tr>
                </thead>
                <tbody>
                  {sample.slice(0, 20).map((s, i) => (
                    <tr key={i}>
                      <td className="py-0.5">{s.homeTeam}</td>
                      <td className="py-0.5">{s.awayTeam}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <h3 className="text-lg font-medium mb-3">Mapping Squadre – {providers.find((p) => p.key === provider)?.name}</h3>
          <p className="text-sm text-neutral-600 mb-4">
            API Football (sinistra) → Nome usato dal provider (destra). Se non ci sono voci, clicca &quot;+ Aggiungi mapping&quot;.
          </p>
          <div className="space-y-3 mb-6">
            {Object.keys(providerMapping).length === 0 && (
              <p className="text-sm text-neutral-500">Nessun mapping. Clicca &quot;+ Aggiungi mapping&quot; per iniziare.</p>
            )}
            {Object.entries(providerMapping).map(([apiFootball, providerName]) => (
              <div
                key={apiFootball}
                className="flex flex-wrap items-center gap-2 rounded-lg border bg-white p-3"
              >
                <input
                  type="text"
                  value={apiFootball}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v !== apiFootball) {
                      setMapping((prev) => {
                        const next = { ...prev };
                        const pm = { ...(next[provider] ?? {}) };
                        delete pm[apiFootball];
                        if (v.trim()) pm[v.trim()] = Array.isArray(providerName) ? providerName[0] : providerName;
                        next[provider] = pm;
                        return next;
                      });
                    }
                  }}
                  placeholder="API Football (es. Inter)"
                  className="min-w-[140px] rounded border px-3 py-2 text-sm"
                />
                <span className="text-neutral-400">→</span>
                <input
                  type="text"
                  value={Array.isArray(providerName) ? providerName[0] : providerName}
                  onChange={(e) => updateMapping(provider, apiFootball, e.target.value)}
                  placeholder="Nome provider (es. FC Internazionale)"
                  className="min-w-[180px] rounded border px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => updateMapping(provider, apiFootball, "")}
                  className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  Rimuovi
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => addEntry(provider)}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
            >
              + Aggiungi mapping
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "Salvataggio…" : "Salva"}
            </button>
          </div>
        </>
      )}

      {provider && activeTab === "categorie" && (
        <>
          <h3 className="text-lg font-medium mb-2">
            Mapping Categorie – {providers.find((p) => p.key === provider)?.name}
          </h3>
          <p className="text-sm text-neutral-600 mb-4">
            Per ogni nostra categoria, le varianti che il sito usa (separate da virgola). Es: Over, Under, Sopra, Sotto.
          </p>
          <div className="space-y-4 mb-6">
            {categories.map((cat) => {
              const variants = providerCategoryMapping[cat] ?? [];
              const value = variants.join(", ");
              return (
                <div key={cat} className="rounded-lg border bg-white p-4">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{cat}</label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => {
                      const arr = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                      updateCategoryMapping(provider, cat, arr);
                    }}
                    placeholder="Es: Over, Under, Sopra, Sotto"
                    className="w-full rounded border px-3 py-2 text-sm"
                  />
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Salvataggio…" : "Salva"}
          </button>
        </>
      )}
    </main>
  );
}
