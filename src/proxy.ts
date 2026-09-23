import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/proxy";

const handleI18nRouting = createIntlMiddleware(routing);

// Proxy Next.js 16 (ex-middleware) : choix de la langue, puis session Supabase.
// Les routes techniques /auth/* (retours de Google et liens des e-mails) ne
// portent pas de préfixe de langue.
export async function proxy(request: NextRequest) {
  const response = request.nextUrl.pathname.startsWith("/auth/")
    ? NextResponse.next({ request })
    : handleI18nRouting(request);
  return updateSession(request, response);
}

export const config = {
  // Tout sauf l'API, les fichiers internes de Next.js et les fichiers statiques
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
