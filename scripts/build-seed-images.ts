/**
 * Renders the demo bed illustrations: six views for each colour swatch.
 *
 *   npm run images:build
 *
 * Output (git-ignored, regenerated on demand):
 *   seed-assets/generated/<colour-slug>/1.jpg ... 6.jpg
 *   public/seed/<colour-slug>/1.jpg ...        (for the dev preview mode)
 *
 * Drop your own photos into seed-assets/override/<colour-slug>/1.jpg ... and
 * they replace the illustrations for that colour when the seed runs.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { PRAGUE } from "../src/lib/demo/prague";
import { slugify } from "../src/lib/format";
import { VIEWS, renderView } from "./lib/illustrate";

export async function buildImages(onlySlug?: string) {
  const root = process.cwd();
  const outputs: string[] = [];
  for (const colour of PRAGUE.colours) {
    const slug = slugify(colour.name);
    if (onlySlug && slug !== onlySlug) continue;
    const dirs = [path.join(root, "seed-assets", "generated", slug), path.join(root, "public", "seed", slug)];
    dirs.forEach((d) => mkdirSync(d, { recursive: true }));
    for (let i = 0; i < VIEWS.length; i++) {
      const svg = renderView(VIEWS[i], colour.hex, colour.name);
      const jpeg = await sharp(Buffer.from(svg)).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
      for (const d of dirs) writeFileSync(path.join(d, `${i + 1}.jpg`), jpeg);
      outputs.push(`${slug}/${i + 1}.jpg`);
    }
  }
  return outputs;
}

// run directly: npm run images:build [colour-slug]
if (process.argv[1] && /build-seed-images/.test(process.argv[1])) {
  const only = process.argv[2];
  buildImages(only)
    .then((files) => console.log(`Rendered ${files.length} images.`))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
