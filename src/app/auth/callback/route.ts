import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pickLocale, safeNextPath } from "@/lib/auth/redirect";
import { resolveDestination } from "@/lib/auth/destination";
import { getSiteUrl } from "@/lib/auth/site-url";

// Retour de Google (via Supabase) : on échange le code contre une session.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const locale = pickLocale(params.get("locale") ?? request.cookies.get("NEXT_LOCALE")?.value);
  const next = safeNextPath(params.get("next"), locale);
  const code = params.get("code");
  const flowId = params.get("sb_flow_id");
  const site = getSiteUrl();

  // Refus de la personne sur l'écran Google, ou lien incomplet
  if (params.get("error") || !code) {
    return NextResponse.redirect(`${site}/${locale}/connexion?erreur=oauth`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(
    code,
    flowId ? { flowId } : undefined,
  );
  if (error) {
    return NextResponse.redirect(`${site}/${locale}/connexion?erreur=oauth`);
  }

  const destination = await resolveDestination(supabase, locale, next, params.get("role"));
  return NextResponse.redirect(`${site}${destination}`);
}
