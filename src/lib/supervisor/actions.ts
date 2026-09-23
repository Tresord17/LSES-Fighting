"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { getDbErrorKey } from "@/lib/supabase/errors";
import { fieldErrors } from "@/lib/auth/schemas";
import type { Locale } from "@/i18n/routing";
import type { ReviewResult } from "@/lib/review/actions";
import { coachDecisionSchema, withdrawSchema } from "./schemas";

// Actions du superviseur général. Les fonctions SQL vérifient elles-mêmes
// que l'appelant est bien superviseur et écrivent au journal d'audit.

function refresh(locale: Locale) {
  revalidatePath(`/${locale}/mon-espace/superviseur`, "layout");
  revalidatePath(`/${locale}/mon-espace`);
  // l'accueil (régénéré toutes les cinq minutes) reflète aussitôt la décision
  revalidatePath("/[locale]", "page");
}

async function authenticatedClient() {
  if (!getSupabaseEnv()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ? supabase : null;
}

// Valider ou refuser un compte de coach
export async function reviewCoachAction(formData: FormData): Promise<ReviewResult> {
  const parsed = coachDecisionSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fields = fieldErrors(parsed.error);
    return { status: "error", message: fields.reason ?? "unknown", fields };
  }

  const supabase = await authenticatedClient();
  if (!supabase) return { status: "error", message: "not_authenticated" };

  const { locale, request_id, decision, reason } = parsed.data;
  const { error } = await supabase.rpc("review_coach_account", {
    p_request_id: request_id,
    p_approve: decision === "approve",
    p_reason: reason ?? undefined,
  });
  refresh(locale);
  if (error) return { status: "error", message: getDbErrorKey(error) };
  return { status: "success", message: decision === "approve" ? "approvedCoach" : "rejectedCoach" };
}

// Retirer une fiche du site (athlète ou coach), motif obligatoire
export async function withdrawProfileAction(formData: FormData): Promise<ReviewResult> {
  const parsed = withdrawSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fields = fieldErrors(parsed.error);
    return { status: "error", message: fields.reason ?? "unknown", fields };
  }

  const supabase = await authenticatedClient();
  if (!supabase) return { status: "error", message: "not_authenticated" };

  const { locale, profile_id, reason } = parsed.data;
  const { error } = await supabase.rpc("withdraw_profile", {
    p_profile_id: profile_id,
    p_reason: reason!,
  });
  refresh(locale);
  if (error) return { status: "error", message: getDbErrorKey(error) };
  return { status: "success", message: "withdrawn" };
}
