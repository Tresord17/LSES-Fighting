import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/auth/session";
import { pickLocale, safeNextPath } from "@/lib/auth/redirect";
import { AuthIntro } from "@/components/auth/AuthIntro";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

const LINK_ERRORS = ["oauth", "lien", "appareil"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.login");
  return { title: t("eyebrow") };
}

export default async function LoginPage({
  params,
  searchParams,
}: PageProps<"/[locale]/connexion">) {
  const locale = pickLocale((await params).locale);
  const query = await searchParams;
  const next = typeof query.next === "string" ? safeNextPath(query.next, locale) : undefined;
  if (await getSessionUser()) redirect(next ?? safeNextPath(null, locale));

  const t = await getTranslations("auth");
  const errorParam = LINK_ERRORS.find((key) => key === query.erreur);

  return (
    <AuthShell>
      <AuthIntro eyebrow={t("login.eyebrow")} title={t("login.title")} lead={t("login.lead")} />
      <LoginForm next={next} linkError={errorParam ? t(`linkErrors.${errorParam}`) : undefined} />
    </AuthShell>
  );
}
