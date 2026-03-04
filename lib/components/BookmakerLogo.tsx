"use client";

import Image from "next/image";

type BookmakerLogoProps = {
  /** URL del logo (path locale es. /logos/netwin-it-2.png o SVG) */
  src: string;
  /** Dimensione: square (default) o wide per loghi 500x181 */
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "wideXs" | "wideSm" | "wideMd" | "wideLg" | "banner";
  alt?: string;
  className?: string;
  title?: string;
};

/** Dimensioni square e wide (500x181). Wide: proporzioni landscape, source full-res per nitidezza */
const SIZES: Record<
  string,
  | { display: string; source: number }
  | { display: string; sourceW: number; sourceH: number }
> = {
  xs: { display: "h-10 w-10", source: 80 },
  sm: { display: "h-8 w-8", source: 64 },
  md: { display: "h-12 w-12", source: 96 },
  lg: { display: "h-16 w-16", source: 128 },
  xl: { display: "h-20 w-20", source: 160 },
  "2xl": { display: "h-24 w-24", source: 192 },
  wideXs: { display: "h-8 w-[88px]", sourceW: 500, sourceH: 181 },
  wideSm: { display: "h-12 w-[133px]", sourceW: 500, sourceH: 181 },
  wideMd: { display: "h-16 w-[177px]", sourceW: 500, sourceH: 181 },
  wideLg: { display: "h-24 w-[265px]", sourceW: 500, sourceH: 181 },
  banner: { display: "h-[25px] w-[90px]", sourceW: 181, sourceH: 50 },
};

function isWideSize(size: string): size is "wideXs" | "wideSm" | "wideMd" | "wideLg" | "banner" {
  return size.startsWith("wide") || size === "banner";
}

/**
 * Logo bookmaker con rendering ottimizzato per evitare sgranatura.
 * Usa Next.js Image per raster (ottimizzazione + qualità), img per SVG (scala nativamente).
 */
export function BookmakerLogo({
  src,
  size = "md",
  alt = "",
  className = "",
  title,
}: BookmakerLogoProps) {
  if (!src) return null;

  const isSvg = src.toLowerCase().endsWith(".svg");
  const s = SIZES[size] ?? SIZES.md;
  const isWide = isWideSize(size);
  const display = s.display;
  const width = "sourceW" in s ? s.sourceW : s.source;
  const height = "sourceH" in s ? s.sourceH : s.source;

  if (isSvg) {
    return (
      <img
        src={src}
        alt={alt}
        title={title}
        width={width}
        height={height}
        className={`shrink-0 object-contain ${display} ${className}`}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      title={title}
      width={width}
      height={height}
      className={`shrink-0 object-contain ${display} ${className}`}
      sizes={isWide ? `${width}px` : `${height}px`}
      quality={90}
      unoptimized={src.startsWith("http")}
    />
  );
}
