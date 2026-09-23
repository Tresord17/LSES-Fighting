import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getSiteUrl } from "@/lib/auth/site-url";
import { createPublicClient } from "@/lib/supabase/public";

// Plan du site pour les moteurs de recherche : pages publiques et fiches
// en ligne, dans les deux langues. Recalculé au plus toutes les heures.
export const revalidate = 3600;

const PAGES = ["", "/disciplines/sambo", "/disciplines/mma", "/athletes", "/coachs", "/actualites"];

function entry(path: string, lastModified?: string): MetadataRoute.Sitemap[number] {
  const site = getSiteUrl();
  const languages = Object.fromEntries(
    routing.locales.map((locale) => [locale, `${site}/${locale}${path}`]),
  );
  return {
    url: `${site}/${routing.defaultLocale}${path}`,
    lastModified: lastModified ? new Date(lastModified) : undefined,
    alternates: { languages },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = PAGES.map((path) => entry(path));
  const supabase = createPublicClient();
  if (!supabase) return entries;

  try {
    const [{ data: athletes }, { data: coaches }] = await Promise.all([
      supabase
        .from("athletes")
        .select("slug, updated_at")
        .eq("status", "approved")
        .not("slug", "is", null),
      supabase
        .from("coaches")
        .select("slug, updated_at")
        .eq("status", "approved")
        .not("slug", "is", null),
    ]);
    for (const row of athletes ?? []) entries.push(entry(`/athletes/${row.slug}`, row.updated_at));
    for (const row of coaches ?? []) entries.push(entry(`/coachs/${row.slug}`, row.updated_at));
  } catch (error) {
    console.error("Plan du site : lecture des fiches impossible", error);
  }
  return entries;
}
