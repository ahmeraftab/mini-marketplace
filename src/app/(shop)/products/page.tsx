import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ActiveChips, Filters } from "@/components/shop/filters";
import { ProductCard } from "@/components/shop/product-card";
import { SearchBox } from "@/components/shop/search-box";
import { Button } from "@/components/ui/button";
import { parseBrowseParams } from "@/lib/catalog/browse";
import { getFacets, searchProducts } from "@/lib/catalog/queries";

export const metadata: Metadata = { title: "Shop beds" };

export default async function ProductsPage(props: PageProps<"/products">) {
  const params = parseBrowseParams(await props.searchParams);
  const facets = await getFacets();
  const products = await searchProducts(params, facets);

  return (
    <div className="mx-auto max-w-[1320px] px-4 pb-24 pt-8 sm:px-6 lg:px-8 lg:pt-12">
      <header className="mb-8 max-w-2xl">
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Beds</h1>
        <p className="mt-3 text-ink-muted">
          Choose a fabric, then a size and storage. Prices on this page are the starting price for each bed.
        </p>
      </header>

      <div className="grid gap-x-12 lg:grid-cols-[250px_1fr]">
        <Suspense>
          <Filters params={params} facets={facets} />
        </Suspense>

        <div className="min-w-0">
          <div className="mb-4">
            <Suspense>
              <SearchBox initial={params.q} />
            </Suspense>
          </div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <Suspense>
              <ActiveChips params={params} />
            </Suspense>
            <p className="text-sm text-ink-muted" aria-live="polite">
              {products.length} {products.length === 1 ? "result" : "results"}
            </p>
          </div>

          {products.length === 0 ? (
            <div className="rounded-card border border-dashed border-line-strong px-6 py-16 text-center">
              <h2 className="font-display text-2xl">Nothing matches those filters</h2>
              <p className="mx-auto mt-2 max-w-sm text-ink-muted">Try a different colour or size, or remove a filter.</p>
              <Button asChild className="mt-6">
                <Link href="/products">Clear filters</Link>
              </Button>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-x-6 gap-y-12 min-[480px]:grid-cols-2 xl:grid-cols-3">
              {products.map((p, i) => (
                <li key={p.id}>
                  <ProductCard product={p} colour={params.colours[0]} priority={i < 3} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
