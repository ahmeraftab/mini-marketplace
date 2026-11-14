"use client";

import { Check, Minus, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { configurationKey } from "@/lib/cart/key";
import { useCart, type CartLine } from "@/lib/cart/store";
import { imagesForColour, type ProductDetail } from "@/lib/catalog/types";
import { cn } from "@/lib/cn";
import { imageUrl } from "@/lib/images";
import { formatDelta, formatPence } from "@/lib/money";
import { MAX_QUANTITY, priceConfiguration } from "@/lib/pricing";
import { Gallery } from "./gallery";
import { MiniBasket } from "./mini-basket";
import { OptionGroupField } from "./option-group";
import { RollingPrice } from "./rolling-price";
import { Swatches } from "./swatches";

export function ProductConfigurator({
  product,
  initialColourId,
}: {
  product: ProductDetail;
  initialColourId: string;
}) {
  const [colourId, setColourId] = useState(initialColourId);
  const [valueIds, setValueIds] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(
      product.groups.map((g) => [g.id, g.values.find((v) => v.isDefault)?.id ?? null]),
    ),
  );
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [showMissing, setShowMissing] = useState(false);
  const [added, setAdded] = useState(false);
  const [miniOpen, setMiniOpen] = useState(false);
  const [lastLine, setLastLine] = useState<CartLine | null>(null);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addToCart = useCart((s) => s.add);
  const lines = useCart((s) => s.lines);
  const hydrated = useCart((s) => s.hydrated);

  const colour = product.colours.find((c) => c.id === colourId) ?? product.colours[0];
  const galleryImages = useMemo(() => imagesForColour(product.images, colour.id), [product.images, colour.id]);
  const hasOwnPhotos = product.images.some((i) => i.colourId === colour.id);

  const price = priceConfiguration(product, { valueIds, addonIds, quantity });

  // keep the URL shareable: ?colour=<slug>
  const colourSlug = useCallback((name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), []);
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("colour", colourSlug(colour.name));
    window.history.replaceState(window.history.state, "", url);
    document.title = `${colour.title} | ${product.shopName}`;
  }, [colour, colourSlug, product.shopName]);

  useEffect(() => () => {
    if (addedTimer.current) clearTimeout(addedTimer.current);
  }, []);

  const setValue = (groupId: string, valueId: string) => {
    setValueIds((prev) => ({ ...prev, [groupId]: valueId }));
  };
  const toggleAddon = (id: string) =>
    setAddonIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));

  const firstMissing = price.missingGroupIds[0];
  const missingNames = product.groups.filter((g) => price.missingGroupIds.includes(g.id)).map((g) => g.name.toLowerCase());

  function handleAdd() {
    if (!price.ok) {
      setShowMissing(true);
      const el = document.getElementById(`field-${firstMissing}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.error(`Please choose a ${missingNames.join(" and ")}`);
      return;
    }
    const chosen: Record<string, string> = {};
    for (const g of product.groups) chosen[g.id] = valueIds[g.id] as string;
    const heroImage = galleryImages[0] ?? null;
    const line: CartLine = {
      key: configurationKey({
        productId: product.id,
        colourId: colour.id,
        valueIds: Object.values(chosen),
        addonIds,
      }),
      productId: product.id,
      slug: product.slug,
      colourId: colour.id,
      valueIds: chosen,
      addonIds: [...addonIds],
      quantity,
      title: colour.title,
      colourName: colour.name,
      colourHex: colour.hex,
      imagePath: heroImage?.path ?? null,
      shopName: product.shopName,
      options: product.groups.map((g) => {
        const v = g.values.find((x) => x.id === chosen[g.id])!;
        return { group: g.name, value: v.label, deltaPence: v.priceDeltaPence };
      }),
      addons: product.addons.filter((a) => addonIds.includes(a.id)).map((a) => ({ label: a.label, pricePence: a.pricePence })),
      unitPence: price.unitPence,
      wasUnitPence: price.wasUnitPence,
    };
    const resulting = addToCart(line);
    setLastLine({ ...line, quantity: resulting });
    setMiniOpen(true);
    setAdded(true);
    if (addedTimer.current) clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAdded(false), 1800);
  }

  const miniLines = hydrated ? lines : [];
  const notPublic = product.status !== "approved" || product.sellerStatus !== "approved";

  const priceBlock = (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <RollingPrice pence={price.unitPence} className="tnum font-display text-4xl font-medium tracking-tight sm:text-[2.6rem]" />
        {price.wasUnitPence != null && (
          <span className="tnum text-lg text-ink-muted line-through" data-testid="was-price">
            <span className="sr-only">Was </span>
            {formatPence(price.wasUnitPence)}
          </span>
        )}
        {price.discountPercent != null && <Badge tone="clay">{price.discountPercent}% OFF</Badge>}
      </div>
      {price.savingPence != null && (
        <p className="mt-1 text-sm text-moss">You save {formatPence(price.savingPence)}</p>
      )}
      <AnimatePresence initial={false}>
        {!price.ok && (
          <motion.p
            key="hint"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden text-sm text-ink-muted"
          >
            <span className="mt-1 block">Choose a {missingNames.join(" and ")} to see your total</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );

  const quantityStepper = (
    <div className="flex items-center gap-3">
      <span className="text-[15px] font-semibold" id="qty-label">Quantity:</span>
      <div className="flex items-center rounded-control border border-line-strong bg-surface" role="group" aria-labelledby="qty-label">
        <button
          type="button"
          className="grid size-11 place-items-center text-ink transition-colors hover:bg-paper-deep disabled:opacity-35"
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          disabled={quantity <= 1}
          aria-label="Decrease quantity"
        >
          <Minus className="size-4" />
        </button>
        <output className="tnum w-10 text-center text-[15px] font-medium" aria-live="polite">{quantity}</output>
        <button
          type="button"
          className="grid size-11 place-items-center text-ink transition-colors hover:bg-paper-deep disabled:opacity-35"
          onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
          disabled={quantity >= MAX_QUANTITY}
          aria-label="Increase quantity"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );

  const addButton = (testId: string, className?: string) => (
    <Button
      size="lg"
      variant={added ? "accent" : "primary"}
      onClick={handleAdd}
      className={cn("w-full", className)}
      data-testid={testId}
    >
      <AnimatePresence mode="wait" initial={false}>
        {added ? (
          <motion.span key="done" initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} className="inline-flex items-center gap-2">
            <Check className="size-5" strokeWidth={2.6} /> Added
          </motion.span>
        ) : (
          <motion.span key="add" initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }}>
            Add to Basket
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );

  return (
    <>
      {notPublic && (
        <p className="mb-6 rounded-control border border-amber-ink/20 bg-amber-soft px-4 py-3 text-sm text-amber-ink">
          Not public: this listing is {product.status === "approved" ? "hidden because its shop is not approved" : product.status}. Only its seller and admins can see it.
        </p>
      )}
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="min-w-0 lg:col-span-7">
          <div className="lg:sticky lg:top-24">
            <Gallery
              key={colour.id}
              images={galleryImages}
              title={colour.title}
              tint={hasOwnPhotos ? null : colour.hex}
              colourName={colour.name}
            />
          </div>
        </div>

        <div className="min-w-0 lg:col-span-5">
          <p className="text-sm text-ink-muted">
            Sold by <span className="font-medium text-ink">{product.shopName}</span> · {product.category.name}
          </p>
          <div className="relative mt-2 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.h1
                key={colour.id}
                data-testid="product-title"
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -14, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="font-display text-[1.75rem] leading-[1.15] tracking-tight sm:text-[2.1rem]"
              >
                {colour.title}
              </motion.h1>
            </AnimatePresence>
          </div>

          <div className="mt-5">{priceBlock}</div>

          <div className="mt-8 space-y-8 border-t border-line pt-8">
            <Swatches colours={product.colours} value={colour.id} onChange={setColourId} />

            {product.groups.map((group) => (
              <OptionGroupField
                key={group.id}
                group={group}
                value={valueIds[group.id] ?? null}
                onChange={(id) => setValue(group.id, id)}
                invalid={showMissing && price.missingGroupIds.includes(group.id)}
              />
            ))}

            {product.addons.length > 0 && (
              <fieldset>
                <legend className="mb-3 text-[15px] font-semibold">Extras:</legend>
                <div className="grid gap-2">
                  {product.addons.map((addon) => {
                    const checked = addonIds.includes(addon.id);
                    return (
                      <label
                        key={addon.id}
                        className={cn(
                          "flex min-h-12 cursor-pointer items-center gap-3 rounded-control border bg-surface px-4 py-2.5 transition-[border-color,box-shadow] duration-200",
                          "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-paper",
                          checked ? "border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]" : "border-line-strong hover:border-ink/60",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={checked}
                          onChange={() => toggleAddon(addon.id)}
                        />
                        <span
                          aria-hidden="true"
                          className={cn(
                            "grid size-5 shrink-0 place-items-center rounded-[4px] border transition-colors duration-200",
                            checked ? "border-ink bg-ink text-paper" : "border-line-strong bg-surface",
                          )}
                        >
                          <Check className={cn("size-3.5 transition-opacity", checked ? "opacity-100" : "opacity-0")} strokeWidth={3} />
                        </span>
                        <span className="min-w-0 flex-1 text-[15px]">{addon.label}</span>
                        <span className="tnum shrink-0 text-sm font-medium">{formatDelta(addon.pricePence)}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {quantityStepper}

            {/* desktop: the button sits in the column; phones use the fixed bar below */}
            <div className="hidden lg:block">{addButton("add-to-basket-desktop")}</div>
          </div>
        </div>
      </div>

      {/* phone: permanently visible bar with live price and Add to Basket */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/98 shadow-[0_-8px_24px_-16px_rgb(27_26_23/0.35)] lg:hidden" data-testid="sticky-bar">
        <div className="mx-auto flex max-w-[1320px] items-center gap-3 px-4 py-3 sm:px-6">
          {galleryImages[0] && (
            <div className="relative size-12 shrink-0 overflow-hidden rounded-[3px] bg-paper-deep">
              <Image src={imageUrl(galleryImages[0].path)} alt="" fill sizes="48px" className="object-cover" />
              {!hasOwnPhotos && <span className="absolute inset-0 mix-blend-multiply" style={{ backgroundColor: colour.hex }} aria-hidden="true" />}
            </div>
          )}
          <div className="min-w-0 flex-1 leading-tight">
            <p className="tnum font-display text-xl font-medium">{formatPence(price.lineTotalPence)}</p>
            <p className="truncate text-xs text-ink-muted">{price.ok ? colour.name : `Choose a ${missingNames[0] ?? "size"}`}</p>
          </div>
          <div className="w-[9.5rem] shrink-0">{addButton("add-to-basket")}</div>
        </div>
      </div>

      <MiniBasket open={miniOpen} onOpenChange={setMiniOpen} line={lastLine} lines={miniLines} />
    </>
  );
}
