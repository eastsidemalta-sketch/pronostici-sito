import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const maxDuration = 60;
import { getChannelIdForCountry, warmTelegramChannelsConfigCache } from "@/lib/telegramChannelsConfig";

/** Converte **grassetto**, *corsivo*, [testo](url) in HTML per Telegram */
function toTelegramHtml(text: string): string {
  let s = (text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  s = s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  s = s.replace(/\*([^*]+)\*/g, "<i>$1</i>");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return s;
}

export async function POST(req: Request) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token?.trim()) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN non configurato" },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const country = formData.get("country") as string | null;
    const text = (formData.get("text") as string | null) ?? "";
    const media = formData.get("media") as File | null;
    const imageUrl = (formData.get("imageUrl") as string | null)?.trim() ?? "";
    const mediaType = (formData.get("mediaType") as string | null) ?? ""; // "image" | "video" | ""
    const buttonsJson = (formData.get("buttons") as string | null) ?? "[]";

    if (!country?.trim()) {
      return NextResponse.json(
        { error: "Paese richiesto" },
        { status: 400 }
      );
    }

    await warmTelegramChannelsConfigCache();
    const channelId = getChannelIdForCountry(country.trim());
    if (!channelId) {
      return NextResponse.json(
        { error: `Canale non configurato per il paese ${country}` },
        { status: 400 }
      );
    }

    let buttons: Array<{ text: string; url: string }> = [];
    try {
      const parsed = JSON.parse(buttonsJson) as unknown;
      if (Array.isArray(parsed)) {
        buttons = parsed
          .filter(
            (b): b is { text: string; url: string } =>
              typeof b === "object" &&
              b !== null &&
              typeof (b as { text?: unknown }).text === "string" &&
              typeof (b as { url?: unknown }).url === "string"
          )
          .map((b) => ({ text: b.text.trim(), url: b.url.trim() }))
          .filter((b) => b.text && b.url);
      }
    } catch {
      // ignore invalid buttons
    }

    const replyMarkup =
      buttons.length > 0
        ? {
            inline_keyboard: buttons.map((b) => [
              { text: b.text, url: b.url },
            ]),
          }
        : undefined;

    const caption = text.trim() ? toTelegramHtml(text.trim()) : undefined;
    const baseUrl = `https://api.telegram.org/bot${token}`;

    if (imageUrl && mediaType === "image") {
      const payload: Record<string, string> = {
        chat_id: channelId,
        photo: imageUrl,
      };
      if (caption) {
        payload.caption = caption;
        payload.parse_mode = "HTML";
      }
      if (replyMarkup) {
        payload.reply_markup = JSON.stringify(replyMarkup);
      }
      const res = await fetch(`${baseUrl}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; description?: string };
      if (!data.ok) {
        return NextResponse.json(
          { error: data.description ?? "Errore invio Telegram" },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: true, message: "Post inviato" });
    }

    if (media && media.size > 0 && mediaType === "image") {
      const form = new FormData();
      form.append("chat_id", channelId);
      if (caption) {
        form.append("caption", caption);
        form.append("parse_mode", "HTML");
      }
      if (replyMarkup) {
        form.append("reply_markup", JSON.stringify(replyMarkup));
      }
      form.append("photo", media);

      const res = await fetch(`${baseUrl}/sendPhoto`, {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as { ok?: boolean; description?: string };
      if (!data.ok) {
        return NextResponse.json(
          { error: data.description ?? "Errore invio Telegram" },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: true, message: "Post inviato" });
    }

    if (media && media.size > 0 && mediaType === "video") {
      const form = new FormData();
      form.append("chat_id", channelId);
      if (caption) {
        form.append("caption", caption);
        form.append("parse_mode", "HTML");
      }
      if (replyMarkup) {
        form.append("reply_markup", JSON.stringify(replyMarkup));
      }
      form.append("video", media);

      const res = await fetch(`${baseUrl}/sendVideo`, {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as { ok?: boolean; description?: string };
      if (!data.ok) {
        return NextResponse.json(
          { error: data.description ?? "Errore invio Telegram" },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: true, message: "Post inviato" });
    }

    // Solo testo (con eventuali bottoni)
    if (!text.trim() && buttons.length === 0) {
      return NextResponse.json(
        { error: "Inserisci almeno testo o bottoni" },
        { status: 400 }
      );
    }
    const form = new FormData();
    form.append("chat_id", channelId);
    form.append("text", caption && caption !== "" ? caption : " ");
    form.append("parse_mode", "HTML");
    if (replyMarkup) {
      form.append("reply_markup", JSON.stringify(replyMarkup));
    }

    const res = await fetch(`${baseUrl}/sendMessage`, {
      method: "POST",
      body: form,
    });
    const data = (await res.json()) as { ok?: boolean; description?: string };
    if (!data.ok) {
      return NextResponse.json(
        { error: data.description ?? "Errore invio Telegram" },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: true, message: "Post inviato" });
  } catch (err) {
    console.error("[telegram-posts/send]", err);
    return NextResponse.json(
      { error: "Errore durante l'invio" },
      { status: 500 }
    );
  }
}
