"use client";

import { Download, Share, SquarePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Install help that fits the device: the browser prompt on Android, the Share steps on iPhone. */
export function InstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
    const timer = setTimeout(() => {
      setStandalone(isStandalone);
      setIos(isIos);
    }, 0);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    const onInstalled = () => setEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone) return <p className="text-sm text-moss">You are using the installed app.</p>;

  if (event) {
    return (
      <Button
        size="lg"
        onClick={async () => {
          await event.prompt();
          await event.userChoice.catch(() => null);
          setEvent(null);
        }}
      >
        <Download className="size-5" /> Install app
      </Button>
    );
  }

  if (ios) {
    return (
      <p className="flex flex-wrap items-center gap-1.5 text-[15px]">
        Tap <Share className="inline size-4" aria-label="Share" /> then <SquarePlus className="inline size-4" aria-hidden="true" /> <strong>Add to Home Screen</strong>.
      </p>
    );
  }
  return null;
}
