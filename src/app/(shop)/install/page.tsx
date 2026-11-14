import type { Metadata } from "next";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Get the app" };

const android = [
  "Open this site in Chrome on your phone.",
  "Tap the three dots at the top right.",
  "Tap Install app (or Add to Home screen).",
  "Open it from your home screen. It runs full screen with its own icon.",
];
const iphone = [
  "Open this site in Safari (not inside another app).",
  "Tap the Share button at the bottom of the screen.",
  "Scroll and tap Add to Home Screen, then Add.",
  "Open it from your home screen. Sign in again inside the app: iPhone keeps a separate login for installed apps.",
];

export default function InstallPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-8 sm:px-6 lg:pt-12">
      <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Get the {SITE_NAME} app</h1>
      <p className="mt-4 max-w-xl text-lg text-ink-muted">
        It is the same shop, installed on your phone. Same account, same basket, same orders; nothing to download from a store.
      </p>
      <div className="mt-6"><InstallPrompt /></div>

      <div className="mt-12 grid gap-10 sm:grid-cols-2">
        {[{ title: "Android (Chrome)", steps: android }, { title: "iPhone (Safari)", steps: iphone }].map((g) => (
          <section key={g.title} aria-labelledby={g.title.replace(/\W/g, "")}>
            <h2 id={g.title.replace(/\W/g, "")} className="font-display text-2xl">{g.title}</h2>
            <ol className="mt-4 space-y-4">
              {g.steps.map((s, i) => (
                <li key={s} className="flex gap-4">
                  <span className="tnum grid size-8 shrink-0 place-items-center rounded-full bg-ink text-sm text-paper">{i + 1}</span>
                  <span className="pt-0.5 text-[15px]">{s}</span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
