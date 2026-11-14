/**
 * Public URL for a stored product photo. Paths that start with "/" are local
 * files (development fixtures); everything else is in the Supabase bucket.
 */
export function imageUrl(path: string | null | undefined): string {
  if (!path) return "/images/placeholder.svg";
  if (path.startsWith("/")) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/public/product-images/${encoded}`;
}
