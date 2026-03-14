import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const maxDuration = 30;
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const UPLOADS_DIR = "public/uploads";
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: Request) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    if (!file || !file.size) {
      return NextResponse.json({ error: "Nessun file" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File troppo grande (max ${MAX_SIZE / 1024 / 1024} MB)` },
        { status: 400 }
      );
    }
    const type = file.type;
    if (!type.startsWith("image/")) {
      return NextResponse.json({ error: "Solo immagini consentite" }, { status: 400 });
    }

    const ext = type === "image/jpeg" || type === "image/jpg" ? "jpg" : type === "image/png" ? "png" : type === "image/gif" ? "gif" : "jpg";
    const name = `${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
    const dir = path.join(process.cwd(), UPLOADS_DIR);
    await mkdir(dir, { recursive: true });
    const filePath = path.join(dir, name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const baseUrl = host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_SITE_URL || "https://playsignal.io";
    const url = `${baseUrl.replace(/\/$/, "")}/uploads/${name}`;
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[upload-image]", err);
    return NextResponse.json({ error: "Errore upload" }, { status: 500 });
  }
}
