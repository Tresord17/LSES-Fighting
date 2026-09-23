"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { ACCOUNT_ACTION, accountStage, type AccountStage } from "@/lib/account/stage";

// Une seule lecture pour tous les boutons d'une même page (l'accueil en a deux)
let shared: { userId: string; at: number; stage: Promise<AccountStage> } | null = null;

async function readStage(): Promise<AccountStage> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return "guest";
  if (shared?.userId === userId && Date.now() - shared.at < 3000) return shared.stage;

  // Rôle et fiche en une requête, sous la RLS : chacun ne lit que sa ligne.
  // Comme « Mon espace », un athlète promu superviseur est jugé sur sa fiche
  // de coach et non sur son ancienne fiche d'athlète.
  const stage = Promise.resolve(
    supabase
      .from("profiles")
      .select("role, athletes!athletes_id_fkey(status), coaches!coaches_id_fkey(status)")
      .eq("id", userId)
      .maybeSingle(),
  ).then(({ data: row, error }): AccountStage => {
    if (error || !row) return "member";
    const card = row.role === "athlete" ? row.athletes : row.coaches;
    return accountStage(row.role, card?.status ?? null);
  });
  shared = { userId, at: Date.now(), stage };
  return stage;
}

// Étape du compte, pour l'affichage seulement : null tant qu'elle n'est pas
// connue, ce qui laisse la page statique montrer la version « visiteur ».
export function useAccountStage(): AccountStage | null {
  const [stage, setStage] = useState<AccountStage | null>(null);

  useEffect(() => {
    if (!getSupabaseEnv()) return;
    let active = true;
    const refresh = () =>
      readStage().then(
        (next) => active && setStage(next),
        () => active && setStage(null),
      );
    refresh();
    const { data } = createClient().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") refresh();
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return stage;
}

// Destination et libellé du bouton de compte, ou null pour un visiteur
export function useAccountAction() {
  const stage = useAccountStage();
  return stage && stage !== "guest" ? { stage, ...ACCOUNT_ACTION[stage] } : null;
}
