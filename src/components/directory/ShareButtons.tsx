"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckIcon, CopyIcon, FacebookIcon, WhatsappIcon } from "@/components/ui/icons";

// Partage de la fiche : WhatsApp et Facebook par leurs liens de partage
// officiels (aucun script tiers chargé), et copie de l'adresse.
export function ShareButtons({ url, text }: { url: string; text: string }) {
  const t = useTranslations("directory.profile");
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("failed");
    }
  }

  const button =
    "inline-flex h-12 items-center justify-center gap-2 border border-line-strong text-[13px] font-semibold text-foreground transition hover:border-gold";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${button} grow`}
        >
          <WhatsappIcon className="h-4 w-4" />
          WhatsApp
        </a>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${button} grow`}
        >
          <FacebookIcon className="h-4 w-4" />
          Facebook
        </a>
        <button
          type="button"
          onClick={copy}
          aria-label={t("copy")}
          title={t("copy")}
          className={`${button} w-12 shrink-0`}
        >
          {status === "copied" ? (
            <CheckIcon className="h-4 w-4 text-success" />
          ) : (
            <CopyIcon className="h-4 w-4" />
          )}
        </button>
      </div>
      <p aria-live="polite" className="min-h-4 text-xs text-muted">
        {status === "copied" ? t("copied") : status === "failed" ? t("copyFailed") : ""}
      </p>
    </div>
  );
}
