"use client";

import { ClipboardList, Home, LayoutGrid, ShieldCheck, ShoppingBag, Store, UserRound } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cartCount, useCart } from "@/lib/cart/store";
import { cn } from "@/lib/cn";

type Role = "buyer" | "seller" | "admin" | null;

/** Pages that carry their own fixed bottom action bar: the tab bar steps aside. */
const HIDE_ON = [/^\/products\/[^/]+/, /^\/seller/, /^\/admin/, /^\/login/, /^\/signup/];
/** These show a bottom action bar only while the basket has something in it. */
const HIDE_WHEN_BASKET_HAS_ITEMS = [/^\/cart/, /^\/checkout/];

export function MobileTabBar({ role }: { role: Role }) {
  const pathname = usePathname();
  const hydrated = useCart((s) => s.hydrated);
  const count = useCart((s) => cartCount(s.lines));

  if (HIDE_ON.some((re) => re.test(pathname))) return null;
  if (!hydrated || count > 0) {
    if (HIDE_WHEN_BASKET_HAS_ITEMS.some((re) => re.test(pathname))) return null;
  }

  const tabs = [
    { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
    { href: "/products", label: "Shop", icon: LayoutGrid, match: (p: string) => p === "/products" },
    { href: "/cart", label: "Basket", icon: ShoppingBag, match: (p: string) => p.startsWith("/cart") },
    role === "seller"
      ? { href: "/seller", label: "Sell", icon: Store, match: (p: string) => p.startsWith("/seller") }
      : role === "admin"
        ? { href: "/admin", label: "Admin", icon: ShieldCheck, match: (p: string) => p.startsWith("/admin") }
        : { href: "/orders", label: "Orders", icon: ClipboardList, match: (p: string) => p.startsWith("/orders") },
    {
      href: role ? "/account" : "/login",
      label: role ? "Account" : "Log in",
      icon: UserRound,
      match: (p: string) => p.startsWith("/account") || p.startsWith("/login"),
    },
  ];

  return (
    <nav
      aria-label="Primary"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper md:hidden"
    >
      <ul className="grid h-16 grid-cols-5">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.href + tab.label}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                  active ? "text-ink" : "text-ink-muted",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="tab-indicator"
                    className="absolute top-0 h-[2px] w-9 bg-clay"
                    transition={{ type: "spring", stiffness: 500, damping: 36 }}
                  />
                )}
                <span className="relative">
                  <Icon className="size-[22px]" strokeWidth={active ? 2 : 1.6} />
                  {tab.href === "/cart" && hydrated && count > 0 && (
                    <span className="tnum absolute -right-2.5 -top-1.5 grid min-w-[17px] place-items-center rounded-full bg-clay px-1 text-[10px] font-semibold leading-[17px] text-white">
                      {count}
                    </span>
                  )}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
