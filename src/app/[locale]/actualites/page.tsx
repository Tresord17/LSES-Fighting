import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { pickLocale } from "@/lib/auth/redirect";
import { latestNews } from "@/lib/news/data";
import { DirectoryHeader } from "@/components/directory/DirectoryHeader";
import { FeaturedNews, NewsRow } from "@/components/news/NewsItems";

// Régénérée au plus toutes les cinq minutes, et aussitôt après chaque
// publication, retrait ou suppression (lib/news/actions)
export const revalidate = 300;

// Les actualités restent peu nombreuses : les 60 dernières, sans pagination
const LIMIT = 60;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/actualites">): Promise<Metadata> {
  const locale = pickLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "news" });
  return {
    title: t("title"),
    description: t("intro"),
    alternates: {
      canonical: `/${locale}/actualites`,
      languages: { fr: "/fr/actualites", en: "/en/actualites" },
    },
  };
}

export default async function NewsPage({ params }: PageProps<"/[locale]/actualites">) {
  const locale = pickLocale((await params).locale);
  const t = await getTranslations("news");
  const [featured, ...others] = await latestNews(locale, LIMIT);

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-7 px-4 pt-8 pb-14 md:gap-10 md:pt-14">
      <DirectoryHeader eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} />

      {!featured ? (
        <p className="border border-line bg-surface px-4 py-5 text-sm text-muted">{t("empty")}</p>
      ) : (
        <>
          <FeaturedNews item={featured} />
          {others.length > 0 && (
            <ul className="flex flex-col gap-px bg-line md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-2 md:bg-transparent">
              {others.map((item) => (
                <NewsRow key={item.slug} item={item} excerpt />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
