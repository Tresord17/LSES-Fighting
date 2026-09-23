"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { getDbErrorKey } from "@/lib/supabase/errors";
import { fieldErrors, type FieldErrors } from "@/lib/auth/schemas";
import type { Locale } from "@/i18n/routing";
import { athleteProfileSchema, coachProfileSchema, idSchema, palmaresEntrySchema } from "./schemas";

// État renvoyé aux formulaires de profil. Les messages sont des clés de
// traduction (espaces profile.feedback, profile.errors, errors, auth.errors).
export type ProfileFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fields?: FieldErrors;
  photoUrl?: string | null;
  at?: number;
};

const PHOTO_BUCKET = "profile-photos";

function refresh(locale: Locale) {
  revalidatePath(`/${locale}/mon-espace/profil`);
  revalidatePath(`/${locale}/mon-espace`);
}

// Identité de l'appelant, vérifiée côté serveur à chaque action
async function currentAccount() {
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
  return { supabase, userId, role: profile?.role ?? null };
}

const fail = (message: string, fields?: FieldErrors): ProfileFormState => ({
  status: "error",
  message,
  fields,
  at: Date.now(),
});

const done = (message: string, extra: Partial<ProfileFormState> = {}): ProfileFormState => ({
  status: "success",
  message,
  at: Date.now(),
  ...extra,
});

// ---------------------------------------------------------------------------
// Fiche d'athlète : enregistrement du brouillon, puis soumission éventuelle
// ---------------------------------------------------------------------------
export async function saveAthleteProfileAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const parsed = athleteProfileSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fail("fix_fields", fieldErrors(parsed.error));

  const account = await currentAccount();
  if (!account) return fail("not_authenticated");
  if (account.role !== "athlete") return fail("forbidden");
  const { supabase, userId } = account;
  const values = parsed.data;

  const { data: current } = await supabase
    .from("athletes")
    .select("status, publication_consent_at")
    .eq("id", userId)
    .single();
  if (!current) return fail("not_an_athlete");

  // Après publication, l'identité est verrouillée : on ne l'envoie plus.
  const locked = current.status === "approved";
  const consentAt = values.consent
    ? (current.publication_consent_at ?? new Date().toISOString())
    : null;

  const { error } = await supabase
    .from("athletes")
    .update({
      ...(locked
        ? {}
        : {
            last_name: values.last_name,
            first_names: values.first_names,
            sex: values.sex,
            discipline: values.discipline,
          }),
      weight_class: values.weight_class,
      city: values.city,
      coach_id: values.coach_id,
      bio: values.bio,
      practice_since: values.practice_since,
      fights_count: values.fights_count,
      publication_consent_at: consentAt,
    })
    .eq("id", userId);
  if (error) return fail(getDbErrorKey(error));

  if (!locked) {
    const { error: privateError } = await supabase
      .from("athlete_private")
      .update({ birth_date: values.birth_date })
      .eq("athlete_id", userId);
    if (privateError) return fail(getDbErrorKey(privateError));
  }

  if (values.intent === "submit") {
    const { error: submitError } = await supabase.rpc("submit_athlete_profile");
    refresh(values.locale);
    if (submitError) return fail(getDbErrorKey(submitError));
    return done("submitted");
  }

  refresh(values.locale);
  return done("saved");
}

// ---------------------------------------------------------------------------
// Fiche de coach
// ---------------------------------------------------------------------------
export async function saveCoachProfileAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const parsed = coachProfileSchema.safeParse({
    ...Object.fromEntries(formData.entries()),
    disciplines: formData.getAll("disciplines"),
  });
  if (!parsed.success) return fail("fix_fields", fieldErrors(parsed.error));

  const account = await currentAccount();
  if (!account) return fail("not_authenticated");
  const { supabase, userId } = account;
  const values = parsed.data;

  const { data: current } = await supabase
    .from("coaches")
    .select("status, publication_consent_at")
    .eq("id", userId)
    .maybeSingle();
  if (!current) return fail("not_a_coach");

  const locked = current.status === "approved";
  const consentAt = values.consent
    ? (current.publication_consent_at ?? new Date().toISOString())
    : null;

  const { error } = await supabase
    .from("coaches")
    .update({
      ...(locked ? {} : { last_name: values.last_name, first_names: values.first_names }),
      disciplines: values.disciplines,
      city: values.city,
      dojo_name: values.dojo_name,
      experience_years: values.experience_years,
      bio: values.bio,
      publication_consent_at: consentAt,
    })
    .eq("id", userId);
  if (error) return fail(getDbErrorKey(error));

  if (values.intent === "submit") {
    const { error: submitError } = await supabase.rpc("submit_coach_profile");
    refresh(values.locale);
    if (submitError) return fail(getDbErrorKey(submitError));
    return done("submittedCoach");
  }

  refresh(values.locale);
  return done("saved");
}

// ---------------------------------------------------------------------------
// Palmarès : ajout et suppression d'une entrée
// La base rattache automatiquement l'entrée à une demande de vérification.
// ---------------------------------------------------------------------------
export async function addPalmaresEntryAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const parsed = palmaresEntrySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fail("fix_fields", fieldErrors(parsed.error));

  const account = await currentAccount();
  if (!account) return fail("not_authenticated");
  if (account.role !== "athlete") return fail("forbidden");

  const { locale, ...entry } = parsed.data;
  const { error } = await account.supabase
    .from("palmares_entries")
    .insert({ ...entry, athlete_id: account.userId });
  if (error) return fail(getDbErrorKey(error));

  refresh(locale);
  return done("entryAdded");
}

export async function deletePalmaresEntryAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const parsed = idSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fail("unknown");

  const account = await currentAccount();
  if (!account) return fail("not_authenticated");

  const { error } = await account.supabase
    .from("palmares_entries")
    .delete()
    .eq("id", parsed.data.id)
    .eq("athlete_id", account.userId);
  if (error) return fail(getDbErrorKey(error));

  refresh(parsed.data.locale);
  return done("entryDeleted");
}

// ---------------------------------------------------------------------------
// Photo de profil
// Le navigateur réduit l'image et la dépose dans le dossier du compte ;
// le serveur vérifie le chemin, l'enregistre sur la fiche et supprime
// l'ancienne photo.
// ---------------------------------------------------------------------------
export async function setProfilePhotoAction(
  locale: Locale,
  path: string | null,
): Promise<ProfileFormState> {
  const account = await currentAccount();
  if (!account) return fail("not_authenticated");
  const { supabase, userId, role } = account;

  const pattern = new RegExp(`^${userId}/photo-[0-9]{10,16}\\.(webp|jpg)$`);
  if (path !== null && !pattern.test(path)) return fail("invalid_photo_path");

  const table = role === "athlete" ? "athletes" : "coaches";
  const { data: current } = await supabase
    .from(table)
    .select("photo_path")
    .eq("id", userId)
    .maybeSingle();
  if (!current) return fail("forbidden");

  const { error } = await supabase.from(table).update({ photo_path: path }).eq("id", userId);
  if (error) return fail(getDbErrorKey(error));

  if (current.photo_path && current.photo_path !== path) {
    await supabase.storage.from(PHOTO_BUCKET).remove([current.photo_path]);
  }

  let photoUrl: string | null = null;
  if (path) {
    const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, 60 * 60);
    photoUrl = data?.signedUrl ?? null;
  }

  refresh(locale);
  return done(path ? "photoSaved" : "photoRemoved", { photoUrl });
}
