"use client";

import { useEffect, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnv } from "@/lib/supabase/env";

// Indique si une session est ouverte, pour adapter l'en-tête (affichage
// seulement : les pages protégées vérifient la session côté serveur).
// Revérifié à chaque changement de page, car la connexion se fait côté serveur.
export function useSignedIn(): boolean {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!getSupabaseEnv()) return;
    const supabase = createClient();
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(Boolean(data.session));
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setSignedIn(Boolean(session));
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [pathname]);

  return signedIn;
}
