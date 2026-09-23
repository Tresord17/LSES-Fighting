import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/auth/session";
import { pickLocale } from "@/lib/auth/redirect";
import { AuthIntro } from "@/components/auth/AuthIntro";
import { AuthShell } from "@/components/auth/AuthShell";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.newPassword");
  return { title: t("eyebrow") };
}

// Accessible uniquement avec la session ouverte par le lien « mot de passe oublié »
export default async function NewPasswordPage({
  params,
}: PageProps<"/[locale]/nouveau-mot-de-passe">) {
  const locale = pickLocale((await params).locale);
  if (!(await getSessionUser())) redirect(`/${locale}/connexion?erreur=lien`);
  const t = await getTranslations("auth.newPassword");

  return (
    <AuthShell>
      <AuthIntro eyebrow={t("eyebrow")} title={t("title")} />
      <NewPasswordForm />
    </AuthShell>
  );
}
