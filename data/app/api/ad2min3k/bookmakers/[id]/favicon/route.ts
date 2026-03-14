import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getBookmakers, saveBookmakers } from "@/lib/quotes/bookmakersData";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

const ALLOWED_TYPES = [
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/png",
  "image/svg+xml",
  "image/jpeg",
  "image/webp",
  "application/octet-stream", // alcuni browser inviano questo per .ico
];
const ALLOWED_EXT = [".ico", ".png", ".svg", ".jpg", ".jpeg", ".webp"];
const MAX_SIZE = 512 * 1024; // 512KB

function getExtFromFile(file: File): string {
  const name = file.name?.toLowerCase() || "";
  const ext = ALLOWED_EXT.find((e) => name.endsWith(e));
  if (ext) return ext.slice(1);
  const contentType = file.type;
  if (contentType === "image/x-icon" || contentType === "image/vnd.microsoft.icon") return "ico";
  if (contentType === "image/svg+xml") return "svg";
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/png") return "png";
  return "png";
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id richiesto" }, { status: 400 });
  }

  const bookmakers = getBookmakers();
  const bm = bookmakers.find((b) => b.id === id);
  if (!bm) {
    return NextResponse.json({ error: "Bookmaker non trovato" }, { status: 404 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("favicon") as File | null;
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "File favicon richiesto" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File troppo grande (max 512KB)" }, { status: 400 });
    }

    const contentType = file.type;
    const ext = getExtFromFile(file);

    if (!ALLOWED_EXT.includes(`.${ext}`)) {
      return NextResponse.json(
        { error: `Formato non supportato (${file.name || contentType}). Usa .ico, .png, .svg, .jpg o .webp` },
        { status: 400 }
      );
    }

    const faviconsDir = path.join(process.cwd(), "public", "favicons");
    if (!existsSync(faviconsDir)) {
      mkdirSync(faviconsDir, { recursive: true });
    }

    const filename = `${id}.${ext}`;
    const filepath = path.join(faviconsDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(filepath, buffer);

    const faviconUrl = `/favicons/${filename}`;

    const updated = bookmakers.map((b) =>
      b.id === id ? { ...b, faviconUrl } : b
    );
    saveBookmakers(updated);

    return NextResponse.json({ success: true, faviconUrl });
  } catch (error) {
    console.error("Favicon upload error:", error);
    const msg = error instanceof Error ? error.message : "Errore sconosciuto";
    return NextResponse.json(
      { error: `Errore nel caricamento: ${msg}` },
      { status: 500 }
    );
  }
}
