import { Search } from "lucide-react";
import Link from "next/link";
import { AccountMenu } from "@/components/layout/account-menu";
import { CartButton } from "@/components/layout/cart-button";
import { Logo } from "@/components/layout/logo";
import { getSessionProfile } from "@/lib/auth";

const nav = [
  { href: "/products", label: "Shop" },
  { href: "/signup?role=seller", label: "Sell with us" },
  { href: "/install", label: "Get the app" },
];

export async function Header() {
  const session = await getSessionProfile();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-3 px-4 sm:px-6 lg:gap-8 lg:px-8">
        <Logo />

        <nav aria-label="Main" className="ml-2 hidden items-center gap-1 md:flex">
          {nav
            .filter((item) => !(item.href.startsWith("/signup") && session))
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex min-h-11 items-center rounded-control px-3 text-[15px] text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
        </nav>

        <form action="/products" role="search" className="relative ml-auto hidden max-w-sm flex-1 lg:block">
          <label htmlFor="header-search" className="sr-only">
            Search the shop
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            id="header-search"
            name="q"
            type="search"
            placeholder="Search beds, colours, shops"
            autoComplete="off"
            className="h-11 w-full rounded-control border border-line-strong bg-surface pl-9 pr-3 text-[15px] transition-[border-color,box-shadow] placeholder:text-ink-muted/70 hover:border-ink-muted focus:border-ink focus:outline-none focus:shadow-[0_0_0_3px_rgb(27_26_23/0.1)]"
          />
        </form>

        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <Link
            href="/products"
            className="inline-flex size-11 items-center justify-center rounded-control hover:bg-paper-deep lg:hidden"
            aria-label="Search the shop"
          >
            <Search className="size-[22px]" strokeWidth={1.6} />
          </Link>
          <CartButton />
          <div className="hidden md:block">
            {session ? (
              <AccountMenu name={session.fullName} email={session.email} role={session.role} />
            ) : (
              <div className="flex items-center gap-1">
                <Link
                  href="/login"
                  className="inline-flex min-h-11 items-center rounded-control px-3 text-[15px] font-medium hover:bg-paper-deep"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex min-h-11 items-center rounded-control bg-ink px-4 text-[15px] font-medium text-paper transition-colors hover:bg-ink-soft"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
