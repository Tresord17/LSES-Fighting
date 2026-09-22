import { type NextRequest, type NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

// Rafraîchit la session Supabase à chaque requête et recopie les cookies
// mis à jour sur la réponse déjà préparée par next-intl.
export async function updateSession(request: NextRequest, response: NextResponse) {
  const env = getSupabaseEnv();
  if (!env) return response;

  const supabase = createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Ne rien intercaler entre la création du client et cet appel.
  await supabase.auth.getClaims();

  return response;
}
