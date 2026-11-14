/**
 * Money helpers. ALL money in this app is an integer number of pence.
 * Floating point is never used for arithmetic (269.99 + 90 + 39.99 is not exact).
 */

/** Largest amount a seller may enter: £1,000,000 (fits a Postgres integer). */
export const MAX_PRICE_PENCE = 100_000_000;

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** 26999 -> "£269.99", 117996 -> "£1,179.96". */
export function formatPence(pence: number): string {
  if (!Number.isFinite(pence)) return "£0.00";
  const rounded = Math.round(pence);
  const negative = rounded < 0;
  const abs = Math.abs(rounded);
  const pounds = Math.floor(abs / 100);
  const rest = String(abs % 100).padStart(2, "0");
  return `${negative ? "-" : ""}£${groupThousands(String(pounds))}.${rest}`;
}

/** Price difference for an option tile: 9000 -> "+£90.00", 0 -> "No extra cost". */
export function formatDelta(pence: number): string {
  if (pence === 0) return "No extra cost";
  if (pence < 0) return `−${formatPence(Math.abs(pence))}`;
  return `+${formatPence(pence)}`;
}

/** 26999 -> "269.99" for pre-filling a price input. */
export function penceToInput(pence: number): string {
  const abs = Math.abs(Math.round(pence));
  const text = `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
  return pence < 0 ? `-${text}` : text;
}

const POUNDS_PATTERN = /^£?\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?$/;

/**
 * Parse what a person types into a price box, straight from the string
 * (never `value * 100`). Accepts "269.99", "269", "£269.99", "1,299.00",
 * "269.9". Returns pence, or null for anything else (negative, more than two
 * decimals, letters, empty, above the maximum).
 */
export function parsePounds(input: string): number | null {
  const match = POUNDS_PATTERN.exec(input.trim());
  if (!match) return null;
  const pounds = Number(match[1].replace(/,/g, ""));
  const pence = match[2] ? Number(match[2].padEnd(2, "0")) : 0;
  const total = pounds * 100 + pence;
  if (!Number.isSafeInteger(total) || total > MAX_PRICE_PENCE) return null;
  return total;
}
