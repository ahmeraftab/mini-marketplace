import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProductCard as Card } from "@/lib/catalog/types";
import { imageUrl } from "@/lib/images";
import { formatPence } from "@/lib/money";
import { discountPercentFor } from "@/lib/pricing";

const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** A listing shown large, for when the shop only has one or two beds. */
export function FeaturedProduct({ product }: { product: Card }) {
  const main = product.colours[0];
  const own = product.images.filter((i) => i.colourId === main?.id);
  const pool = own.length ? own : product.images.filter((i) => i.colourId === null);
  const [first, second] = pool;
  const discount = discountPercentFor(product.basePricePence, product.compareAtPricePence);
  const href = `/products/${product.slug}`;

  return (
    <article className="grid items-center gap-8 lg:grid-cols-12 lg:gap-14">
      <Link href={href} className="group relative block lg:col-span-7" aria-label={main?.title ?? product.title}>
        <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-paper-deep">
          {first && (
            <Image
              src={imageUrl(first.path)}
              alt={first.alt || main?.title || product.title}
              fill
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.02]"
            />
          )}
          {second && (
            <Image
              src={imageUrl(second.path)}
              alt=""
              fill
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          )}
          {discount != null && <Badge tone="clay" className="absolute left-4 top-4">{discount}% OFF</Badge>}
        </div>
      </Link>

      <div className="lg:col-span-5">
        <p className="eyebrow">{product.shopName}</p>
        <h3 className="mt-2 font-display text-3xl leading-tight tracking-tight sm:text-4xl">
          <Link href={href} className="hover:text-clay">{main?.title ?? product.title}</Link>
        </h3>
        <p className="mt-4 flex flex-wrap items-baseline gap-x-3">
          <span className="tnum font-display text-3xl font-medium">
            <span className="text-base font-normal text-ink-muted">From </span>
            {formatPence(product.basePricePence)}
          </span>
          {product.compareAtPricePence != null && (
            <span className="tnum text-lg text-ink-muted line-through">
              <span className="sr-only">Was </span>
              {formatPence(product.compareAtPricePence)}
            </span>
          )}
        </p>
        {product.colours.length > 1 && (
          <>
            <p className="mt-6 text-sm text-ink-muted">{product.colours.length} fabrics to choose from</p>
            <ul className="mt-2 flex flex-wrap gap-1" aria-label="Choose a colour">
              {product.colours.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`${href}?colour=${slugOf(c.name)}`}
                    title={c.name}
                    className="grid size-11 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                  >
                    <span className="block size-7 rounded-full border border-black/15" style={{ backgroundColor: c.hex }} />
                    <span className="sr-only">{c.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
        <Button asChild className="mt-6">
          <Link href={href}>Configure this bed <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </Button>
      </div>
    </article>
  );
}
