"use client";

import { useEffect, useRef, useState, type TouchEvent } from "react";
import { useTranslations } from "next-intl";
import { Thumb } from "@/components/ui/Thumb";

export type GalleryImage = {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
};

// Tant que la galerie n'est pas dépliée, quatre vignettes seulement : la
// dernière annonce le nombre d'images restantes (maquette « +8 »).
const VISIBLE = 4;

// Galerie d'images d'une discipline : vignettes légères, image complète
// chargée seulement à l'agrandissement (fenêtre modale native <dialog>).
export function ImageGallery({ images }: { images: GalleryImage[] }) {
  const t = useTranslations("discipline.gallery");
  const [expanded, setExpanded] = useState(false);
  const [current, setCurrent] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchX = useRef<number | null>(null);

  const hidden = expanded ? 0 : Math.max(0, images.length - VISIBLE);
  const shown = hidden > 0 ? images.slice(0, VISIBLE) : images;
  const image = current === null ? null : images[current];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (current !== null && !dialog.open) dialog.showModal();
    if (current === null && dialog.open) dialog.close();
  }, [current]);

  const step = (delta: number) =>
    setCurrent((index) =>
      index === null ? null : (index + delta + images.length) % images.length,
    );

  function onTouchEnd(event: TouchEvent) {
    const start = touchX.current;
    touchX.current = null;
    if (start === null) return;
    const distance = event.changedTouches[0].clientX - start;
    if (Math.abs(distance) > 50) step(distance < 0 ? 1 : -1);
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-1.5 md:grid-cols-4 md:gap-2">
        {shown.map((item, index) => {
          const isMore = hidden > 0 && index === VISIBLE - 1;
          return (
            <li key={item.id} className="relative aspect-3/2 overflow-hidden hatch">
              <button
                type="button"
                onClick={() => (isMore ? setExpanded(true) : setCurrent(index))}
                aria-label={
                  isMore ? t("more", { count: hidden + 1 }) : t("open", { title: item.title })
                }
                className="group block h-full w-full"
              >
                <Thumb
                  src={item.thumbnailUrl}
                  fallback={item.url}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                />
                {isMore && (
                  <span className="absolute inset-0 flex items-center justify-center bg-background/72 font-display text-2xl font-bold">
                    +{hidden + 1}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label={image?.title}
        onClose={() => setCurrent(null)}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") step(1);
          if (event.key === "ArrowLeft") step(-1);
        }}
        onClick={(event) => {
          // clic sur le fond : fermeture
          if (event.target === event.currentTarget) setCurrent(null);
        }}
        className="m-auto h-dvh max-h-none w-screen max-w-none bg-black/95 p-0 text-white backdrop:bg-black/80"
      >
        {image && current !== null && (
          <div
            className="flex h-full flex-col"
            onTouchStart={(event) => (touchX.current = event.touches[0].clientX)}
            onTouchEnd={onTouchEnd}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <p className="font-mono text-[11px] text-white/70">
                {t("position", { index: current + 1, count: images.length })}
              </p>
              <button
                type="button"
                onClick={() => setCurrent(null)}
                aria-label={t("close")}
                className="flex h-11 w-11 items-center justify-center text-white hover:text-gold"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div
              className="relative flex min-h-0 grow items-center justify-center bg-contain bg-center bg-no-repeat px-2"
              style={{ backgroundImage: `url("${image.thumbnailUrl}")` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={image.id}
                src={image.url}
                alt={image.title}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="flex items-center gap-3 px-4 py-4">
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label={t("previous")}
                  className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/25 text-white hover:border-gold"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M15 5l-7 7 7 7" />
                  </svg>
                </button>
              )}
              <p className="grow text-center text-sm text-white">{image.title}</p>
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label={t("next")}
                  className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/25 text-white hover:border-gold"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
