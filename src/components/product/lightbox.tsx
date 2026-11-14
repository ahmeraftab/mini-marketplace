"use client";

import Lightbox from "yet-another-react-lightbox";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";

export type LightboxSlide = { src: string; alt: string; width: number; height: number };

/** Loaded on demand (next/dynamic) the first time someone enlarges a photo. */
export default function ProductLightbox({
  slides,
  index,
  open,
  onClose,
}: {
  slides: LightboxSlide[];
  index: number;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Lightbox
      open={open}
      close={onClose}
      index={index}
      slides={slides}
      plugins={[Zoom, Thumbnails, Counter]}
      carousel={{ finite: false, preload: 2 }}
      zoom={{ maxZoomPixelRatio: 2.5, scrollToZoom: true }}
      thumbnails={{ position: "bottom", width: 96, height: 72, border: 0, gap: 8, padding: 0 }}
      animation={{ fade: 250, swipe: 400 }}
      styles={{
        container: { backgroundColor: "rgb(27 26 23 / 0.94)" },
      }}
      labels={{ Close: "Close", Next: "Next photo", Previous: "Previous photo" }}
    />
  );
}
