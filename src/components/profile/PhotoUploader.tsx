"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { setProfilePhotoAction } from "@/lib/profile/actions";
import { useErrorText } from "@/components/forms/useErrorText";
import type { Locale } from "@/i18n/routing";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_INPUT_BYTES = 20 * 1024 * 1024; // photo d'origine, avant réduction
const MAX_SIDE = 800;

// Réduction dans le navigateur : 800 px au plus sur le grand côté, WebP
// (ou JPEG si le navigateur ne sait pas encoder le WebP). Réencoder l'image
// supprime au passage ses métadonnées EXIF, dont la position GPS.
async function resizeImage(file: File): Promise<{ blob: Blob; ext: "webp" | "jpg" }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const encode = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  const webp = await encode("image/webp");
  if (webp?.type === "image/webp") return { blob: webp, ext: "webp" };
  const jpeg = await encode("image/jpeg");
  if (!jpeg) throw new Error("encode_failed");
  return { blob: jpeg, ext: "jpg" };
}

export function PhotoUploader({
  userId,
  initialUrl,
}: {
  userId: string;
  initialUrl: string | null;
}) {
  const t = useTranslations("profile");
  const locale = useLocale() as Locale;
  const errorText = useErrorText();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    setSaved(null);
    if (!ACCEPTED.includes(file.type)) return setError("photo_type");
    if (file.size > MAX_INPUT_BYTES) return setError("photo_size");

    setBusy(true);
    try {
      const { blob, ext } = await resizeImage(file);
      const path = `${userId}/photo-${Date.now()}.${ext}`;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(path, blob, { contentType: blob.type, cacheControl: "3600", upsert: false });
      if (uploadError) return setError("photo_upload");

      const result = await setProfilePhotoAction(locale, path);
      if (result.status === "error") {
        await supabase.storage.from("profile-photos").remove([path]);
        return setError(result.message ?? "unknown");
      }
      setUrl(result.photoUrl ?? null);
      setSaved("photoSaved");
    } catch {
      setError("photo_upload");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    setError(null);
    setBusy(true);
    const result = await setProfilePhotoAction(locale, null);
    setBusy(false);
    if (result.status === "error") return setError(result.message ?? "unknown");
    setUrl(null);
    setSaved("photoRemoved");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <div className="relative h-30 w-24 shrink-0 overflow-hidden border border-line hatch">
          {url && (
            // Photo privée servie par URL signée temporaire : next/image n'apporterait rien ici.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={t("photo.alt")} className="h-full w-full object-cover" />
          )}
        </div>
        <div className="flex flex-col items-start gap-2.5">
          <label
            className={`inline-flex h-11 cursor-pointer items-center border border-line-strong px-4 text-sm font-semibold transition-colors hover:border-gold has-focus-visible:outline-2 has-focus-visible:outline-gold ${
              busy ? "pointer-events-none opacity-60" : ""
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED.join(",")}
              className="sr-only"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
              }}
            />
            {busy ? t("photo.uploading") : url ? t("photo.change") : t("photo.choose")}
          </label>
          {url && !busy && (
            <button
              type="button"
              onClick={remove}
              className="text-xs font-semibold text-subtle hover:text-foreground"
            >
              {t("photo.remove")}
            </button>
          )}
        </div>
      </div>
      <p className="text-[11px] leading-normal text-subtle">{t("photo.hint")}</p>
      <div aria-live="polite">
        {error && <p className="text-xs text-blood-ink">{errorText(error)}</p>}
        {saved && (
          <p className="text-xs text-success">{t(`feedback.${saved}` as "feedback.photoSaved")}</p>
        )}
      </div>
    </div>
  );
}
