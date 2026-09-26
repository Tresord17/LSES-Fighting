import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { pickLocale } from "@/lib/auth/redirect";
import { getSiteUrl } from "@/lib/auth/site-url";
import { getArticle, latestNews } from "@/lib/news/data";
import { NewsDate, NewsRow } from "@/components/news/NewsItems";
import { ShareButtons } from "@/components/directory/ShareButtons";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Thumb } from "@/components/ui/Thumb";

// Articles générés à la première visite puis gardés en cache ; une
// publication, un retrait ou une suppression les régénère aussitôt.
export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

async function load(slug: string, locale: string) {
  return slug.length <= 100 && SLUG.test(slug) ? getArticle(slug, locale) : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/actualites/[slug]">): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = pickLocale(rawLocale);
  const article = await load(slug, locale);
  if (!article) return {};
  const description = (article.excerpt ?? article.body[0] ?? "").slice(0, 200) || undefined;
  const path = `/actualites/${slug}`;
  return {
    title: article.title,
    description,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: { fr: `/fr${path}`, en: `/en${path}` },
    },
    openGraph: {
      type: "article",
      title: article.title,
      description,
      url: `/${locale}${path}`,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      images: article.coverUrl ? [{ url: article.coverUrl, alt: article.title }] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: PageProps<"/[locale]/actualites/[slug]">) {
  const { locale: rawLocale, slug } = await params;
  const locale = pickLocale(rawLocale);
  const article = await load(slug, locale);
  if (!article) notFound();

  const t = await getTranslations("news");
  const others = (await latestNews(locale, 4)).filter((item) => item.slug !== slug).slice(0, 3);
  const textLang = article.fallback ? "fr" : undefined;

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pt-6 pb-14 md:gap-8 md:pt-12">
      <Link href="/actualites" className="text-xs font-semibold text-subtle hover:text-foreground">
        ← {t("back")}
      </Link>

      <header className="flex flex-col gap-3">
        <NewsDate iso={article.publishedAt} gold />
        <h1
          lang={textLang}
          className="font-display text-[34px] leading-[1.02] font-extrabold text-balance uppercase md:text-5xl"
        >
          {article.title}
        </h1>
        {article.excerpt && (
          <p lang={textLang} className="text-base leading-relaxed text-muted md:text-lg">
            {article.excerpt}
          </p>
        )}
        {article.fallback && (
          <p className="border-l-2 border-gold bg-surface px-3 py-2 text-[13px] text-muted">
            {t("frenchOnly")}
          </p>
        )}
      </header>

      {article.coverThumbUrl && article.coverUrl && (
        <div className="-mx-4 aspect-video overflow-hidden border-b-2 border-gold hatch md:mx-0">
          <Thumb
            src={article.coverThumbUrl}
            srcSet={`${article.coverThumbUrl} 640w, ${article.coverUrl} 1600w`}
            sizes="(min-width: 768px) 720px, 100vw"
            fallback={article.coverUrl}
            loading="eager"
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {article.body.length > 0 && (
        <div
          lang={article.bodyLocale !== locale ? article.bodyLocale : undefined}
          className="flex flex-col gap-4 text-[15px] leading-[1.75] whitespace-pre-line text-foreground/90 md:text-[17px]"
        >
          {article.body.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      )}

      <section className="flex flex-col gap-3 border-t border-line pt-6">
        <SectionTitle>{t("share")}</SectionTitle>
        <ShareButtons url={`${getSiteUrl()}/${locale}/actualites/${slug}`} text={article.title} />
      </section>

      {others.length > 0 && (
        <section className="flex flex-col gap-1">
          <SectionTitle>{t("more")}</SectionTitle>
          <ul className="flex flex-col gap-px bg-line">
            {others.map((item) => (
              <NewsRow key={item.slug} item={item} />
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
