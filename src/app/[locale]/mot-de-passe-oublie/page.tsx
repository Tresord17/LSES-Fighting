import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthIntro } from "@/components/auth/AuthIntro";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetRequestForm } from "@/components/auth/ResetRequestForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.reset");
  return { title: t("eyebrow") };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth.reset");
  return (
    <AuthShell>
      <AuthIntro eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      <ResetRequestForm />
    </AuthShell>
  );
}
