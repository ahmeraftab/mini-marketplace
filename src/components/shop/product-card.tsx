import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { ProductCard as Card } from "@/lib/catalog/types";
import { discountPercentFor } from "@/lib/pricing";
import { imageUrl } from "@/lib/images";
import { formatPence } from "@/lib/money";

const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** One listing. When a colour filter is active the card shows that colour's photo and title. */
export function ProductCard({ product, colour, priority }: { product: Card; colour?: string; priority?: boolean }) {
  const chosen = (colour && product.colours.find((c) => c.name === colour)) || product.colours[0];
  const own = product.images.filter((i) => i.colourId === chosen?.id);
  const pool = own.length ? own : product.images.filter((i) => i.colourId === null);
  const first = pool[0];
  const second = pool[1];
  const discount = discountPercentFor(product.basePricePence, product.compareAtPricePence);
  const href = `/products/${product.slug}${chosen ? `?colour=${slugOf(chosen.name)}` : ""}`;

  return (
    <article className="group relative">
      <Link href={href} className="block outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4 focus-visible:ring-offset-paper">
        <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-paper-deep">
          {first && (
            <Image
              src={imageUrl(first.path)}
              alt={first.alt || chosen?.title || product.title}
              fill
              priority={priority}
              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
              className="object-cover transition-[transform,opacity] duration-700 ease-out-expo group-hover:scale-[1.03]"
            />
          )}
          {second && (
            <Image
              src={imageUrl(second.path)}
              alt=""
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
              className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          )}
          {discount != null && <Badge tone="clay" className="absolute left-3 top-3">{discount}% OFF</Badge>}
        </div>
        <h3 className="mt-3 font-display text-lg leading-snug">{chosen?.title ?? product.title}</h3>
        <p className="mt-0.5 text-sm text-ink-muted">{product.shopName}</p>
        <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <span className="tnum font-display text-xl font-medium">
            <span className="text-sm font-normal text-ink-muted">From </span>
            {formatPence(product.basePricePence)}
          </span>
          {product.compareAtPricePence != null && (
            <span className="tnum text-sm text-ink-muted line-through">
              <span className="sr-only">Was </span>
              {formatPence(product.compareAtPricePence)}
            </span>
          )}
        </p>
      </Link>
      {product.colours.length > 1 && (
        <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Available colours">
          {product.colours.map((c) => (
            <li key={c.id}>
              <span
                title={c.name}
                className="block size-4 rounded-full border border-black/15"
                style={{ backgroundColor: c.hex }}
              >
                <span className="sr-only">{c.name}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
