/**
 * Builds the six product views for each colour from real, freely licensed
 * photos in seed-assets/source (see README for credits). Each colour gets its
 * own colour-graded set so the swatch genuinely changes what you see.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { PRAGUE } from "../src/lib/demo/prague";
import { slugify } from "../src/lib/format";

const W = 1600;
const H = 1200;

/** [source file, left, top, width, height] as fractions of the source image. */
const VIEWS: Array<[string, number, number, number, number]> = [
  ["src2.jpg", 0, 0.3, 1, 0.5], // the bed in its room
  ["src3.jpg", 0, 0, 1, 1], // wider bedroom
  ["src1.jpg", 0, 0.58, 1, 0.42], // upholstered headboard and cushions
  ["src2.jpg", 0.12, 0.27, 0.85, 0.28], // tufted headboard close-up
  ["src2.jpg", 0.1, 0.45, 0.8, 0.45], // bedding and base detail
  ["src3.jpg", 0.3, 0.38, 0.7, 0.4], // bedding and base
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/**
 * Recolours the neutral (low-saturation) parts of a photo (upholstery, linen,
 * walls) towards the swatch colour while keeping light and shadow, and leaves
 * strongly coloured things such as cushions alone.
 */
async function grade(input: Buffer, rgb: [number, number, number]): Promise<Buffer> {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  const c = rgb.map((v) => v / 255);
  const cLum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const k = Math.max(0, Math.min(1, 1 - sat * 3.2)) * 0.85;
    const f = (lum / 0.55) * (cLum > 0.01 ? 1 : 0);
    const t = [c[0] * f, c[1] * f, c[2] * f];
    for (let j = 0; j < 3; j++) {
      const orig = j === 0 ? r : j === 1 ? g : b;
      const v = orig * (1 - k) + Math.min(1, t[j]) * k;
      out[i + j] = Math.round(Math.max(0, Math.min(1, v)) * 255);
    }
  }
  return sharp(out, { raw: info }).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
}

export async function buildPhotos() {
  const root = process.cwd();
  const src = (f: string) => path.join(root, "seed-assets", "source", f);
  const written: string[] = [];
  for (const colour of PRAGUE.colours) {
    const slug = slugify(colour.name);
    const dirs = [path.join(root, "seed-assets", "generated", slug), path.join(root, "public", "seed", slug)];
    dirs.forEach((d) => mkdirSync(d, { recursive: true }));
    const [r, g, b] = hexToRgb(colour.hex);
    for (let i = 0; i < VIEWS.length; i++) {
      const [file, fx, fy, fw, fh] = VIEWS[i];
      const meta = await sharp(src(file)).metadata();
      const sw = meta.width!;
      const sh = meta.height!;
      // 4:3 crop inside the requested region
      let cw = Math.round(sw * fw);
      let ch = Math.round(sh * fh);
      if (cw / ch > W / H) cw = Math.round(ch * (W / H));
      else ch = Math.round(cw * (H / W));
      const left = Math.min(sw - cw, Math.round(sw * fx + (sw * fw - cw) / 2));
      const top = Math.min(sh - ch, Math.round(sh * fy + (sh * fh - ch) / 2));
      const base = await sharp(src(file)).extract({ left, top, width: cw, height: ch }).resize(W, H).toBuffer();
      const out = await grade(base, [r, g, b]);
      for (const d of dirs) await sharp(out).toFile(path.join(d, `${i + 1}.jpg`));
      written.push(`${slug}/${i + 1}.jpg`);
    }
  }
  return written;
}

if (process.argv[1] && /build-seed-photos/.test(process.argv[1])) {
  buildPhotos().then((f) => console.log(`Rendered ${f.length} photo views.`)).catch((e) => { console.error(e); process.exit(1); });
}
