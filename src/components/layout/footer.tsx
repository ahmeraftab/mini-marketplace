import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export function Footer({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <footer className="mt-24 border-t border-line bg-paper-deep">
      <div className="mx-auto grid max-w-[1320px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-[15px] text-ink-muted">{SITE_TAGLINE}. Pick the fabric, size and storage; the price follows every choice.</p>
        </div>

        <FooterColumn
          title="Shop"
          links={[
            ["All beds", "/products"],
            ["Divan beds", "/products?category=divan-beds"],
            ["Basket", "/cart"],
          ]}
        />
        <FooterColumn
          title="Sellers"
          links={[
            ["Open a shop", "/signup?role=seller"],
            ["Seller hub", "/seller"],
            signedIn ? ["Your account", "/account"] : ["Log in", "/login"],
          ]}
        />
        <FooterColumn
          title="App"
          links={[
            ["Install on your phone", "/install"],
            ["Your orders", "/orders"],
          ]}
        />
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-[1320px] px-4 py-5 text-[13px] text-ink-muted sm:px-6 lg:px-8">
          {SITE_NAME} is a working demo. Every shop, photo and order is sample data, and checkout never takes a
          payment.
        </p>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <nav aria-label={title}>
      <h2 className="eyebrow font-sans">{title}</h2>
      <ul className="mt-3 space-y-0.5">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="inline-flex min-h-11 items-center text-[15px] text-ink-soft hover:text-ink hover:underline hover:underline-offset-4 md:min-h-9">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
