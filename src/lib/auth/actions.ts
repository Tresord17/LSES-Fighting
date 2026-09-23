"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { getDbErrorKey } from "@/lib/supabase/errors";
import { getAuthErrorKey } from "./errors";
import { accountHome, safeNextPath } from "./redirect";
import {
  chooseRoleSchema,
  fieldErrors,
  googleSchema,
  localeOnlySchema,
  newPasswordSchema,
  resetRequestSchema,
  signInSchema,
  signUpSchema,
  type FieldErrors,
} from "./schemas";
import { getSiteUrl } from "./site-url";

// État renvoyé aux formulaires (useActionState). Les textes sont des clés
// de traduction : le composant client les affiche dans la bonne langue.
export type FormState = {
  status: "idle" | "error" | "success";
  error?: string;
  fields?: FieldErrors;
  email?: string;
};

const NOT_CONFIGURED: FormState = { status: "error", error: "not_configured" };

function values(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

// ---------------------------------------------------------------------------
// Inscription par adresse électronique
// ---------------------------------------------------------------------------
export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse(values(formData));
  if (!parsed.success) {
    return {
      status: "error",
      fields: fieldErrors(parsed.error),
      email: String(formData.get("email") ?? ""),
    };
  }
  if (!getSupabaseEnv()) return NOT_CONFIGURED;

  const { email, password, role, locale } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/confirm`,
      // lus par la base à la création du compte (rôle) et par les e-mails (langue)
      data: { role, locale, terms_accepted_at: new Date().toISOString() },
    },
  });

  if (error) return { status: "error", error: getAuthErrorKey(error), email };

  // Confirmation d'adresse désactivée : la session est ouverte immédiatement
  if (data.session) redirect(accountHome(locale));

  // Même réponse que l'adresse soit nouvelle ou déjà inscrite : on ne révèle
  // pas l'existence d'un compte.
  return { status: "success", email };
}

// ---------------------------------------------------------------------------
// Connexion par adresse électronique
// ---------------------------------------------------------------------------
export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(values(formData));
  if (!parsed.success) {
    return {
      status: "error",
      fields: fieldErrors(parsed.error),
      email: String(formData.get("email") ?? ""),
    };
  }
  if (!getSupabaseEnv()) return NOT_CONFIGURED;

  const { email, password, locale, next } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { status: "error", error: getAuthErrorKey(error), email };

  redirect(safeNextPath(next, locale));
}

// ---------------------------------------------------------------------------
// Connexion ou inscription avec Google
// ---------------------------------------------------------------------------
export async function signInWithGoogleAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!getSupabaseEnv()) return NOT_CONFIGURED;
  const { locale, role, next } = googleSchema.parse(values(formData));

  const callback = new URL(`${getSiteUrl()}/auth/callback`);
  callback.searchParams.set("locale", locale);
  callback.searchParams.set("next", safeNextPath(next, locale));
  if (role) callback.searchParams.set("role", role);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callback.toString(),
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) return { status: "error", error: getAuthErrorKey(error) };

  redirect(data.url);
}

// ---------------------------------------------------------------------------
// Mot de passe oublié
// ---------------------------------------------------------------------------
export async function requestPasswordResetAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = resetRequestSchema.safeParse(values(formData));
  if (!parsed.success) return { status: "error", fields: fieldErrors(parsed.error) };
  if (!getSupabaseEnv()) return NOT_CONFIGURED;

  const { email } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/confirm?type=recovery`,
  });

  // Seule la limite d'envoi est signalée ; pour le reste, même réponse,
  // que l'adresse corresponde à un compte ou non.
  const key = getAuthErrorKey(error);
  if (error && (key === "rate_limited" || key === "email_not_authorized")) {
    return { status: "error", error: key };
  }
  return { status: "success", email };
}

// ---------------------------------------------------------------------------
// Nouveau mot de passe (après le lien reçu par e-mail)
// ---------------------------------------------------------------------------
export async function updatePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = newPasswordSchema.safeParse(values(formData));
  if (!parsed.success) return { status: "error", fields: fieldErrors(parsed.error) };
  if (!getSupabaseEnv()) return NOT_CONFIGURED;

  const { password, locale } = parsed.data;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return { status: "error", error: "session_expired" };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { status: "error", error: getAuthErrorKey(error) };

  redirect(`${accountHome(locale)}?mot-de-passe=modifie`);
}

// ---------------------------------------------------------------------------
// Choix du rôle (comptes créés avec Google depuis la page de connexion)
// ---------------------------------------------------------------------------
export async function chooseRoleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = chooseRoleSchema.safeParse(values(formData));
  if (!parsed.success) return { status: "error", fields: fieldErrors(parsed.error) };
  if (!getSupabaseEnv()) return NOT_CONFIGURED;

  const { role, locale, next } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("choose_role", { p_role: role });
  if (error) return { status: "error", error: getDbErrorKey(error) };

  redirect(safeNextPath(next, locale));
}

// ---------------------------------------------------------------------------
// Déconnexion
// ---------------------------------------------------------------------------
export async function signOutAction(formData: FormData): Promise<void> {
  const { locale } = localeOnlySchema.parse(values(formData));
  if (getSupabaseEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect(`/${locale}`);
}
