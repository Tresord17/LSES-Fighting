import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { loadNotifications } from "@/lib/notifications/data";

// Éléments à traiter pour la cloche de l'en-tête. Réponse propre au compte
// connecté, jamais mise en cache. Seuls le superviseur général et les coachs
// référencés ont une cloche ; les autres comptes reçoivent { enabled: false }.

const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  const user = await getSessionUser();
  if (!user || (user.role !== "coach" && user.role !== "superviseur")) {
    return NextResponse.json({ enabled: false }, { headers });
  }

  const supabase = await createClient();
  const isSuperviseur = user.role === "superviseur";
  if (!isSuperviseur) {
    const { data: coach } = await supabase
      .from("coaches")
      .select("status")
      .eq("id", user.id)
      .maybeSingle();
    if (coach?.status !== "approved") return NextResponse.json({ enabled: false }, { headers });
  }

  try {
    const notifications = await loadNotifications(supabase, { id: user.id, isSuperviseur });
    return NextResponse.json({ enabled: true, userId: user.id, ...notifications }, { headers });
  } catch (error) {
    console.error("Notifications : lecture impossible", error);
    return NextResponse.json({ enabled: true, error: true }, { status: 500, headers });
  }
}
