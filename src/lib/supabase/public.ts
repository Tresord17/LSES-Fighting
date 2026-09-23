import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

// Client « visiteur » pour les pages publiques : aucune session, aucun
// cookie. Il lit la base avec les seuls droits du rôle anon, si bien qu'une
// page publique n'affiche jamais que des fiches en ligne, même quand un
// coach ou le superviseur la consulte connecté.
export function createPublicClient() {
  const env = getSupabaseEnv();
  if (!env) return null;
  return createClient<Database>(env.url, env.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
