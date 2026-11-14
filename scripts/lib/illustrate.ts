/**
 * Procedural product illustrations (SVG) for the demo bed. Every colour gets
 * the same six views, tinted from the swatch hex. Own artwork: no third-party
 * photos, so there is nothing to license or credit.
 */

export const W = 1600;
export const H = 1200;

// ------------------------------------------------------------------ colour --

function parse(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function toHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}
export const light = (h: string, t: number) => mix(h, "#ffffff", t);
export const dark = (h: string, t: number) => mix(h, "#000000", t);
export function luminance(hex: string): number {
  const [r, g, b] = parse(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export type Fabric = "velvet" | "linen" | "naples";
export function fabricFor(name: string): Fabric {
  const n = name.toLowerCase();
  if (n.includes("velvet")) return "velvet";
  if (n.includes("linoso")) return "linen";
  return "naples";
}

// -------------------------------------------------------------------- defs --

function defs(hex: string, fabric: Fabric): string {
  const freq = fabric === "linen" ? "0.025 0.85" : fabric === "velvet" ? "1.1" : "0.75";
  const speck = fabric === "velvet" ? "1.3 0 0 0 -0.5" : "1.7 0 0 0 -0.66";
  return `
  <defs>
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f4efe6"/><stop offset="1" stop-color="#e8e0d2"/>
    </linearGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d9cfbd"/><stop offset="1" stop-color="#c9bda7"/>
    </linearGradient>
    <linearGradient id="fabricV" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${light(hex, 0.12)}"/>
      <stop offset="0.55" stop-color="${hex}"/>
      <stop offset="1" stop-color="${dark(hex, 0.16)}"/>
    </linearGradient>
    <linearGradient id="fabricH" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${dark(hex, 0.1)}"/>
      <stop offset="0.08" stop-color="${hex}" stop-opacity="0"/>
      <stop offset="0.92" stop-color="${hex}" stop-opacity="0"/>
      <stop offset="1" stop-color="${dark(hex, 0.14)}"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="${fabric === "velvet" ? 0.28 : 0.12}"/>
      <stop offset="0.5" stop-color="#fff" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.12"/>
    </linearGradient>
    <radialGradient id="puff" cx="0.42" cy="0.38" r="0.7">
      <stop offset="0" stop-color="${light(hex, 0.2)}"/>
      <stop offset="0.6" stop-color="${hex}"/>
      <stop offset="1" stop-color="${dark(hex, 0.2)}"/>
    </radialGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.45" r="0.75">
      <stop offset="0.6" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#2a2218" stop-opacity="0.22"/>
    </radialGradient>
    <radialGradient id="lampGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ffe3a8" stop-opacity="0.7"/>
      <stop offset="1" stop-color="#ffe3a8" stop-opacity="0"/>
    </radialGradient>
    <filter id="blurS" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
    <filter id="blurM" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="16"/></filter>
    <filter id="blurL" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="34"/></filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" seed="11" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.12  0 0 0 0 0.09  0 0 0 0 0.07  ${speck}" result="s"/>
      <feComposite in="s" in2="SourceAlpha" operator="in"/>
    </filter>
    <filter id="paper" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.16  0 0 0 0 0.1  0.5 0 0 0 -0.18" result="s"/>
      <feComposite in="s" in2="SourceAlpha" operator="in"/>
    </filter>
  </defs>`;
}

const svg = (hex: string, fabric: Fabric, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs(hex, fabric)}${body}</svg>`;

// ------------------------------------------------------------- pieces -------

const rr = (x: number, y: number, w: number, h: number, r: number, extra = "") =>
  `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${r.toFixed(1)}" ${extra}/>`;

/** A textured fabric shape: base fill + grain + sheen, all inside the same outline. */
function fabricShape(shape: (attrs: string) => string, fill: string): string {
  return (
    shape(`fill="${fill}"`) +
    shape(`fill="#000" filter="url(#grain)" opacity="0.26"`) +
    shape(`fill="url(#sheen)"`)
  );
}

function backdrop(opts: { wallPanel?: boolean; window?: boolean; horizon?: number } = {}): string {
  const horizon = opts.horizon ?? 820;
  let s = `<rect width="${W}" height="${H}" fill="url(#wall)"/>`;
  s += `<rect y="${horizon}" width="${W}" height="${H - horizon}" fill="url(#floor)"/>`;
  s += `<rect y="${horizon - 14}" width="${W}" height="14" fill="#f9f6f0"/>`; // skirting board
  s += `<rect y="${horizon}" width="${W}" height="3" fill="#000" opacity="0.08"/>`;
  if (opts.wallPanel) {
    for (let x = 60; x < W; x += 170) s += `<rect x="${x}" y="90" width="6" height="${horizon - 120}" fill="#000" opacity="0.045"/>`;
  }
  if (opts.window) {
    s += `<polygon points="1130,70 1500,70 1580,760 1060,760" fill="#fff" opacity="0.5" filter="url(#blurM)"/>`;
  }
  return s;
}

function lamp(x: number, floorY: number, scale = 1): string {
  const tableW = 150 * scale;
  const tableH = 190 * scale;
  const topY = floorY - tableH;
  return `
    <ellipse cx="${x}" cy="${floorY + 6}" rx="${tableW * 0.62}" ry="${12 * scale}" fill="#000" opacity="0.2" filter="url(#blurS)"/>
    ${rr(x - tableW / 2, topY, tableW, 22 * scale, 3, 'fill="#7a5a3c"')}
    ${rr(x - tableW / 2 + 10, topY + 22 * scale, tableW - 20, tableH - 22 * scale, 3, 'fill="#8d6a48"')}
    <rect x="${x - tableW / 2 + 22}" y="${topY + 34 * scale}" width="${tableW - 44}" height="${54 * scale}" rx="3" fill="#000" opacity="0.1"/>
    <rect x="${x - 6 * scale}" y="${topY - 78 * scale}" width="${12 * scale}" height="${78 * scale}" fill="#c9b79a"/>
    <ellipse cx="${x}" cy="${topY - 140 * scale}" rx="${90 * scale}" ry="${90 * scale}" fill="url(#lampGlow)"/>
    <polygon points="${x - 52 * scale},${topY - 78 * scale} ${x + 52 * scale},${topY - 78 * scale} ${x + 34 * scale},${topY - 148 * scale} ${x - 34 * scale},${topY - 148 * scale}" fill="#f5e6c4"/>
    <polygon points="${x - 34 * scale},${topY - 148 * scale} ${x + 34 * scale},${topY - 148 * scale} ${x + 30 * scale},${topY - 142 * scale} ${x - 30 * scale},${topY - 142 * scale}" fill="#fff" opacity="0.6"/>`;
}

/**
 * Diamond-tufted (capitonné) panel. Buttons sit on an offset lattice; every
 * diamond between them is a puffy cell lit from the top-left, and the creases
 * run button to button.
 */
function tufting(
  x: number, y: number, w: number, h: number, cols: number, rows: number, clipId: string, hex: string, button = 7,
): string {
  const dx = w / cols;
  const dy = h / rows;
  const buttons: Array<[number, number]> = [];
  let cells = "";
  let creases = "";
  for (let r = -1; r <= rows + 1; r++) {
    const off = (((r % 2) + 2) % 2) * 0.5;
    for (let c = -1; c <= cols + 1; c++) {
      const px = x + (c + off) * dx;
      const py = y + r * dy;
      buttons.push([px, py]);
      // diamond cell centred between this button and the next one to the right
      const cx = px + dx / 2;
      cells += `<polygon points="${cx.toFixed(1)},${(py - dy).toFixed(1)} ${(cx + dx / 2).toFixed(1)},${py.toFixed(1)} ${cx.toFixed(1)},${(py + dy).toFixed(1)} ${(cx - dx / 2).toFixed(1)},${py.toFixed(1)}" fill="url(#puff)"/>`;
      creases += `<line x1="${px.toFixed(1)}" y1="${py.toFixed(1)}" x2="${(px + dx / 2).toFixed(1)}" y2="${(py + dy).toFixed(1)}"/>`;
      creases += `<line x1="${px.toFixed(1)}" y1="${py.toFixed(1)}" x2="${(px - dx / 2).toFixed(1)}" y2="${(py + dy).toFixed(1)}"/>`;
    }
  }
  let s = `<g clip-path="url(#${clipId})">${cells}`;
  s += `<g stroke="${dark(hex, 0.42)}" stroke-width="${Math.max(2, button * 0.3).toFixed(1)}" opacity="0.4" stroke-linecap="round" filter="url(#blurS)">${creases}</g>`;
  s += `<g stroke="${dark(hex, 0.38)}" stroke-width="${Math.max(1.5, button * 0.18).toFixed(1)}" opacity="0.45" stroke-linecap="round">${creases}</g>`;
  for (const [px, py] of buttons) {
    s += `<circle cx="${px.toFixed(1)}" cy="${(py + button * 0.35).toFixed(1)}" r="${(button * 1.25).toFixed(1)}" fill="#000" opacity="0.18" filter="url(#blurS)"/>`;
    s += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${button}" fill="${dark(hex, 0.2)}"/>`;
    s += `<circle cx="${(px - button * 0.28).toFixed(1)}" cy="${(py - button * 0.32).toFixed(1)}" r="${(button * 0.36).toFixed(1)}" fill="#fff" opacity="0.55"/>`;
  }
  return s + `</g>`;
}

type BedOpts = {
  cx: number;
  floorY: number;
  w: number;
  hex: string;
  drawers?: "none" | "two";
  duvet?: boolean;
};

/** Front elevation of the divan bed. Returns SVG for the whole bed plus its floor shadow. */
function bedFront({ cx, floorY, w, hex, drawers = "none", duvet = true }: BedOpts): string {
  const legH = w * 0.05;
  const baseH = w * 0.15;
  const mattH = w * 0.085;
  const headH = w * 0.36;
  const x0 = cx - w / 2;
  const baseBottom = floorY - legH;
  const baseTop = baseBottom - baseH;
  const mattTop = baseTop - mattH;
  const headTop = baseTop - headH - mattH * 0.2;
  const headBottom = floorY - legH * 0.5;
  const clipId = `hb-${Math.round(cx)}-${Math.round(w)}`;
  const duvetColour = luminance(hex) > 0.68 ? "#dad6cd" : "#f1eee7";

  let s = "";
  // floor shadow
  s += `<ellipse cx="${cx}" cy="${floorY + 4}" rx="${w * 0.56}" ry="${w * 0.045}" fill="#2a2218" opacity="0.32" filter="url(#blurM)"/>`;

  // headboard (behind)
  s += `<clipPath id="${clipId}">${rr(x0 - 4, headTop, w + 8, headBottom - headTop, w * 0.02)}</clipPath>`;
  s += fabricShape((a) => rr(x0 - 4, headTop, w + 8, headBottom - headTop, w * 0.02, a), "url(#fabricV)");
  s += tufting(x0 + 6, headTop + (baseTop - headTop) * 0.12, w - 4, (baseTop - headTop) * 0.62, 7, 3, clipId, hex, w * 0.0065);
  s += rr(x0 - 4, headTop, w + 8, headBottom - headTop, w * 0.02, 'fill="none" stroke="#000" stroke-opacity="0.12" stroke-width="2"');
  s += rr(x0 - 4, headTop, w + 8, 10, 5, `fill="${light(hex, 0.25)}" opacity="0.7"`);

  // feet
  for (const fx of [x0 + w * 0.06, x0 + w * 0.94 - w * 0.035]) {
    s += `<polygon points="${fx},${baseBottom} ${fx + w * 0.035},${baseBottom} ${fx + w * 0.03},${floorY} ${fx + w * 0.005},${floorY}" fill="#33281f"/>`;
  }

  // base
  s += fabricShape((a) => rr(x0, baseTop, w, baseH, 6, a), "url(#fabricV)");
  s += rr(x0, baseTop, w, baseH, 6, 'fill="url(#fabricH)"');
  s += rr(x0, baseTop - 2, w, 9, 4, `fill="${light(hex, 0.3)}" opacity="0.65"`); // top piping
  s += rr(x0, baseBottom - 7, w, 7, 3, `fill="${dark(hex, 0.3)}" opacity="0.45"`); // bottom piping
  if (drawers === "two") {
    const dw = w * 0.4;
    for (const dx of [x0 + w * 0.07, x0 + w * 0.53]) {
      s += rr(dx, baseTop + baseH * 0.2, dw, baseH * 0.6, 4, `fill="none" stroke="${dark(hex, 0.35)}" stroke-width="2.4" opacity="0.55"`);
      s += rr(dx + dw / 2 - 34, baseTop + baseH * 0.38, 68, 9, 4.5, 'fill="#c9c4b8"');
      s += rr(dx + dw / 2 - 34, baseTop + baseH * 0.38, 68, 3, 1.5, 'fill="#fff" opacity="0.7"');
    }
  } else {
    // quiet vertical seams
    for (const px of [0.25, 0.5, 0.75]) {
      s += `<line x1="${x0 + w * px}" y1="${baseTop + 10}" x2="${x0 + w * px}" y2="${baseBottom - 10}" stroke="${dark(hex, 0.35)}" stroke-width="2" opacity="0.14"/>`;
    }
  }

  // mattress
  const mx = x0 + w * 0.015;
  const mw = w * 0.97;
  s += rr(mx, mattTop, mw, mattH + 2, 14, 'fill="#ece7dc"');
  s += rr(mx, mattTop, mw, mattH + 2, 14, 'fill="url(#sheen)"');
  s += rr(mx, mattTop + mattH * 0.55, mw, 3, 1.5, 'fill="#000" opacity="0.08"');

  // pillows
  const pw = w * 0.2;
  const ph = w * 0.075;
  for (const [px, tilt] of [[x0 + w * 0.18, -2], [x0 + w * 0.55, 1.5]] as const) {
    s += `<g transform="rotate(${tilt} ${px + pw / 2} ${mattTop})">`;
    s += rr(px, mattTop - ph + 8, pw, ph, 20, 'fill="#fbf9f4"');
    s += rr(px, mattTop - ph + 8, pw, ph, 20, 'fill="url(#sheen)"');
    s += `<path d="M${px + 18} ${mattTop - ph + 24} Q${px + pw / 2} ${mattTop - ph + 14} ${px + pw - 18} ${mattTop - ph + 24}" stroke="#000" stroke-opacity="0.07" stroke-width="3" fill="none"/>`;
    s += `</g>`;
  }
  // accent cushion in a tint of the fabric
  s += rr(x0 + w * 0.76, mattTop - ph * 0.86 + 8, pw * 0.8, ph * 0.86, 16, `fill="${mix(hex, "#ffffff", 0.45)}"`);

  // duvet
  if (duvet) {
    const dt = mattTop + mattH * 0.38;
    s += rr(mx - 6, dt, mw + 12, baseTop - dt + baseH * 0.2, 16, `fill="${duvetColour}"`);
    s += rr(mx - 6, dt, mw + 12, baseTop - dt + baseH * 0.2, 16, 'fill="url(#sheen)"');
    s += `<path d="M${mx} ${dt + 14} Q${mx + mw / 2} ${dt - 6} ${mx + mw} ${dt + 14}" stroke="#000" stroke-opacity="0.06" stroke-width="4" fill="none"/>`;
    s += rr(mx - 6, baseTop + baseH * 0.12, mw + 12, 10, 5, 'fill="#000" opacity="0.1" filter="url(#blurS)"');
  }
  return s;
}

// ------------------------------------------------------------------- views --

export type ViewName = "studio" | "room" | "side" | "headboard" | "fabric" | "storage";
export const VIEWS: ViewName[] = ["studio", "room", "side", "headboard", "fabric", "storage"];

function studio(hex: string, fabric: Fabric): string {
  return svg(hex, fabric, `
    ${backdrop({ window: true, horizon: 892 })}
    ${lamp(1442, 902, 1.15)}
    <ellipse cx="760" cy="930" rx="780" ry="74" fill="#000" opacity="0.07" filter="url(#blurL)"/>
    ${bedFront({ cx: 740, floorY: 944, w: 1160, hex })}
    <rect width="${W}" height="${H}" fill="url(#vignette)"/>`);
}

function room(hex: string, fabric: Fabric): string {
  // wider room, bed smaller, rug, two bedside tables, art
  return svg(hex, fabric, `
    ${backdrop({ wallPanel: true, window: true })}
    <g>
      ${rr(180, 180, 250, 330, 3, 'fill="#fbf9f4" stroke="#6b5640" stroke-width="10"')}
      <circle cx="305" cy="320" r="62" fill="${mix(hex, "#c2764a", 0.55)}" opacity="0.9"/>
      <path d="M205 470 Q 260 380 305 430 T 405 400 L 405 490 L 205 490 Z" fill="${dark(hex, 0.35)}" opacity="0.55"/>
    </g>
    ${rr(1180, 210, 200, 260, 3, 'fill="#fbf9f4" stroke="#6b5640" stroke-width="10"')}
    <path d="M1200 440 L1360 260 L1360 440 Z" fill="${mix(hex, "#27323a", 0.4)}" opacity="0.7"/>
    <ellipse cx="800" cy="905" rx="720" ry="86" fill="${mix("#cdb9a0", hex, 0.18)}"/>
    <ellipse cx="800" cy="905" rx="720" ry="86" fill="#000" filter="url(#paper)" opacity="0.5"/>
    ${lamp(238, 842, 0.9)}
    ${lamp(1362, 842, 0.9)}
    ${bedFront({ cx: 800, floorY: 872, w: 820, hex })}
    <rect width="${W}" height="${H}" fill="url(#vignette)"/>`);
}

function side(hex: string, fabric: Fabric): string {
  const floorY = 900;
  const x0 = 230;
  const len = 1140;
  const legH = 62;
  const baseH = 180;
  const baseTop = floorY - legH - baseH;
  const mattH = 110;
  const headH = 500;
  const headW = 58;
  const headTop = baseTop - headH + 40;
  const bx = x0 + headW - 14; // base starts just in front of the headboard
  const bl = len - headW + 14;
  const duvetFill = "#f2efe8";
  return svg(hex, fabric, `
    ${backdrop({ horizon: 900 })}
    <ellipse cx="800" cy="${floorY + 6}" rx="660" ry="40" fill="#2a2218" opacity="0.3" filter="url(#blurM)"/>
    ${[x0 + 80, x0 + len - 140].map((fx) => `<polygon points="${fx},${floorY - legH} ${fx + 58},${floorY - legH} ${fx + 52},${floorY} ${fx + 6},${floorY}" fill="#33281f"/>`).join("")}
    ${fabricShape((a) => rr(x0, headTop, headW, floorY - legH - headTop + 70, 16, a), "url(#fabricV)")}
    ${rr(x0, headTop, 10, floorY - legH - headTop + 70, 5, `fill="${light(hex, 0.3)}" opacity="0.6"`)}
    ${fabricShape((a) => rr(bx, baseTop, bl, baseH, 8, a), "url(#fabricV)")}
    ${rr(bx, baseTop, bl, baseH, 8, 'fill="url(#fabricH)"')}
    ${rr(bx, baseTop - 2, bl, 10, 5, `fill="${light(hex, 0.3)}" opacity="0.65"`)}
    ${rr(bx, baseTop + baseH - 9, bl, 8, 4, `fill="${dark(hex, 0.3)}" opacity="0.45"`)}
    <!-- mattress -->
    ${rr(bx + 6, baseTop - mattH, bl - 12, mattH + 6, 20, 'fill="#e9e4d8"')}
    ${rr(bx + 6, baseTop - mattH, bl - 12, mattH + 6, 20, 'fill="url(#sheen)"')}
    ${rr(bx + 6, baseTop - mattH * 0.45, bl - 12, 3, 1.5, 'fill="#000" opacity="0.08"')}
    <!-- pillow -->
    ${rr(bx + 26, baseTop - mattH - 84, 270, 104, 46, 'fill="#fbf9f4"')}
    ${rr(bx + 26, baseTop - mattH - 84, 270, 104, 46, 'fill="url(#sheen)"')}
    <path d="M${bx + 56} ${baseTop - mattH - 56} Q${bx + 160} ${baseTop - mattH - 74} ${bx + 266} ${baseTop - mattH - 56}" stroke="#000" stroke-opacity="0.07" stroke-width="4" fill="none"/>
    <!-- duvet, draped over the foot of the bed -->
    <path d="M${bx + 300} ${baseTop - mattH - 8}
             Q${bx + 340} ${baseTop - mattH - 20} ${bx + 420} ${baseTop - mattH - 8}
             L${bx + bl - 26} ${baseTop - mattH + 6}
             Q${bx + bl + 6} ${baseTop - mattH + 10} ${bx + bl + 6} ${baseTop - mattH + 44}
             L${bx + bl + 6} ${baseTop + 56}
             Q${bx + bl + 6} ${baseTop + 74} ${bx + bl - 14} ${baseTop + 74}
             L${bx + 300} ${baseTop + 74} Z" fill="${duvetFill}"/>
    <path d="M${bx + 300} ${baseTop - mattH - 8} L${bx + 300} ${baseTop + 74}" stroke="#000" stroke-opacity="0.08" stroke-width="5" filter="url(#blurS)"/>
    <path d="M${bx + 330} ${baseTop - mattH + 14} Q${bx + bl / 2} ${baseTop - mattH + 30} ${bx + bl - 40} ${baseTop - mattH + 18}" stroke="#000" stroke-opacity="0.07" stroke-width="5" fill="none"/>
    <path d="M${bx + 300} ${baseTop + 60} L${bx + bl + 6} ${baseTop + 60}" stroke="#000" stroke-opacity="0.1" stroke-width="3"/>
    <!-- dimension line: headboard height above the base -->
    <g stroke="#1b1a17" stroke-width="2" opacity="0.45" fill="none">
      <line x1="${x0 - 74}" y1="${headTop}" x2="${x0 - 74}" y2="${baseTop}"/>
      <line x1="${x0 - 90}" y1="${headTop}" x2="${x0 - 58}" y2="${headTop}"/>
      <line x1="${x0 - 90}" y1="${baseTop}" x2="${x0 - 58}" y2="${baseTop}"/>
    </g>
    <rect width="${W}" height="${H}" fill="url(#vignette)"/>`);
}

function headboard(hex: string, fabric: Fabric): string {
  const clip = "hb-close";
  return svg(hex, fabric, `
    <rect width="${W}" height="${H}" fill="${dark(hex, 0.12)}"/>
    <clipPath id="${clip}"><rect width="${W}" height="${H}"/></clipPath>
    ${fabricShape((a) => `<rect width="${W}" height="${H}" ${a}/>`, "url(#fabricV)")}
    ${tufting(-90, 40, W + 260, H - 40, 5, 3.4, clip, hex, 24)}
    <rect width="${W}" height="${H}" fill="url(#vignette)"/>
    <rect width="${W}" height="16" fill="${light(hex, 0.3)}" opacity="0.5"/>`);
}

function fabricClose(hex: string, fabric: Fabric): string {
  // a woven weave under a gentle fold, with a piped seam: macro texture shot
  const tile = fabric === "linen" ? 7 : 5;
  const warp = fabric === "linen" ? 0.2 : 0.12;
  return svg(hex, fabric, `
    <defs>
      <pattern id="weave" width="${tile * 2}" height="${tile * 2}" patternUnits="userSpaceOnUse">
        <rect width="${tile}" height="${tile}" fill="#000" opacity="${warp}"/>
        <rect x="${tile}" y="${tile}" width="${tile}" height="${tile}" fill="#000" opacity="${warp}"/>
        <rect x="${tile}" width="${tile}" height="${tile}" fill="#fff" opacity="${warp * 0.9}"/>
        <rect y="${tile}" width="${tile}" height="${tile}" fill="#fff" opacity="${warp * 0.9}"/>
      </pattern>
      <linearGradient id="foldShade" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity="0.22"/>
        <stop offset="0.48" stop-color="#fff" stop-opacity="0"/>
        <stop offset="0.52" stop-color="#000" stop-opacity="0.34"/>
        <stop offset="1" stop-color="#000" stop-opacity="0.08"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="${hex}"/>
    <rect width="${W}" height="${H}" fill="url(#weave)"/>
    <rect width="${W}" height="${H}" fill="#000" filter="url(#grain)" opacity="0.3"/>
    <rect width="${W}" height="${H}" fill="url(#foldShade)"/>
    <!-- piped seam running corner to corner -->
    <line x1="-40" y1="${H + 40}" x2="${W + 40}" y2="-40" stroke="#000" stroke-width="34" opacity="0.2" filter="url(#blurM)" transform="translate(0 26)"/>
    <line x1="-40" y1="${H + 40}" x2="${W + 40}" y2="-40" stroke="${dark(hex, 0.08)}" stroke-width="40" stroke-linecap="round"/>
    <line x1="-40" y1="${H + 40}" x2="${W + 40}" y2="-40" stroke="${light(hex, 0.34)}" stroke-width="12" stroke-linecap="round" opacity="0.75" transform="translate(-6 -9)"/>
    <rect width="${W}" height="${H}" fill="#000" filter="url(#grain)" opacity="0.1"/>
    <rect width="${W}" height="${H}" fill="url(#vignette)"/>`);
}

function storage(hex: string, fabric: Fabric): string {
  const x0 = 120;
  const w = 1360;
  const baseTop = 210;
  const baseH = 420;
  const dw = 560;
  const cavX = x0 + 700;
  const cavY = baseTop + 86;
  const cavH = 250;
  // the pulled-out drawer: front panel moved forward (lower and a little wider)
  const frontX = cavX - 36;
  const frontY = cavY + 250;
  const frontW = dw + 72;
  const frontH = 300;
  return svg(hex, fabric, `
    <rect width="${W}" height="${H}" fill="url(#wall)"/>
    <ellipse cx="800" cy="${baseTop + baseH + 18}" rx="${w * 0.52}" ry="34" fill="#2a2218" opacity="0.16" filter="url(#blurM)"/>
    ${fabricShape((a) => rr(x0, baseTop, w, baseH, 10, a), "url(#fabricV)")}
    ${rr(x0, baseTop, w, baseH, 10, 'fill="url(#fabricH)"')}
    ${rr(x0, baseTop - 3, w, 24, 8, `fill="${light(hex, 0.3)}" opacity="0.65"`)}
    ${rr(x0, baseTop + baseH - 12, w, 12, 5, `fill="${dark(hex, 0.3)}" opacity="0.45"`)}
    <!-- closed drawer -->
    ${rr(x0 + 70, cavY, dw, cavH, 8, `fill="none" stroke="${dark(hex, 0.38)}" stroke-width="5" opacity="0.5"`)}
    ${rr(x0 + 70 + dw / 2 - 52, cavY + cavH / 2 - 9, 104, 18, 9, 'fill="#c9c4b8"')}
    ${rr(x0 + 70 + dw / 2 - 52, cavY + cavH / 2 - 9, 104, 6, 3, 'fill="#fff" opacity="0.7"')}
    <!-- open cavity -->
    ${rr(cavX, cavY, dw, cavH, 8, 'fill="#1f1812"')}
    <!-- drawer box: side walls and floor run from the cavity out to the front panel -->
    <polygon points="${cavX + 14},${cavY + 64} ${cavX + 14},${cavY + cavH - 10} ${frontX + 20},${frontY} ${frontX + 20},${frontY - 150}" fill="#8f7355"/>
    <polygon points="${cavX + dw - 14},${cavY + 64} ${cavX + dw - 14},${cavY + cavH - 10} ${frontX + frontW - 20},${frontY} ${frontX + frontW - 20},${frontY - 150}" fill="#7d6247"/>
    <polygon points="${cavX + 14},${cavY + cavH - 10} ${cavX + dw - 14},${cavY + cavH - 10} ${frontX + frontW - 20},${frontY} ${frontX + 20},${frontY}" fill="#a98a66"/>
    <!-- folded linens inside -->
    ${rr(cavX + 70, cavY + cavH - 64, 190, 46, 10, 'fill="#efe9dc"')}
    ${rr(cavX + 70, cavY + cavH - 82, 190, 24, 10, 'fill="#fbf9f4"')}
    ${rr(cavX + 290, cavY + cavH - 70, 200, 52, 10, `fill="${mix(hex, "#ffffff", 0.5)}"`)}
    <polygon points="${cavX + 14},${cavY + 64} ${cavX + 14},${cavY + 64} ${cavX + dw - 14},${cavY + 64} ${cavX + dw - 14},${cavY + 64}" fill="none"/>
    <!-- front panel -->
    <rect x="${frontX}" y="${frontY - 6}" width="${frontW}" height="${frontH}" rx="10" fill="#000" opacity="0.28" filter="url(#blurM)"/>
    ${fabricShape((a) => rr(frontX, frontY, frontW, frontH, 10, a), "url(#fabricV)")}
    ${rr(frontX, frontY, frontW, 16, 8, `fill="${light(hex, 0.3)}" opacity="0.6"`)}
    ${rr(frontX + frontW / 2 - 58, frontY + 36, 116, 20, 10, 'fill="#c9c4b8"')}
    ${rr(frontX + frontW / 2 - 58, frontY + 36, 116, 7, 3.5, 'fill="#fff" opacity="0.7"')}
    <rect width="${W}" height="${H}" fill="url(#vignette)"/>`);
}

export function renderView(view: ViewName, hex: string, colourName: string): string {
  const fabric = fabricFor(colourName);
  switch (view) {
    case "studio": return studio(hex, fabric);
    case "room": return room(hex, fabric);
    case "side": return side(hex, fabric);
    case "headboard": return headboard(hex, fabric);
    case "fabric": return fabricClose(hex, fabric);
    case "storage": return storage(hex, fabric);
  }
}

/** Wide lifestyle scene used on the home page hero. */
export function renderHero(hex: string, colourName: string): string {
  return room(hex, fabricFor(colourName));
}
