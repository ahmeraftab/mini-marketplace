import { WifiOff } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-md px-4 py-28 text-center">
      <WifiOff className="mx-auto size-10 text-ink-muted" strokeWidth={1.4} />
      <h1 className="mt-5 font-display text-3xl">You are offline</h1>
      <p className="mt-3 text-ink-muted">Check your connection and try again. Your basket is saved on this phone and will be here when you are back.</p>
    </div>
  );
}
