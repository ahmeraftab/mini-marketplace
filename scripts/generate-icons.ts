import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

/** Draws the logo (a divan seen from the side) on the paper colour and writes the PWA icons. */
const PAPER = "#F7F3EC";
const INK = "#1B1A17";
const CLAY = "#B5522D";

function svg(size: number, scale: number): string {
  // artwork lives on a 32-unit grid; scale < 1 leaves the safe zone a maskable icon needs
  const art = 32 * scale;
  const off = (size - (size * scale)) / 2;
  const k = (size * scale) / 32;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${PAPER}"/>
  <g transform="translate(${off} ${off}) scale(${k})" data-art="${art}">
    <rect x="2" y="6" width="4.5" height="17" rx="1.2" fill="${INK}"/>
    <rect x="2" y="13" width="28" height="9" rx="1.6" fill="${INK}"/>
    <rect x="5" y="22" width="3" height="4.5" rx="0.8" fill="${INK}"/>
    <rect x="24" y="22" width="3" height="4.5" rx="0.8" fill="${INK}"/>
    <rect x="9" y="9.6" width="16" height="3.4" rx="1.7" fill="${CLAY}"/>
  </g>
</svg>`;
}

async function main() {
  const dir = join(process.cwd(), "public", "icons");
  mkdirSync(dir, { recursive: true });
  const jobs: Array<[string, number, number]> = [
    ["icon-192.png", 192, 0.7],
    ["icon-512.png", 512, 0.7],
    ["icon-maskable-512.png", 512, 0.5], // content inside the central 80% safe zone
    ["apple-touch-icon.png", 180, 0.7],
  ];
  for (const [name, size, scale] of jobs) {
    await sharp(Buffer.from(svg(size, scale))).flatten({ background: PAPER }).png().toFile(join(dir, name));
    console.log("wrote", name);
  }
  writeFileSync(join(dir, "icon.svg"), svg(512, 0.7));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
