import "server-only";
import { cache } from "react";
import type { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/database.types";
import { DISCIPLINES, type Discipline } from "@/lib/profile/options";
import { publicMediaUrl, thumbPath, youtubeId, type MediaKind } from "./options";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type MediaRow = Pick<
  Database["public"]["Tables"]["media"]["Row"],
  | "id"
  | "kind"
  | "title_fr"
  | "title_en"
  | "storage_path"
  | "external_url"
  | "size_bytes"
  | "duration_seconds"
>;

export type MediaItem = {
  id: string;
  kind: MediaKind;
  titleFr: string;
  titleEn: string | null;
  // fichier complet (image, vidéo MP4) ou adresse de la vidéo en ligne
  url: string;
  // vignette légère ; fallbackUrl la remplace si elle manque (image déposée
  // avant l'ajout des vignettes)
  thumbnailUrl: string | null;
  fallbackUrl: string | null;
  // lecteur intégré, chargé seulement quand le visiteur lance la lecture
  embedUrl: string | null;
  sizeBytes: number | null;
  durationSeconds: number | null;
  provider: "youtube" | "facebook" | null;
};

const COLUMNS =
  "id, kind, title_fr, title_en, storage_path, external_url, size_bytes, duration_seconds";

function toItem(row: MediaRow): MediaItem {
  const env = getSupabaseEnv();
  const fileUrl = (path: string) => (env ? publicMediaUrl(env.url, path) : "");
  const provider = row.external_url
    ? /youtu/.test(row.external_url)
      ? "youtube"
      : "facebook"
    : null;
  const video = youtubeId(row.external_url);
  const url = row.storage_path ? fileUrl(row.storage_path) : (row.external_url ?? "");

  let thumbnailUrl: string | null = null;
  let embedUrl: string | null = null;
  if (row.storage_path) {
    thumbnailUrl = fileUrl(thumbPath(row.storage_path));
  } else if (video) {
    thumbnailUrl = `https://i.ytimg.com/vi/${video}/hqdefault.jpg`;
    embedUrl = `https://www.youtube-nocookie.com/embed/${video}?autoplay=1&rel=0`;
  } else if (row.external_url) {
    embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
      row.external_url,
    )}&show_text=false&autoplay=true`;
  }

  return {
    id: row.id,
    kind: row.kind,
    titleFr: row.title_fr,
    titleEn: row.title_en,
    url,
    thumbnailUrl,
    fallbackUrl: row.kind === "image" ? url : null,
    embedUrl,
    sizeBytes: row.size_bytes,
    durationSeconds: row.duration_seconds,
    provider,
  };
}

// Galerie d'une discipline, dans l'ordre d'affichage public, et espace
// occupé par l'ensemble des fichiers déposés (espace superviseur)
export async function loadMedia(supabase: Supabase, discipline: Discipline) {
  const [{ data, error }, { data: sizes, error: sizeError }] = await Promise.all([
    supabase
      .from("media")
      .select(COLUMNS)
      .eq("discipline", discipline)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase.from("media").select("size_bytes").not("storage_path", "is", null),
  ]);
  if (error) throw error;
  if (sizeError) throw sizeError;

  const usedBytes = (sizes ?? []).reduce((sum, row) => sum + (row.size_bytes ?? 0), 0);
  return { items: (data ?? []).map(toItem), usedBytes };
}

// Galerie publique, lue par le client « visiteur »
export const loadGallery = cache(async (discipline: Discipline): Promise<MediaItem[]> => {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("media")
    .select(COLUMNS)
    .eq("discipline", discipline)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toItem);
});

// Première image de chaque galerie, pour illustrer les cartes de l'accueil
export async function loadDisciplineCovers(): Promise<Partial<Record<Discipline, MediaItem>>> {
  const supabase = createPublicClient();
  if (!supabase) return {};
  const { data, error } = await supabase
    .from("media")
    .select(`discipline, ${COLUMNS}`)
    .eq("kind", "image")
    .order("position", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  const covers: Partial<Record<Discipline, MediaItem>> = {};
  for (const discipline of DISCIPLINES) {
    const row = (data ?? []).find((item) => item.discipline === discipline);
    if (row) covers[discipline] = toItem(row);
  }
  return covers;
}
