import type { Database } from "@/lib/supabase/database.types";

// Règles des médias des pages disciplines, partagées par le navigateur
// (contrôles avant envoi) et le serveur (contrôles avant écriture).

export type MediaKind = Database["public"]["Enums"]["media_kind"];
export type MediaFolder = "sambo" | "mma" | "actualites";

export const MEDIA_BUCKET = "media";

// Images : réduites dans le navigateur à 1 600 px en WebP (~200 à 300 Ko),
// pour tenir le budget de 600 Ko par page publique.
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const IMAGE_MAX_INPUT_BYTES = 20 * 1024 * 1024;
export const IMAGE_MAX_SIDE = 1600;

// Vignette rangée à côté de chaque fichier déposé (image réduite, ou image
// extraite d'une vidéo) : les galeries et les listes ne chargent qu'elle,
// quelques dizaines de Ko, et le fichier complet seulement à la demande.
// sambo/1790…-a1b2c3d4e5.webp → sambo/1790…-a1b2c3d4e5.vignette.webp
export const THUMB_MAX_SIDE = 640;
export function thumbPath(path: string) {
  return `${path.replace(/\.[a-z0-9]+$/i, "")}.vignette.webp`;
}

// Vidéos : MP4 uniquement, 50 Mo par fichier (plafond du plan gratuit de
// Supabase, fixé aussi sur le bucket).
export const VIDEO_TYPES = ["video/mp4"];
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

// Espace de stockage du plan gratuit
export const STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024;

// Même règle que la contrainte media_external_url de la base
export const VIDEO_LINK =
  /^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be|facebook\.com|fb\.watch)\/[^\s]*$/;

// Chemin d'un fichier déposé par le site : dossier + horodatage + suffixe
export function storagePathPattern(folder: MediaFolder, exts: string) {
  return new RegExp(`^${folder}/[0-9]{10,16}-[0-9a-f]{10}\\.(${exts})$`);
}

// Identifiant d'une vidéo YouTube (miniature et lecteur intégré)
export function youtubeId(url: string | null | undefined) {
  if (!url) return null;
  const match =
    /youtu\.be\/([\w-]{11})/.exec(url) ??
    /youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)([\w-]{11})/.exec(url);
  return match?.[1] ?? null;
}

export function publicMediaUrl(supabaseUrl: string, path: string) {
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${MEDIA_BUCKET}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export function formatBytes(bytes: number, locale: string) {
  const units = locale === "fr" ? ["o", "Ko", "Mo", "Go"] : ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = value < 10 && unit > 0 ? 1 : 0;
  return `${value.toLocaleString(locale, { maximumFractionDigits: digits })} ${units[unit]}`;
}

export function formatDuration(seconds: number | null) {
  if (seconds === null || seconds === undefined) return null;
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
