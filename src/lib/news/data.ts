import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { publicMediaUrl } from "@/lib/media/options";
import type { Database } from "@/lib/supabase/database.types";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type NewsRow = Database["public"]["Tables"]["news"]["Row"];

export type NewsSummary = {
  id: string;
  slug: string;
  titleFr: string;
  status: NewsRow["status"];
  publishedAt: string | null;
  updatedAt: string;
  coverUrl: string | null;
};

export type NewsDraft = {
  id: string | null;
  slug: string | null;
  status: NewsRow["status"];
  publishedAt: string | null;
  titleFr: string;
  titleEn: string;
  excerptFr: string;
  excerptEn: string;
  bodyFr: string;
  bodyEn: string;
  coverPath: string | null;
  coverUrl: string | null;
};

const coverUrl = (path: string | null) => {
  const env = getSupabaseEnv();
  return path && env ? publicMediaUrl(env.url, path) : null;
};

// Toutes les actualités, brouillons compris (lecture réservée au superviseur)
export async function loadNewsList(supabase: Supabase): Promise<NewsSummary[]> {
  const { data, error } = await supabase
    .from("news")
    .select("id, slug, title_fr, status, published_at, updated_at, cover_path")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    titleFr: row.title_fr,
    status: row.status,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    coverUrl: coverUrl(row.cover_path),
  }));
}

export async function loadNewsDraft(supabase: Supabase, id: string): Promise<NewsDraft | null> {
  const { data, error } = await supabase.from("news").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    slug: data.slug,
    status: data.status,
    publishedAt: data.published_at,
    titleFr: data.title_fr,
    titleEn: data.title_en ?? "",
    excerptFr: data.excerpt_fr ?? "",
    excerptEn: data.excerpt_en ?? "",
    bodyFr: data.body_fr ?? "",
    bodyEn: data.body_en ?? "",
    coverPath: data.cover_path,
    coverUrl: coverUrl(data.cover_path),
  };
}

export const EMPTY_DRAFT: NewsDraft = {
  id: null,
  slug: null,
  status: "draft",
  publishedAt: null,
  titleFr: "",
  titleEn: "",
  excerptFr: "",
  excerptEn: "",
  bodyFr: "",
  bodyEn: "",
  coverPath: null,
  coverUrl: null,
};
