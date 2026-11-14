import { ArrowRight, Layers, PackageCheck, Ruler } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/shop/reveal";
import { FeaturedProduct } from "@/components/shop/featured-product";
import { ProductCard } from "@/components/shop/product-card";
import { Button } from "@/components/ui/button";
import { getFeaturedProducts } from "@/lib/catalog/queries";
import { imageUrl } from "@/lib/images";
import { SITE_NAME } from "@/lib/site";

export default async function HomePage() {
  const featured = await getFeaturedProducts(4);
  const hero = featured[0]?.images.find((i) => i.colourId !== null) ?? featured[0]?.images[0];
  const room = featured[0]?.images.filter((i) => i.colourId !== null)[1];

  return (
    <>
      <section className="mx-auto grid max-w-[1320px] items-center gap-10 px-4 pb-16 pt-8 sm:px-6 md:pt-14 lg:grid-cols-12 lg:gap-14 lg:px-8 lg:pb-24">
        <div className="lg:col-span-5">
          <p className="animate-rise text-sm font-medium uppercase tracking-[0.14em] text-clay">Divan beds, made to your size</p>
          <h1 className="animate-rise mt-4 font-display text-[2.6rem] leading-[1.05] tracking-tight [animation-delay:80ms] sm:text-6xl">
            Sleep somewhere you chose, down to the stitching.
          </h1>
          <p className="animate-rise mt-6 max-w-md text-lg text-ink-muted [animation-delay:160ms]">
            Pick the fabric, the size, where the drawers go and how tall the headboard stands. The price follows every
            choice, so there is nothing to add up at the end.
          </p>
          <div className="animate-rise mt-8 flex flex-wrap gap-3 [animation-delay:240ms]">
            <Button asChild size="lg">
              <Link href="/products">Shop beds <ArrowRight className="size-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/signup?role=seller">Sell on {SITE_NAME}</Link>
            </Button>
          </div>
        </div>

        <div className="animate-fade relative lg:col-span-7">
          <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-paper-deep">
            {hero && (
              <Image src={imageUrl(hero.path)} alt={hero.alt || "A divan bed"} fill preload fetchPriority="high" sizes="(min-width: 1024px) 58vw, 100vw" className="object-cover" />
            )}
          </div>
          {room && (
            <div className="absolute -bottom-6 -left-3 hidden w-40 overflow-hidden rounded-card border-4 border-paper bg-paper-deep shadow-lift sm:block lg:-left-8 lg:w-52">
              <div className="relative aspect-[4/3]">
                <Image src={imageUrl(room.path)} alt="" fill sizes="208px" className="object-cover" />
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="border-y border-line bg-paper-deep/60">
        <ul className="mx-auto grid max-w-[1320px] gap-px px-4 sm:px-6 md:grid-cols-3 lg:px-8">
          {[
            { icon: Layers, title: "Fabric you can see", text: "Every colour has its own photos and name, so what you pick is what you read." },
            { icon: Ruler, title: "Six sizes, real extras", text: "Small single to super king, with storage and headboard options priced up front." },
            { icon: PackageCheck, title: "Follow your order", text: "The seller moves it from New to Delivered and you see each step as it happens." },
          ].map((item, i) => (
            <Reveal key={item.title} delay={i * 0.08} as="li" className="flex gap-4 py-8 md:px-6 md:first:pl-0 md:last:pr-0">
              <item.icon className="mt-1 size-6 shrink-0 text-clay" strokeWidth={1.5} />
              <div>
                <h2 className="font-display text-xl">{item.title}</h2>
                <p className="mt-1 text-[15px] text-ink-muted">{item.text}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-[1320px] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl tracking-tight sm:text-4xl">On the shop floor</h2>
          <Link href="/products" className="text-[15px] underline underline-offset-4 hover:text-clay">See everything</Link>
        </div>
        {featured.length > 0 && featured.length < 3 ? (
          <div className="space-y-16">
            {featured.map((p) => (
              <Reveal key={p.id}>
                <FeaturedProduct product={p} />
              </Reveal>
            ))}
          </div>
        ) : featured.length ? (
          <ul className="grid grid-cols-1 gap-x-6 gap-y-12 min-[480px]:grid-cols-2 lg:grid-cols-4">
            {featured.map((p, i) => (
              <Reveal key={p.id} as="li" delay={i * 0.06}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </ul>
        ) : (
          <p className="rounded-card border border-dashed border-line-strong px-6 py-14 text-center text-ink-muted">
            No beds are listed yet. Sellers add listings and an admin approves them before they appear here.
          </p>
        )}
      </section>
    </>
  );
}
