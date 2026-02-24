import { NextResponse } from "next/server";
import {
  verifyCredentials,
  setSessionCookie,
  clearSessionCookie,
} from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email richiesta" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password richiesta" },
        { status: 400 }
      );
    }

    if (!verifyCredentials(email, password)) {
      await clearSessionCookie();
      return NextResponse.json(
        { error: "Password errata" },
        { status: 401 }
      );
    }

    const ok = await setSessionCookie();
    if (!ok) {
      return NextResponse.json(
        { error: "ADMIN_EMAIL, ADMIN_PASSWORD o ADMIN_SECRET non configurato in .env.local" },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Errore durante il login" },
      { status: 500 }
    );
  }
}
