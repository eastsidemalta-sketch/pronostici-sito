#!/usr/bin/env node
/**
 * Genera og-image.png (1200x630) per Open Graph / social share.
 * Centra il logo su sfondo bianco.
 */
import sharp from "sharp";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const input = path.join(__dirname, "../public/og-source.png");
const output = path.join(__dirname, "../public/og-image.png");

const W = 1200;
const H = 630;

const meta = await sharp(input).metadata();
const aspect = meta.width / meta.height;
const scaledH = Math.round(W / aspect);
const padTop = Math.floor((H - scaledH) / 2);
const padBottom = H - scaledH - padTop;

await sharp(input)
  .resize(W, scaledH, { fit: "fill" })
  .extend({ top: padTop, bottom: padBottom, left: 0, right: 0, background: { r: 255, g: 255, b: 255 } })
  .png({ compressionLevel: 9 })
  .toFile(output);

console.log(`Creato ${output} (${W}x${H})`);
