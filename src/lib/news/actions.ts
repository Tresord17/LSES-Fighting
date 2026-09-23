"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { getDbErrorKey } from "@/lib/supabase/errors";
import { fieldErrors, type FieldErrors } from "@/lib/auth/schemas";
import type { Locale } from "@/i18n/routing";
import { MEDIA_BUCKET } from "@/lib/media/options";
import { newsIdSchema, newsSchema, slugify } from "./schemas";

// Actualités : rédaction, publication, retrait et suppression, réservées
// au superviseur général par les règles de la base. La publication est
// datée et inscrite au journal par un déclencheur SQL.

export type NewsFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fields?: FieldErrors;
  at?: number;
};

function refresh(locale: Locale) {
  revalidatePath(`/${locale}/mon-espace/superviseur/actualites`, "layout");
  revalidatePath("/[locale]/actualites", "layout");
  revalidatePath("/[locale]", "page");
}

async function supervisorClient() {
  if (!getSupabaseEnv()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return profile?.role === "superviseur" ? { supabase, userId } : null;
}

const fail = (message: string, fields?: FieldErrors): NewsFormState => ({
  status: "error",
  message,
  fields,
  at: Date.now(),
});

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Adresse libre : « titre », sinon « titre-2 », « titre-3 »…
async function freeSlug(supabase: Supabase, title: string, id: string | null) {
  const base = slugify(title) || "actualite";
  const { data } = await supabase.from("news").select("id, slug").like("slug", `${base}%`);
  const taken = new Set((data ?? []).filter((row) => row.id !== id).map((row) => row.slug));
  let candidate = base;
  for (let i = 2; taken.has(candidate); i += 1) candidate = `${base}-${i}`;
  return candidate;
}

export async function saveNewsAction(
  _prev: NewsFormState,
  formData: FormData,
): Promise<NewsFormState> {
  const parsed = newsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fail("fix_fields", fieldErrors(parsed.error));
  const account = await supervisorClient();
  if (!account) return fail("forbidden");
  const { supabase, userId } = account;
  const { locale, id, intent, cover_path, ...texts } = parsed.data;

  const { data: current } = id
    ? await supabase
        .from("news")
        .select("slug, status, published_at, cover_path")
        .eq("id", id)
        .maybeSingle()
    : { data: null };
  if (id && !current) return fail("news_not_found");

  // L'adresse suit le titre tant que l'article n'a jamais été publié,
  // puis ne change plus pour ne pas casser les liens partagés
  const slug = current?.published_at ? current.slug : await freeSlug(supabase, texts.title_fr, id);
  const status =
    intent === "publish"
      ? "published"
      : intent === "unpublish"
        ? "draft"
        : (current?.status ?? "draft");

  const row = { ...texts, cover_path, slug, status } as const;
  let savedId = id;
  if (id) {
    const { error } = await supabase.from("news").update(row).eq("id", id);
    if (error) return fail(getDbErrorKey(error));
  } else {
    const { data, error } = await supabase
      .from("news")
      .insert({ ...row, created_by: userId })
      .select("id")
      .single();
    if (error) return fail(getDbErrorKey(error));
    savedId = data.id;
  }

  if (current?.cover_path && current.cover_path !== cover_path) {
    await supabase.storage.from(MEDIA_BUCKET).remove([current.cover_path]);
  }
  refresh(locale);

  const message =
    intent === "publish" ? "published" : intent === "unpublish" ? "unpublished" : "saved";
  if (!id) redirect(`/${locale}/mon-espace/superviseur/actualites/${savedId}?etat=${message}`);
  return { status: "success", message, at: Date.now() };
}

export async function deleteNewsAction(formData: FormData) {
  const parsed = newsIdSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;
  const account = await supervisorClient();
  if (!account) return;
  const { supabase } = account;

  const { data: row } = await supabase
    .from("news")
    .select("cover_path")
    .eq("id", parsed.data.id)
    .maybeSingle();
  const { error } = await supabase.from("news").delete().eq("id", parsed.data.id);
  if (!error && row?.cover_path) await supabase.storage.from(MEDIA_BUCKET).remove([row.cover_path]);

  refresh(parsed.data.locale);
  redirect(
    `/${parsed.data.locale}/mon-espace/superviseur/actualites?etat=${error ? "erreur" : "supprimee"}`,
  );
}
