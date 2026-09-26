import "server-only";
import { cache } from "react";
import type { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";
import { publicMediaUrl, thumbPath } from "@/lib/media/options";
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
  coverThumbUrl: string | null;
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
const coverThumbUrl = (path: string | null) => coverUrl(path && thumbPath(path));

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
    coverThumbUrl: coverThumbUrl(row.cover_path),
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

// ---------------------------------------------------------------------------
// Pages publiques (client « visiteur » : actualités publiées seulement)
// ---------------------------------------------------------------------------
export type PublicNews = {
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: string;
  updatedAt: string;
  coverUrl: string | null;
  coverThumbUrl: string | null;
  // vrai quand la version anglaise manque et que le français la remplace
  fallback: boolean;
};

export type PublicArticle = PublicNews & {
  body: string[];
  // langue réelle du texte (anglais sans texte rédigé : texte français)
  bodyLocale: "fr" | "en";
};

type PublicRow = Pick<
  NewsRow,
  | "slug"
  | "title_fr"
  | "title_en"
  | "excerpt_fr"
  | "excerpt_en"
  | "published_at"
  | "updated_at"
  | "cover_path"
>;

const SUMMARY =
  "slug, title_fr, title_en, excerpt_fr, excerpt_en, published_at, updated_at, cover_path";

// Version anglaise si son titre est rédigé, sinon version française entière
function localized(row: PublicRow, locale: string): PublicNews {
  const english = locale === "en" && Boolean(row.title_en);
  return {
    slug: row.slug,
    title: english ? row.title_en! : row.title_fr,
    excerpt: english ? row.excerpt_en : row.excerpt_fr,
    publishedAt: row.published_at ?? row.updated_at,
    updatedAt: row.updated_at,
    coverUrl: coverUrl(row.cover_path),
    coverThumbUrl: coverThumbUrl(row.cover_path),
    fallback: locale === "en" && !english,
  };
}

// Paragraphes séparés par une ligne vide ; retours simples conservés
export function paragraphs(text: string | null) {
  return (text ?? "")
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export async function latestNews(locale: string, limit: number): Promise<PublicNews[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("news")
    .select(SUMMARY)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => localized(row, locale));
}

export const getArticle = cache(
  async (slug: string, locale: string): Promise<PublicArticle | null> => {
    const supabase = createPublicClient();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("news")
      .select(`${SUMMARY}, body_fr, body_en`)
      .eq("status", "published")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const article = localized(data, locale);
    const english = locale === "en" && !article.fallback && Boolean(data.body_en?.trim());
    return {
      ...article,
      body: paragraphs(english ? data.body_en : data.body_fr),
      bodyLocale: english ? "en" : "fr",
    };
  },
);
