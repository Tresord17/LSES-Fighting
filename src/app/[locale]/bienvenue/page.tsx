import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/session";
import { pickLocale, safeNextPath } from "@/lib/auth/redirect";
import { AuthIntro } from "@/components/auth/AuthIntro";
import { AuthShell } from "@/components/auth/AuthShell";
import { ChooseRoleForm } from "@/components/auth/ChooseRoleForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.welcome");
  return { title: t("eyebrow") };
}

// Choix du rôle pour un compte créé avec Google sans passer par l'inscription
export default async function WelcomePage({
  params,
  searchParams,
}: PageProps<"/[locale]/bienvenue">) {
  const locale = pickLocale((await params).locale);
  const query = await searchParams;
  const next = safeNextPath(typeof query.next === "string" ? query.next : null, locale);
  const user = await requireUser(locale, `/${locale}/bienvenue`);
  if (user.role) redirect(next);

  const t = await getTranslations("auth.welcome");
  return (
    <AuthShell>
      <AuthIntro eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      <ChooseRoleForm next={next} />
    </AuthShell>
  );
}
