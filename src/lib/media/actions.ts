"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { getDbErrorKey } from "@/lib/supabase/errors";
import { fieldErrors } from "@/lib/auth/schemas";
import type { Locale } from "@/i18n/routing";
import type { ReviewResult } from "@/lib/review/actions";
import { MEDIA_BUCKET } from "./options";
import {
  mediaFileSchema,
  mediaIdSchema,
  mediaLinkSchema,
  mediaOrderSchema,
  mediaTitlesSchema,
} from "./schemas";

// Médias des pages disciplines. Les règles de la base réservent toute
// écriture au superviseur général (table media et bucket media) ; ces
// actions vérifient en plus les saisies et gardent l'ordre d'affichage.

function refresh(locale: Locale) {
  revalidatePath(`/${locale}/mon-espace/superviseur/medias`);
  revalidatePath("/[locale]/disciplines/[slug]", "page");
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

const fail = (message: string, fields?: Record<string, string | undefined>): ReviewResult => ({
  status: "error",
  message,
  fields,
});

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Un nouveau média s'affiche en tête de galerie
async function topPosition(supabase: Supabase, discipline: "sambo" | "mma") {
  const { data } = await supabase
    .from("media")
    .select("position")
    .eq("discipline", discipline)
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.position ?? 1) - 1;
}

// ---------------------------------------------------------------------------
// Lien YouTube ou Facebook : la voie recommandée (aucun stockage)
// ---------------------------------------------------------------------------
export async function addMediaLinkAction(formData: FormData): Promise<ReviewResult> {
  const parsed = mediaLinkSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fields = fieldErrors(parsed.error);
    return fail("fix_fields", fields);
  }
  const account = await supervisorClient();
  if (!account) return fail("forbidden");
  const { supabase, userId } = account;
  const { locale, discipline, url, title_fr, title_en } = parsed.data;

  const { error } = await supabase.from("media").insert({
    discipline,
    kind: "video_link",
    external_url: url,
    title_fr,
    title_en,
    position: await topPosition(supabase, discipline),
    created_by: userId,
  });
  if (error) return fail(getDbErrorKey(error));
  refresh(locale);
  return { status: "success", message: "linkAdded" };
}

// ---------------------------------------------------------------------------
// Fichier déposé par le navigateur (image réduite ou vidéo MP4)
// ---------------------------------------------------------------------------
export async function addMediaFileAction(input: {
  locale: string;
  discipline: string;
  kind: "image" | "video";
  path: string;
  size: number;
  duration: number | null;
  title_fr: string;
  title_en: string;
}): Promise<ReviewResult> {
  const parsed = mediaFileSchema.safeParse(input);
  const account = await supervisorClient();
  if (!parsed.success) {
    // chemin ou saisie refusés : le fichier déposé ne doit pas rester orphelin
    if (account && typeof input.path === "string" && /^(sambo|mma)\//.test(input.path)) {
      await account.supabase.storage.from(MEDIA_BUCKET).remove([input.path]);
    }
    return fail("fix_fields", fieldErrors(parsed.error));
  }
  if (!account) return fail("forbidden");
  const { supabase, userId } = account;
  const { locale, discipline, kind, path, size, duration, title_fr, title_en } = parsed.data;

  const { error } = await supabase.from("media").insert({
    discipline,
    kind,
    storage_path: path,
    size_bytes: size,
    duration_seconds: duration === null ? null : Math.round(duration),
    title_fr,
    title_en,
    position: await topPosition(supabase, discipline),
    created_by: userId,
  });
  if (error) {
    await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    return fail(getDbErrorKey(error));
  }
  refresh(locale);
  return { status: "success", message: kind === "image" ? "imageAdded" : "videoAdded" };
}

// ---------------------------------------------------------------------------
// Titres, ordre d'affichage, suppression
// ---------------------------------------------------------------------------
export async function updateMediaTitlesAction(formData: FormData): Promise<ReviewResult> {
  const parsed = mediaTitlesSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fail("fix_fields", fieldErrors(parsed.error));
  const account = await supervisorClient();
  if (!account) return fail("forbidden");
  const { locale, id, title_fr, title_en } = parsed.data;

  const { error } = await account.supabase
    .from("media")
    .update({ title_fr, title_en })
    .eq("id", id);
  if (error) return fail(getDbErrorKey(error));
  refresh(locale);
  return { status: "success", message: "titlesSaved" };
}

// Nouvel ordre complet de la galerie : chaque élément reçoit sa place
export async function reorderMediaAction(input: {
  locale: string;
  discipline: string;
  ids: string[];
}): Promise<ReviewResult> {
  const parsed = mediaOrderSchema.safeParse(input);
  if (!parsed.success) return fail("unknown");
  const account = await supervisorClient();
  if (!account) return fail("forbidden");
  const { locale, discipline, ids } = parsed.data;

  const results = await Promise.all(
    ids.map((id, index) =>
      account.supabase
        .from("media")
        .update({ position: index })
        .eq("id", id)
        .eq("discipline", discipline),
    ),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) return fail(getDbErrorKey(failed.error));
  refresh(locale);
  return { status: "success", message: "orderSaved" };
}

export async function deleteMediaAction(formData: FormData): Promise<ReviewResult> {
  const parsed = mediaIdSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fail("unknown");
  const account = await supervisorClient();
  if (!account) return fail("forbidden");
  const { supabase } = account;

  const { data: row } = await supabase
    .from("media")
    .select("storage_path")
    .eq("id", parsed.data.id)
    .maybeSingle();
  const { error } = await supabase.from("media").delete().eq("id", parsed.data.id);
  if (error) return fail(getDbErrorKey(error));
  if (row?.storage_path) await supabase.storage.from(MEDIA_BUCKET).remove([row.storage_path]);

  refresh(parsed.data.locale);
  return { status: "success", message: "mediaDeleted" };
}
