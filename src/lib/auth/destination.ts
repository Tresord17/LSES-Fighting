import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Locale } from "@/i18n/routing";
import type { Database } from "@/lib/supabase/database.types";

// Où envoyer une personne qui vient de se connecter.
// Si son rôle n'est pas encore défini (inscription avec Google), on applique
// celui choisi sur la page d'inscription, ou on lui demande de le choisir.
export async function resolveDestination(
  supabase: SupabaseClient<Database>,
  locale: Locale,
  next: string,
  requestedRole?: string | null,
): Promise<string> {
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return `/${locale}/connexion`;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.role) return next;

  if (requestedRole === "athlete" || requestedRole === "coach") {
    const { error } = await supabase.rpc("choose_role", { p_role: requestedRole });
    if (!error) return next;
  }
  return `/${locale}/bienvenue?next=${encodeURIComponent(next)}`;
}
