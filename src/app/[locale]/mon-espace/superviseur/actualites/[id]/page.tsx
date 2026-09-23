import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { loadNewsDraft } from "@/lib/news/data";
import { NewsEditor } from "@/components/supervisor/NewsEditor";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("supervisor.news");
  return { title: t("editorEdit"), robots: { index: false } };
}

export default async function EditNewsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/mon-espace/superviseur/actualites/[id]">) {
  const user = await getSessionUser();
  if (user?.role !== "superviseur") return null;

  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const draft = await loadNewsDraft(await createClient(), id);
  if (!draft) notFound();
  const state = (await searchParams).etat;

  return (
    <NewsEditor
      key={draft.id}
      draft={draft}
      initialNotice={typeof state === "string" ? state : null}
    />
  );
}
