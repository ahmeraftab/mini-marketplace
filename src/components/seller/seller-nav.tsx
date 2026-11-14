"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/seller", label: "Listings", match: (p: string) => p === "/seller" || p.startsWith("/seller/products") },
  { href: "/seller/orders", label: "Orders", match: (p: string) => p.startsWith("/seller/orders") },
];

export function SellerNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Seller sections" className="mb-8 flex gap-1 border-b border-line">
      {TABS.map((t) => {
        const active = t.match(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex min-h-11 items-center border-b-2 px-4 text-[15px] font-medium transition-colors",
              active ? "border-ink text-ink" : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
