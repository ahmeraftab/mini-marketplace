import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/layout/back-link";
import { notFound } from "next/navigation";
import { ProductConfigurator } from "@/components/product/configurator";
import { getProductBySlug } from "@/lib/catalog/queries";

type Props = PageProps<"/products/[slug]">;

const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function load(props: Props) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  return product;
}

function pickColour(product: NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>, wanted: string | string[] | undefined) {
  const w = Array.isArray(wanted) ? wanted[0] : wanted;
  return product.colours.find((c) => slugOf(c.name) === w) ?? product.colours[0];
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const product = await load(props);
  if (!product) return { title: "Not found" };
  const colour = pickColour(product, (await props.searchParams).colour);
  return {
    title: colour.title, // the layout template adds the site name
    description: product.description.slice(0, 160),
  };
}

export default async function ProductPage(props: Props) {
  const product = await load(props);
  if (!product) notFound();
  const colour = pickColour(product, (await props.searchParams).colour);

  return (
    <div className="mx-auto max-w-[1320px] px-4 pb-40 pt-5 sm:px-6 lg:pb-20 lg:pt-8">
      <BackLink href="/products" label="All beds" className="md:hidden" />
      <nav aria-label="Breadcrumb" className="mb-5 hidden text-sm text-ink-muted md:block">
        <ol className="flex flex-wrap items-center gap-x-2">
          <li><Link href="/products" className="hover:text-ink">Shop</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href={`/products?category=${product.category.slug}`} className="hover:text-ink">{product.category.name}</Link></li>
        </ol>
      </nav>

      <ProductConfigurator product={product} initialColourId={colour.id} />

      <section className="mt-16 grid gap-10 border-t border-line pt-12 lg:grid-cols-12" aria-labelledby="about">
        <h2 id="about" className="font-display text-2xl lg:col-span-4">About this bed</h2>
        <div className="max-w-prose whitespace-pre-line text-[16px] leading-relaxed text-ink-soft lg:col-span-8">
          {product.description}
        </div>
      </section>
    </div>
  );
}
