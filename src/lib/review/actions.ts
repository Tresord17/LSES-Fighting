"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { getDbErrorKey } from "@/lib/supabase/errors";
import { fieldErrors, type FieldErrors } from "@/lib/auth/schemas";
import type { Locale } from "@/i18n/routing";
import { markReviewedSchema, reviewDecisionSchema } from "./schemas";

// Résultat renvoyé aux cartes de la file. Les messages sont des clés de
// traduction : review.done pour un succès, review.errors ou errors sinon.
export type ReviewResult = {
  status: "success" | "error";
  message: string;
  fields?: FieldErrors;
};

function refresh(locale: Locale) {
  revalidatePath(`/${locale}/mon-espace/demandes`);
  revalidatePath(`/${locale}/mon-espace/superviseur`);
  revalidatePath(`/${locale}/mon-espace`);
  // l'accueil (régénéré toutes les cinq minutes) montre aussitôt la fiche publiée
  revalidatePath("/[locale]", "page");
}

async function authenticatedClient() {
  if (!getSupabaseEnv()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ? supabase : null;
}

// ---------------------------------------------------------------------------
// Valider ou refuser une demande (fiche d'athlète ou ajout de palmarès).
// Les droits, l'échéance, l'attestation parentale et l'écriture au journal
// d'audit sont contrôlés par les fonctions SQL : le site ne décide de rien.
// ---------------------------------------------------------------------------
export async function reviewRequestAction(formData: FormData): Promise<ReviewResult> {
  const parsed = reviewDecisionSchema.safeParse({
    ...Object.fromEntries(formData.entries()),
    rejected_entries: formData.getAll("rejected_entries"),
  });
  if (!parsed.success) {
    const fields = fieldErrors(parsed.error);
    return { status: "error", message: fields.reason ?? "fix_fields", fields };
  }

  const supabase = await authenticatedClient();
  if (!supabase) return { status: "error", message: "not_authenticated" };

  const values = parsed.data;
  const approve = values.decision === "approve";
  const { error } =
    values.kind === "athlete_profile"
      ? await supabase.rpc("review_athlete_profile", {
          p_request_id: values.request_id,
          p_approve: approve,
          p_reason: values.reason ?? undefined,
          p_guardian_attested: values.guardian,
          p_rejected_entry_ids: values.rejected_entries,
        })
      : await supabase.rpc("review_palmares", {
          p_request_id: values.request_id,
          p_approve: approve,
          p_reason: values.reason ?? undefined,
          p_rejected_entry_ids: values.rejected_entries,
        });

  refresh(values.locale);
  if (error) return { status: "error", message: getDbErrorKey(error) };

  const suffix = values.kind === "athlete_profile" ? "Profile" : "Palmares";
  return { status: "success", message: `${approve ? "approved" : "rejected"}${suffix}` };
}

// ---------------------------------------------------------------------------
// « Modifiée, à revoir » : le coach confirme avoir relu la fiche en ligne
// ---------------------------------------------------------------------------
export async function markReviewedAction(formData: FormData): Promise<ReviewResult> {
  const parsed = markReviewedSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { status: "error", message: "unknown" };

  const supabase = await authenticatedClient();
  if (!supabase) return { status: "error", message: "not_authenticated" };

  const { error } = await supabase.rpc("mark_athlete_reviewed", {
    p_athlete_id: parsed.data.athlete_id,
  });
  refresh(parsed.data.locale);
  if (error) return { status: "error", message: getDbErrorKey(error) };
  return { status: "success", message: "markedReviewed" };
}
