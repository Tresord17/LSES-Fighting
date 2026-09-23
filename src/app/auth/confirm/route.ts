import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { accountHome, pickLocale } from "@/lib/auth/redirect";
import { resolveDestination } from "@/lib/auth/destination";
import { getSiteUrl } from "@/lib/auth/site-url";

const OTP_TYPES: EmailOtpType[] = [
  "signup",
  "email",
  "recovery",
  "email_change",
  "invite",
  "magiclink",
];

// Liens reçus par e-mail : confirmation d'adresse et mot de passe oublié.
// Deux formats acceptés : token_hash (modèles d'e-mails du projet, fonctionne
// même si le lien est ouvert sur un autre appareil) ou code (modèles par défaut).
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const code = params.get("code");
  const rawType = params.get("type");
  const type = OTP_TYPES.includes(rawType as EmailOtpType) ? (rawType as EmailOtpType) : null;
  const site = getSiteUrl();
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;

  const supabase = await createClient();
  let error: { code?: string } | null = null;
  let userLocale: string | undefined;

  if (tokenHash && type) {
    const result = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    error = result.error;
    userLocale = result.data.user?.user_metadata?.locale;
  } else if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error;
    userLocale = result.data.user?.user_metadata?.locale;
  } else {
    error = { code: "otp_expired" };
  }

  const locale = pickLocale(userLocale ?? cookieLocale);

  if (error) {
    const reason = error.code === "bad_code_verifier" ? "appareil" : "lien";
    return NextResponse.redirect(`${site}/${locale}/connexion?erreur=${reason}`);
  }

  if (type === "recovery") {
    return NextResponse.redirect(`${site}/${locale}/nouveau-mot-de-passe`);
  }

  const destination = await resolveDestination(
    supabase,
    locale,
    `${accountHome(locale)}?bienvenue=1`,
  );
  return NextResponse.redirect(`${site}${destination}`);
}
