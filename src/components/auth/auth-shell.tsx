import type { ReactNode } from "react";
import { LogoMark } from "@/components/layout/logo";

/** Two-column frame for log in / sign up: a quiet editorial panel beside the form. */
export function AuthShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto grid max-w-[1320px] gap-0 px-4 py-10 sm:px-6 md:py-16 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:px-8">
      <aside className="relative hidden overflow-hidden rounded-card bg-ink p-12 text-paper lg:flex lg:flex-col lg:justify-between">
        <div className="grain pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <LogoMark className="relative size-10 text-paper" />
        <div className="relative">
          <p className="eyebrow !text-paper/60">{eyebrow}</p>
          <p className="mt-4 font-display text-4xl leading-[1.1]">
            Choose the fabric. Choose the size. Watch the price follow.
          </p>
          <p className="mt-6 max-w-sm text-[15px] text-paper/70">
            Every option, price and photo on a listing is entered by its seller. Nothing is fixed in the page.
          </p>
        </div>
      </aside>

      <section className="mx-auto w-full max-w-md py-2 lg:py-10">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 text-4xl sm:text-[2.6rem]">{title}</h1>
        <p className="mt-3 text-[15px] text-ink-muted">{intro}</p>
        <div className="mt-8">{children}</div>
      </section>
    </div>
  );
}
