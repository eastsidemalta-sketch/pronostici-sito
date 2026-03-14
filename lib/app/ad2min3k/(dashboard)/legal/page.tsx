"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LegalAdminConfig, LegalDocument } from "@/lib/legalData";
import { localeToCountry } from "@/i18n/routing";
import { allUrlSegments } from "@/i18n/routing";
import RichTextEditor from "@/app/ad2min3k/components/RichTextEditor";

const LOCALES = allUrlSegments.map((locale) => ({
  locale,
  name: localeToCountry[locale] ?? locale,
}));

type DocType = "terms" | "privacy";

const DOC_LABELS: Record<DocType, string> = {
  terms: "Termini e Condizioni",
  privacy: "Privacy Policy",
};

export default function AdminLegalPage() {
  const [config, setConfig] = useState<LegalAdminConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedLocale, setSelectedLocale] = useState<string>("it");
  const [selectedDoc, setSelectedDoc] = useState<DocType>("terms");

  useEffect(() => {
    fetch("/api/ad2min3k/legal")
      .then((r) => r.json())
      .then((data) => {
        setConfig(data.config || {});
      })
      .catch(() => setConfig({}))
      .finally(() => setLoading(false));
  }, []);

  function getDoc(locale: string, type: DocType): LegalDocument {
    return config[locale]?.[type] ?? { linkName: "", title: "", fullText: "" };
  }

  function setDoc(locale: string, type: DocType, doc: Partial<LegalDocument>) {
    const current = getDoc(locale, type);
    const next = { ...current, ...doc };
    setConfig((prev) => ({
      ...prev,
      [locale]: {
        ...prev[locale],
        [type]: next,
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/ad2min3k/legal", {
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

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-neutral-600">Caricamento…</p>
      </main>
    );
  }

  const doc = getDoc(selectedLocale, selectedDoc);

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

      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-2 text-xl font-semibold">Testi legali</h2>
        <p className="mb-6 text-sm text-neutral-600">
          Gestisci il nome del link (footer), il titolo e il testo completo per
          Termini e Condizioni e Privacy Policy. Seleziona lingua e documento.
        </p>

        <div className="mb-6 flex flex-wrap gap-2">
          {LOCALES.map(({ locale, name }) => (
            <button
              key={locale}
              type="button"
              onClick={() => setSelectedLocale(locale)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                selectedLocale === locale
                  ? "bg-emerald-600 text-white"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              {name} ({locale})
            </button>
          ))}
        </div>

        <div className="mb-6 flex gap-2">
          {(["terms", "privacy"] as DocType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedDoc(type)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                selectedDoc === type
                  ? "bg-emerald-600 text-white"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              {DOC_LABELS[type]}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {selectedDoc === "terms" && (
            <>
              <div className="rounded-lg border border-neutral-200 p-4">
                <h3 className="mb-3 font-semibold text-neutral-800">
                  Titolo e nome del link
                </h3>
                <p className="mb-3 text-xs text-neutral-500">
                  Usato come titolo della pagina e come testo del link nel footer
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600">
                      Nome del link (footer)
                    </label>
                    <input
                      type="text"
                      value={doc.linkName}
                      onChange={(e) =>
                        setDoc(selectedLocale, "terms", {
                          linkName: e.target.value,
                        })
                      }
                      placeholder="Es. Termini e Condizioni"
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600">
                      Titolo pagina
                    </label>
                    <input
                      type="text"
                      value={doc.title}
                      onChange={(e) =>
                        setDoc(selectedLocale, "terms", {
                          title: e.target.value,
                        })
                      }
                      placeholder="Es. Termini e Condizioni"
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-neutral-200 p-4">
                <h3 className="mb-3 font-semibold text-neutral-800">
                  Testo completo
                </h3>
                <p className="mb-3 text-xs text-neutral-500">
                  Contenuto della pagina Termini e Condizioni (testo normale, riga vuota = nuovo paragrafo)
                </p>
                <RichTextEditor
                  label="Testo completo"
                  value={doc.fullText}
                  onChange={(v) =>
                    setDoc(selectedLocale, "terms", {
                      fullText: v,
                    })
                  }
                  rows={20}
                  placeholder="Inserisci il testo completo dei Termini e Condizioni..."
                />
              </div>
            </>
          )}

          {selectedDoc === "privacy" && (
            <>
              <div className="rounded-lg border border-neutral-200 p-4">
                <h3 className="mb-3 font-semibold text-neutral-800">
                  Titolo e nome del link
                </h3>
                <p className="mb-3 text-xs text-neutral-500">
                  Usato come titolo della pagina e come testo del link nel footer
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600">
                      Nome del link (footer)
                    </label>
                    <input
                      type="text"
                      value={doc.linkName}
                      onChange={(e) =>
                        setDoc(selectedLocale, "privacy", {
                          linkName: e.target.value,
                        })
                      }
                      placeholder="Es. Informativa sulla privacy"
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600">
                      Titolo pagina
                    </label>
                    <input
                      type="text"
                      value={doc.title}
                      onChange={(e) =>
                        setDoc(selectedLocale, "privacy", {
                          title: e.target.value,
                        })
                      }
                      placeholder="Es. Informativa sulla privacy"
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-neutral-200 p-4">
                <h3 className="mb-3 font-semibold text-neutral-800">
                  Testo completo
                </h3>
                <p className="mb-3 text-xs text-neutral-500">
                  Contenuto della pagina Privacy Policy (testo normale, riga vuota = nuovo paragrafo)
                </p>
                <RichTextEditor
                  label="Testo completo"
                  value={doc.fullText}
                  onChange={(v) =>
                    setDoc(selectedLocale, "privacy", {
                      fullText: v,
                    })
                  }
                  rows={20}
                  placeholder="Inserisci il testo completo della Privacy Policy..."
                />
              </div>
            </>
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
