import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/auth/session";
import { EMPTY_DRAFT } from "@/lib/news/data";
import { NewsEditor } from "@/components/supervisor/NewsEditor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("supervisor.news");
  return { title: t("editorNew"), robots: { index: false } };
}

export default async function NewNewsPage() {
  const user = await getSessionUser();
  if (user?.role !== "superviseur") return null;
  return <NewsEditor draft={EMPTY_DRAFT} />;
}
