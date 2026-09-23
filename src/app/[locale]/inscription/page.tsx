import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/auth/session";
import { accountHome, pickLocale } from "@/lib/auth/redirect";
import { AuthIntro } from "@/components/auth/AuthIntro";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignUpForm } from "@/components/auth/SignUpForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signup");
  return { title: t("eyebrow") };
}

export default async function SignUpPage({ params }: PageProps<"/[locale]/inscription">) {
  const locale = pickLocale((await params).locale);
  if (await getSessionUser()) redirect(accountHome(locale));
  const t = await getTranslations("auth.signup");

  return (
    <AuthShell>
      <AuthIntro eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      <SignUpForm />
    </AuthShell>
  );
}
