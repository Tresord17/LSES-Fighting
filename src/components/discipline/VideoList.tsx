"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Thumb } from "@/components/ui/Thumb";

export type GalleryVideo = {
  id: string;
  title: string;
  // fichier MP4 déposé, ou lecteur YouTube / Facebook intégré
  fileUrl: string | null;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  duration: string | null;
  provider: "youtube" | "facebook" | null;
};

const VISIBLE = 4;

// Le lecteur reçoit le focus à son apparition (fonction stable : une seule fois)
const focusOnMount = (element: HTMLElement | null) => element?.focus();

// Vidéos d'une discipline. Rien n'est chargé du lecteur avant le clic
// (exigence BNF-01) : seule l'affiche, quelques dizaines de Ko, s'affiche.
// Une seule vidéo joue à la fois.
export function VideoList({ videos }: { videos: GalleryVideo[] }) {
  const t = useTranslations("discipline.gallery");
  const [playing, setPlaying] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? videos : videos.slice(0, VISIBLE);
  const rest = videos.length - shown.length;

  return (
    <div className="flex flex-col gap-2.5">
      <ul className="grid gap-2.5 md:grid-cols-2">
        {shown.map((video) => (
          <li key={video.id} className="relative aspect-video overflow-hidden bg-black">
            {playing === video.id ? (
              video.fileUrl ? (
                <video
                  src={video.fileUrl}
                  poster={video.thumbnailUrl ?? undefined}
                  controls
                  autoPlay
                  playsInline
                  preload="none"
                  ref={focusOnMount}
                  className="h-full w-full"
                />
              ) : (
                <iframe
                  src={video.embedUrl ?? undefined}
                  title={video.title}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  ref={focusOnMount}
                  className="h-full w-full border-0"
                />
              )
            ) : (
              <button
                type="button"
                onClick={() => setPlaying(video.id)}
                aria-label={t("play", { title: video.title })}
                className="group relative flex h-full w-full items-center justify-center hatch"
              >
                {video.thumbnailUrl && (
                  <Thumb
                    src={video.thumbnailUrl}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-black/75 to-transparent"
                />
                <span className="relative flex h-14 w-14 items-center justify-center bg-gold transition group-hover:brightness-110">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-on-gold">
                    <path d="M8 5l12 7-12 7z" />
                  </svg>
                </span>
                <span className="absolute right-3 bottom-2.5 left-3 truncate text-left font-mono text-[10px] tracking-[0.1em] text-white/85 uppercase">
                  {[video.title, video.duration].filter(Boolean).join(" · ")}
                </span>
              </button>
            )}
          </li>
        ))}
      </ul>
      {rest > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="h-12 border border-line-strong text-sm font-semibold hover:border-gold"
        >
          {t("moreVideos", { count: rest })}
        </button>
      )}
    </div>
  );
}
