import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

// Client Supabase pour les Server Components, Server Actions et Route Handlers.
// Pour vérifier l'identité côté serveur, utiliser supabase.auth.getClaims(),
// jamais getSession() seul.
export async function createClient() {
  const env = getSupabaseEnv();
  if (!env) throw new Error("Variables Supabase absentes : complétez .env.local");

  const cookieStore = await cookies();

  return createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Appelé depuis un Server Component : sans effet, le proxy
          // se charge déjà de rafraîchir la session.
        }
      },
    },
  });
}
