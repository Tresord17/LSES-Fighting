import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

// Client Supabase pour les composants exécutés dans le navigateur ("use client").
export function createClient() {
  const env = getSupabaseEnv();
  if (!env) throw new Error("Variables Supabase absentes : complétez .env.local");
  return createBrowserClient<Database>(env.url, env.key);
}
