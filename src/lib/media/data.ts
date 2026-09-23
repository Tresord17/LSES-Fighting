import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Discipline } from "@/lib/profile/options";
import { publicMediaUrl, youtubeId, type MediaKind } from "./options";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type MediaItem = {
  id: string;
  kind: MediaKind;
  titleFr: string;
  titleEn: string | null;
  url: string;
  thumbnailUrl: string | null;
  sizeBytes: number | null;
  durationSeconds: number | null;
  provider: "youtube" | "facebook" | null;
};

// Galerie d'une discipline, dans l'ordre d'affichage public, et espace
// occupé par l'ensemble des fichiers déposés
export async function loadMedia(supabase: Supabase, discipline: Discipline) {
  const env = getSupabaseEnv();
  const [{ data, error }, { data: sizes, error: sizeError }] = await Promise.all([
    supabase
      .from("media")
      .select(
        "id, kind, title_fr, title_en, storage_path, external_url, size_bytes, duration_seconds, position",
      )
      .eq("discipline", discipline)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase.from("media").select("size_bytes").not("storage_path", "is", null),
  ]);
  if (error) throw error;
  if (sizeError) throw sizeError;

  const items: MediaItem[] = (data ?? []).map((row) => {
    const fileUrl =
      row.storage_path && env
        ? publicMediaUrl(env.url, row.storage_path)
        : (row.external_url ?? "");
    const video = youtubeId(row.external_url);
    return {
      id: row.id,
      kind: row.kind,
      titleFr: row.title_fr,
      titleEn: row.title_en,
      url: fileUrl,
      thumbnailUrl:
        row.kind === "image"
          ? fileUrl
          : video
            ? `https://i.ytimg.com/vi/${video}/mqdefault.jpg`
            : null,
      sizeBytes: row.size_bytes,
      durationSeconds: row.duration_seconds,
      provider: row.external_url ? (/youtu/.test(row.external_url) ? "youtube" : "facebook") : null,
    };
  });

  const usedBytes = (sizes ?? []).reduce((sum, row) => sum + (row.size_bytes ?? 0), 0);
  return { items, usedBytes };
}
