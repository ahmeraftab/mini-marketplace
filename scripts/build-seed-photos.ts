/**
 * Builds the six product views for each colour from real, freely licensed
 * photos in seed-assets/source (see README for credits). Each colour gets its
 * own set in which only the upholstery changes colour.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { PRAGUE } from "../src/lib/demo/prague";
import { slugify } from "../src/lib/format";

const W = 1600;
const H = 1200;

type Pt = [number, number];
/** An area of upholstery to recolour, in crop-relative coordinates (0 to 1). keepSaturated leaves strongly coloured things (cushions) alone. */
type Area = { points: Pt[]; keepSaturated: boolean };
type View = { file: string; crop: [number, number, number, number]; areas: Area[] };

/** [source file, crop left, top, width, height as fractions of the source image] plus the fabric areas in that crop. */
const VIEWS: View[] = [
  {
    file: "src2.jpg", crop: [0, 0.3, 1, 0.5], // the bed in its room
    areas: [
      { points: [[0.13, 0.32], [0.17, 0.26], [0.4, 0.22], [0.72, 0.23], [0.74, 0.46], [0.55, 0.5], [0.32, 0.52], [0.22, 0.56], [0.14, 0.6]], keepSaturated: true },
    ],
  },
  {
    file: "src3.jpg", crop: [0, 0, 1, 1], // wider bedroom
    areas: [
      { points: [[0.27, 0.0], [0.62, 0.0], [0.62, 0.4], [0.27, 0.4]], keepSaturated: false },
    ],
  },
  {
    file: "src1.jpg", crop: [0, 0.58, 1, 0.42], // upholstered wall panel behind the pillows
    areas: [{ points: [[0, 0], [1, 0], [1, 0.56], [0.63, 0.57], [0.5, 0.62], [0.31, 0.57], [0, 0.58]], keepSaturated: false }],
  },
  {
    file: "src2.jpg", crop: [0.12, 0.27, 0.85, 0.28], // tufted headboard close-up
    areas: [{ points: [[0, 0.55], [0.1, 0.54], [0.4, 0.52], [0.75, 0.51], [0.83, 0.52], [0.85, 0.7], [0.84, 1], [0, 1]], keepSaturated: true }],
  },
  {
    file: "src2.jpg", crop: [0.1, 0.45, 0.8, 0.45], // headboard, bedding and base
    areas: [
      { points: [[0.06, 0], [0.8, 0], [0.8, 0.1], [0.6, 0.1], [0.4, 0.22], [0.15, 0.3], [0.06, 0.55]], keepSaturated: true },
      { points: [[0.17, 0.58], [0.56, 0.71], [1, 0.84], [1, 1], [0.78, 1], [0.5, 0.88], [0.2, 0.72]], keepSaturated: true },
    ],
  },
  {
    file: "src3.jpg", crop: [0.3, 0.38, 0.7, 0.4], // bedding and runner
    areas: [{ points: [[0, 0.78], [0.35, 0.66], [0.8, 0.57], [1, 0.55], [1, 0.78], [0.45, 1], [0, 1]], keepSaturated: false }],
  },
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** A soft-edged 0..255 mask of one polygon, one byte per pixel. */
async function polygonMask(points: Pt[]): Promise<Buffer> {
  const pts = points.map(([x, y]) => `${(x * W).toFixed(1)},${(y * H).toFixed(1)}`).join(" ");
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="black"/><polygon points="${pts}" fill="white"/></svg>`;
  return sharp(Buffer.from(svg)).blur(5).greyscale().raw().toBuffer();
}

/**
 * Recolours the fabric inside the given areas to the swatch colour while keeping
 * the photo's own light, shadow and stitching, and leaves everything else (walls,
 * linen, wood, cushions) exactly as photographed.
 */
async function recolour(input: Buffer, rgb: [number, number, number], areas: Area[]): Promise<Buffer> {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = info.width * info.height;
  // colourfulness is judged on a blurred copy so compression noise in dark areas cannot punch holes in the mask
  const soft = await sharp(data, { raw: info }).blur(4).raw().toBuffer();
  const masks = await Promise.all(areas.map((a) => polygonMask(a.points)));
  const c = rgb.map((v) => v / 255);
  const target = Math.min(0.92, 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) * 0.82;

  const lumOf = (i: number) => (0.2126 * data[i * 3] + 0.7152 * data[i * 3 + 1] + 0.0722 * data[i * 3 + 2]) / 255;
  const weight = (m: number, a: Area, i: number) => {
    let w = masks[m][i] / 255;
    if (w > 0 && a.keepSaturated) {
      const r = soft[i * 3], g = soft[i * 3 + 1], b = soft[i * 3 + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const sat = (mx - mn) / (mx + 40); // the +40 keeps dark, noisy pixels from reading as colourful
      w *= Math.max(0, 1 - Math.max(0, sat - 0.1) * 6);
    }
    return w;
  };

  // mean light inside the areas, so the swatch colour lands at its true brightness on average
  let sum = 0, n = 0;
  for (let m = 0; m < areas.length; m++) {
    for (let i = 0; i < px; i++) {
      const w = weight(m, areas[m], i);
      if (w > 0.5) { sum += lumOf(i); n++; }
    }
  }
  const mean = n ? sum / n : 0.5;

  const out = Buffer.from(data);
  for (let i = 0; i < px; i++) {
    let w = 0;
    for (let m = 0; m < areas.length; m++) w = Math.max(w, weight(m, areas[m], i));
    if (w <= 0) continue;
    const f = Math.pow(Math.max(0.45, Math.min(1.6, lumOf(i) / mean)), 0.75) * (target / Math.max(0.01, 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]));
    for (let j = 0; j < 3; j++) {
      const t = Math.max(0, Math.min(1, c[j] * f));
      out[i * 3 + j] = Math.round(data[i * 3 + j] * (1 - w) + t * 255 * w);
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
      const { file, crop: [fx, fy, fw, fh], areas } = VIEWS[i];
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
      const out = await recolour(base, [r, g, b], areas);
      for (const d of dirs) await sharp(out).toFile(path.join(d, `${i + 1}.jpg`));
      written.push(`${slug}/${i + 1}.jpg`);
    }
  }
  return written;
}

if (process.argv[1] && /build-seed-photos/.test(process.argv[1])) {
  buildPhotos().then((f) => console.log(`Rendered ${f.length} photo views.`)).catch((e) => { console.error(e); process.exit(1); });
}
