import { NextResponse } from "next/server";
import {
  getCoreUrls,
  isSitemapAllowed,
  toSitemapXml,
} from "@/lib/seo/sitemap";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSitemapAllowed()) {
    return new NextResponse(null, { status: 404 });
  }
  const xml = toSitemapXml(getCoreUrls());
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
