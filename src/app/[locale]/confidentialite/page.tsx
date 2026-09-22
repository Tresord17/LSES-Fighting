import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/ui/ComingSoon";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("footer");
  return { title: t("privacy") };
}

export default async function Page() {
  const t = await getTranslations("footer");
  return <ComingSoon title={t("privacy")} />;
}
