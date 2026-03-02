"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMarketConfig } from "@/lib/markets";
import type { TelegramChannelsConfig } from "@/lib/telegramChannelsConfig";
import RichTextEditor from "@/app/ad2min3k/components/RichTextEditor";

function getCountryName(code: string): string {
  return getMarketConfig(code)?.name ?? code;
}

const EMOJI_QUICK = [
  "⚽", "🏆", "🔥", "⭐", "✅", "❌", "📊", "💰", "🎯", "📢",
  "👍", "👏", "💪", "🏅", "📈", "🎉", "🔔", "📱", "🌍", "🇮🇹",
  "🇫🇷", "🇪🇸", "🇩🇪", "🇬🇧", "🇧🇷", "🔄", "📥", "📤", "🔗", "⏰",
  "📅", "🏷️", "📌", "🔒", "🔓", "💡", "🎲", "🃏", "🚀", "⚡",
  "🛡️", "🏁", "🏳️", "🔴", "🟢", "🟡", "🔵", "💬", "📣", "🎁",
];

const EMOJI_BUTTON = ["👉", "🔗", "✅", "📥", "🎯", "⚽", "🏆", "🔥", "⭐", "💰"];

export default function AdminTelegramPostsPage() {
  const [config, setConfig] = useState<TelegramChannelsConfig>({});
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("IT");
  const [text, setText] = useState("");
  const [media, setMedia] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | "">("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [buttons, setButtons] = useState<Array<{ text: string; url: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const channelId = config.byCountry?.[selectedCountry] ?? "";

  useEffect(() => {
    fetch("/api/ad2min3k/telegram-posts")
      .then((r) => r.json())
      .then((data) => {
        setConfig(data.config || {});
        setCountries(data.countries || ["IT", "FR", "ES", "DE", "UK", "BR", "NG", "KE", "GH"]);
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

  function updateChannelId(value: string) {
    setConfig((c) => ({
      ...c,
      byCountry: {
        ...c.byCountry,
        [selectedCountry]: value,
      },
    }));
  }

  function insertEmoji(emoji: string) {
    setText((t) => t + emoji);
  }

  function insertEmojiInButton(index: number, emoji: string) {
    setButtons((b) => {
      const next = [...b];
      next[index] = { ...next[index]!, text: (next[index]?.text ?? "") + emoji };
      return next;
    });
  }

  function addButton() {
    setButtons((b) => [...b, { text: "", url: "" }]);
  }

  function updateButton(index: number, field: "text" | "url", value: string) {
    setButtons((b) => {
      const next = [...b];
      next[index] = { ...next[index]!, [field]: value };
      return next;
    });
  }

  function removeButton(index: number) {
    setButtons((b) => b.filter((_, i) => i !== index));
  }

  async function compressImage(file: File, maxSizeKB = 900): Promise<File> {
    if (file.size <= maxSizeKB * 1024) return file;
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const maxDim = 1920;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = (height / width) * maxDim;
            width = maxDim;
          } else {
            width = (width / height) * maxDim;
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        let quality = 0.85;
        const tryExport = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }
              if (blob.size <= maxSizeKB * 1024 || quality <= 0.3) {
                resolve(new File([blob], file.name, { type: "image/jpeg" }));
              } else {
                quality -= 0.15;
                tryExport();
              }
            },
            "image/jpeg",
            quality
          );
        };
        tryExport();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    });
  }

  async function uploadImageToHosting(file: File): Promise<string | null> {
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/ad2min3k/telegram-posts/upload-image", {
        method: "POST",
        body: fd,
        credentials: "same-origin",
      });
      const data = (await res.json()) as { url?: string };
      if (res.ok && data.url) return data.url;
    } catch {
      // fallback a servizi esterni
    }
    const imgbbKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
    if (imgbbKey) {
      try {
        const fd = new FormData();
        fd.append("image", file);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}&expiration=31536000`, {
          method: "POST",
          body: fd,
        });
        const data = (await res.json()) as { data?: { url?: string }; success?: boolean };
        if (data.success && data.data?.url) return data.data.url;
      } catch {
        // fallback
      }
    }
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("https://0x0.st", { method: "POST", body: fd });
      if (res.ok) {
        const url = await res.text();
        return url?.trim() || null;
      }
    } catch {
      // fallback
    }
    return null;
  }

  async function handleMediaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setMedia(null);
      setMediaType("");
      setImageUrl("");
      return;
    }
    const type = file.type;
    if (type.startsWith("image/")) {
      const compressed = await compressImage(file);
      setMedia(compressed);
      setMediaType("image");
      setImageUrl("");
      setUploadingImage(true);
      setError("");
      try {
        const url = await uploadImageToHosting(compressed);
        if (url) {
          setImageUrl(url);
          setMedia(null);
          setSuccess("Immagine caricata automaticamente");
        }
      } catch {
        setError("Upload automatico fallito. Incolla l'URL manualmente o riprova.");
      } finally {
        setUploadingImage(false);
      }
    } else if (type.startsWith("video/")) {
      setMedia(file);
      setMediaType("video");
      setImageUrl("");
    } else {
      setMedia(null);
      setMediaType("");
      setImageUrl("");
      setError("Formato non supportato. Usa immagine (JPEG, PNG, GIF) o video (MP4, ecc.).");
    }
  }

  function handleImageUrlChange(url: string) {
    setImageUrl(url);
    if (url.trim()) {
      setMedia(null);
      setMediaType("image");
    } else {
      setMediaType("");
    }
  }

  async function handleSaveChannels() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/ad2min3k/telegram-posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Errore nel salvataggio");
        return;
      }
      setSuccess("Canali salvati");
    } catch {
      setError("Errore di connessione");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/ad2min3k/telegram-posts/test");
      const data = await res.json();
      if (res.ok && data.ok) {
        setSuccess("Test OK: API raggiungibile, token configurato");
      } else {
        setError(data.error || "Test fallito");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossibile raggiungere il server. Controlla la connessione (Network tab F12).");
    } finally {
      setTesting(false);
    }
  }

  async function handleSend() {
    setSending(true);
    setError("");
    setSuccess("");
    try {
      const formData = new FormData();
      formData.append("country", selectedCountry);
      formData.append("text", text);
      formData.append("mediaType", mediaType);
      formData.append("buttons", JSON.stringify(buttons.filter((b) => b.text.trim() && b.url.trim())));

      if (imageUrl.trim() && mediaType === "image") {
        formData.append("imageUrl", imageUrl.trim());
      } else if (media && mediaType) {
        formData.append("media", media);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const res = await fetch("/api/ad2min3k/telegram-posts/send", {
        method: "POST",
        body: formData,
        signal: controller.signal,
        credentials: "same-origin",
      });
      clearTimeout(timeout);

      let data: { error?: string; message?: string };
      try {
        data = await res.json();
      } catch {
        setError(res.status === 502 || res.status === 504 ? "Timeout o server non raggiungibile. Riprova." : "Risposta non valida dal server.");
        return;
      }
      if (!res.ok) {
        setError(data.error || "Errore nell'invio");
        return;
      }
      setSuccess(data.message || "Post inviato");
      setText("");
      setMedia(null);
      setMediaType("");
      setImageUrl("");
      setButtons([]);
    } catch (e) {
      if (e instanceof Error) {
        setError(e.name === "AbortError" ? "Timeout (60s). Riprova o riduci la dimensione del file." : e.message);
      } else {
        setError("Errore di connessione");
      }
    } finally {
      setSending(false);
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

      <div className="space-y-6">
        {/* Config canali per paese */}
        <div className="rounded-xl border bg-white p-6">
          <h2 className="mb-2 text-xl font-semibold">Canali Telegram per paese</h2>
          <p className="mb-4 text-sm text-neutral-600">
            Configura l&apos;ID del canale per ogni paese. Usa @channelusername (es. @playsignal_it) oppure -100xxxxxxxxxx.
            Il bot deve essere admin del canale per poter pubblicare.
          </p>

          <div className="mb-4">
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
                  {getCountryName(code)}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Channel ID per {getCountryName(selectedCountry)}
            </label>
            <input
              type="text"
              value={channelId}
              onChange={(e) => updateChannelId(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="@playsignal_it o -1001234567890"
            />
          </div>

          <button
            type="button"
            onClick={handleSaveChannels}
            disabled={saving}
            className="rounded-lg bg-neutral-200 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-300 disabled:opacity-50"
          >
            {saving ? "Salvataggio…" : "Salva canali"}
          </button>
        </div>

        {/* Componi post */}
        <div className="rounded-xl border bg-white p-6">
          <h2 className="mb-2 text-xl font-semibold">Pubblica post su Telegram</h2>
          <p className="mb-6 text-sm text-neutral-600">
            Scrivi il post, aggiungi un&apos;immagine o un video, e opzionalmente dei bottoni con link.
          </p>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium uppercase text-neutral-500">Canale di destinazione</p>
              <p className="text-sm font-medium text-neutral-800">
                {getCountryName(selectedCountry)}
                {channelId ? ` (${channelId})` : " — canale non configurato"}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase text-neutral-500">Immagine o video</p>
              <p className="mb-2 text-xs text-neutral-600">
                <strong>Opzione 1 – URL immagine</strong> (consigliato se l&apos;upload fallisce): incolla l&apos;URL pubblico di un&apos;immagine.
              </p>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => handleImageUrlChange(e.target.value)}
                placeholder="https://esempio.com/immagine.jpg"
                className="mb-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <p className="mb-2 text-xs text-neutral-600">
                <strong>Opzione 2 – Carica file</strong> (le immagini vengono caricate su playsignal.io, fallback su ImgBB/0x0.st)
              </p>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaChange}
                disabled={uploadingImage}
                className="block w-full text-sm text-neutral-600 file:mr-4 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-200 disabled:opacity-50"
              />
              {uploadingImage && <p className="mt-2 text-sm text-emerald-600">Caricamento immagine…</p>}
              <p className="mt-1 text-xs text-neutral-500">
                Immagini compresse automaticamente. Se l&apos;upload fallisce, incolla l&apos;URL manualmente (Opzione 1).
              </p>
              {(media || imageUrl) && (
                <p className="mt-2 text-sm text-neutral-600">
                  {media ? `File: ${media.name} (${(media.size / 1024).toFixed(1)} KB)` : `URL: ${imageUrl}`}
                  <button
                    type="button"
                    onClick={() => {
                      setMedia(null);
                      setMediaType("");
                      setImageUrl("");
                    }}
                    className="ml-2 text-red-600 hover:underline"
                  >
                    Rimuovi
                  </button>
                </p>
              )}
            </div>

            <div>
              <RichTextEditor
                label="Testo del post"
                value={text}
                onChange={setText}
                rows={6}
                placeholder="Scrivi il messaggio... **grassetto**, *corsivo*, [link](url)"
                preview={true}
                extended
              />
              <div className="mt-2">
                <p className="mb-1 text-xs font-medium text-neutral-500">Emoji rapidi</p>
                <div className="flex flex-wrap gap-1">
                  {EMOJI_QUICK.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="rounded border border-neutral-200 bg-white px-2 py-1 text-lg hover:bg-neutral-50"
                      title={`Inserisci ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium uppercase text-neutral-500">Bottoni (testo + URL)</p>
                <button
                  type="button"
                  onClick={addButton}
                  className="rounded border border-emerald-600 bg-white px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50"
                >
                  + Aggiungi bottone
                </button>
              </div>
              {buttons.length === 0 && (
                <p className="text-sm text-neutral-500">Nessun bottone. Clicca per aggiungerne.</p>
              )}
              <div className="mt-2 space-y-3">
                {buttons.map((btn, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={btn.text}
                        onChange={(e) => updateButton(i, "text", e.target.value)}
                        placeholder="Testo bottone"
                        className="flex-1 min-w-[120px] rounded border border-neutral-300 px-2 py-1.5 text-sm"
                      />
                      <input
                        type="url"
                        value={btn.url}
                        onChange={(e) => updateButton(i, "url", e.target.value)}
                        placeholder="https://..."
                        className="flex-1 min-w-[180px] rounded border border-neutral-300 px-2 py-1.5 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeButton(i)}
                        className="rounded border border-red-200 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        Rimuovi
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {EMOJI_BUTTON.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => insertEmojiInButton(i, emoji)}
                          className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-base hover:bg-neutral-100"
                          title={`Aggiungi ${emoji} al bottone`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-emerald-600">{success}</p>}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              {testing ? "Test…" : "Test connessione"}
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !channelId}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {sending ? "Invio…" : "Pubblica su Telegram"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
