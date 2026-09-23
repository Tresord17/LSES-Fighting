import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/session";
import { pickLocale } from "@/lib/auth/redirect";
import { ComingSoon } from "@/components/ui/ComingSoon";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("reviews"), robots: { index: false } };
}

export default async function Page({ params }: PageProps<"/[locale]/mon-espace/demandes">) {
  const locale = pickLocale((await params).locale);
  await requireUser(locale, `/${locale}/mon-espace/demandes`);
  const t = await getTranslations("account");
  return <ComingSoon title={t("reviews")} />;
}
