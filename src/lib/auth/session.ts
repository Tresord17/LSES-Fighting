import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/database.types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export type SessionUser = {
  id: string;
  email: string | null;
  role: AppRole | null;
  // prénom fourni par Google (ou nom complet réduit au premier mot),
  // utilisé quand la fiche ne donne pas encore de prénom
  firstName: string | null;
};

// Les métadonnées d'un compte Google contiennent le nom affiché par
// Google : « given_name » quand il existe, sinon « full_name » ou « name ».
function firstNameFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const record = metadata as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const given = text(record.given_name);
  if (given) return given.slice(0, 60);
  const full = text(record.full_name) || text(record.name);
  return full ? full.split(/\s+/)[0].slice(0, 60) : null;
}

// Utilisateur courant, vérifié côté serveur (signature du jeton contrôlée
// par getClaims). Mis en cache le temps d'une requête.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!getSupabaseEnv()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.claims.sub)
    .maybeSingle();

  return {
    id: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
    role: profile?.role ?? null,
    firstName: firstNameFromMetadata(data.claims.user_metadata),
  };
});

// À appeler en tête des pages réservées aux comptes connectés.
export async function requireUser(locale: Locale, currentPath: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/${locale}/connexion?next=${encodeURIComponent(currentPath)}`);
  }
  return user;
}
