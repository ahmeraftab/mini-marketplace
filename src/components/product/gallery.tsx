"use client";

import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { motion } from "motion/react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { imageUrl } from "@/lib/images";
import type { ProductImage } from "@/lib/catalog/types";

const ProductLightbox = dynamic(() => import("./lightbox"), { ssr: false });

type Props = {
  images: ProductImage[];
  title: string;
  /** Hex of the selected colour. When a colour has no photos of its own the shared photo is tinted with it. */
  tint: string | null;
  colourName: string;
};

/** True once any gallery has appeared in this tab: only LATER mounts (a colour change) fade in, so the first photo is never held back. */
let galleryHasAppeared = false;

export function Gallery({ images, title, tint, colourName }: Props) {
  const [fadeIn] = useState(() => galleryHasAppeared);
  useEffect(() => {
    galleryHasAppeared = true;
  }, []);
  const [emblaRef, embla] = useEmblaCarousel({ loop: false, align: "start", containScroll: "trimSnaps" });
  const [selected, setSelected] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const onSelect = useCallback(() => {
    if (embla) setSelected(embla.selectedScrollSnap());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    embla.on("select", onSelect).on("reInit", onSelect);
    return () => {
      embla.off("select", onSelect).off("reInit", onSelect);
    };
  }, [embla, onSelect]);

  const slides = images.map((img) => ({
    src: imageUrl(img.path),
    alt: img.alt || title,
    width: img.width ?? 1600,
    height: img.height ?? 1200,
  }));

  const count = images.length;
  const goTo = (i: number) => embla?.scrollTo(i);

  if (count === 0) {
    return (
      <div className="grid aspect-[4/3] place-items-center rounded-card bg-paper-deep text-ink-muted">
        No photos yet
      </div>
    );
  }

  return (
    <div className="min-w-0 lg:grid lg:grid-cols-[84px_minmax(0,1fr)] lg:gap-4">
      <motion.div
        // the whole gallery fades in whenever the colour (and so the photo set) changes
        initial={fadeIn ? { opacity: 0.15 } : false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative -mx-4 min-w-0 sm:-mx-6 lg:order-2 lg:mx-0"
      >
        <div ref={emblaRef} className="overflow-hidden lg:rounded-card" aria-roledescription="carousel" aria-label={`${title} photos`}>
          <div className="flex touch-pan-y">
            {images.map((img, i) => (
              <div
                key={img.id}
                className="relative aspect-[4/3] min-w-0 flex-[0_0_100%] bg-paper-deep"
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${count}`}
              >
                <Image
                  src={imageUrl(img.path)}
                  alt={img.alt || title}
                  fill
                  preload={i === 0}
                  fetchPriority={i === 0 ? "high" : "auto"}
                  sizes="(min-width: 1024px) 56vw, 100vw"
                  className="select-none object-cover"
                  draggable={false}
                />
                {tint && img.colourId === null && (
                  <span
                    className="pointer-events-none absolute inset-0 mix-blend-multiply"
                    style={{ backgroundColor: tint }}
                    aria-hidden="true"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {tint && images.every((i) => i.colourId === null) && (
          <p className="absolute left-4 top-3 rounded-[3px] bg-ink/70 px-2 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-paper lg:left-3">
            Colour preview · {colourName}
          </p>
        )}

        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="absolute right-3 top-3 grid size-11 place-items-center rounded-full bg-surface/95 text-ink shadow-lift transition-transform hover:scale-105"
          aria-label="Enlarge photo"
        >
          <Expand className="size-[18px]" />
        </button>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => embla?.scrollPrev()}
              disabled={selected === 0}
              className="absolute left-3 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-surface/95 text-ink shadow-lift transition-opacity hover:scale-105 disabled:opacity-0 lg:grid"
              aria-label="Previous photo"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => embla?.scrollNext()}
              disabled={selected === count - 1}
              className="absolute right-3 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-surface/95 text-ink shadow-lift transition-opacity hover:scale-105 disabled:opacity-0 lg:grid"
              aria-label="Next photo"
            >
              <ChevronRight className="size-5" />
            </button>
            <p
              className="tnum absolute bottom-3 right-3 rounded-full bg-ink/75 px-3 py-1 text-[13px] font-medium text-paper"
              aria-live="polite"
            >
              {selected + 1} / {count}
            </p>
          </>
        )}
      </motion.div>

      {/* thumbnails: vertical rail on large screens, strip below on small ones */}
      <ul
        className="scrollbar-none -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:order-1 lg:m-0 lg:max-h-[640px] lg:flex-col lg:overflow-y-auto lg:overflow-x-visible lg:p-0"
        aria-label="Photo thumbnails"
      >
        {images.map((img, i) => (
          <li key={img.id} className="shrink-0 lg:w-full">
            <button
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show photo ${i + 1} of ${count}`}
              aria-current={i === selected}
              className={cn(
                "relative block size-14 overflow-hidden rounded-[3px] border-2 bg-paper-deep transition-[border-color,opacity] duration-200 lg:size-auto lg:aspect-[4/3] lg:w-full",
                i === selected ? "border-ink" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <Image
                src={imageUrl(img.path)}
                alt=""
                fill
                sizes="84px"
                className="object-cover"
              />
              {tint && img.colourId === null && (
                <span className="absolute inset-0 mix-blend-multiply" style={{ backgroundColor: tint }} aria-hidden="true" />
              )}
            </button>
          </li>
        ))}
      </ul>

      {lightboxOpen && (
        <ProductLightbox slides={slides} index={selected} open={lightboxOpen} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  );
}
