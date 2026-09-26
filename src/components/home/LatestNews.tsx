import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { latestNews } from "@/lib/news/data";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { NewsRow } from "@/components/news/NewsItems";

// Deux dernières actualités publiées ; la section disparaît tant qu'il n'y
// en a aucune. La page d'accueil est régénérée à chaque publication.
export async function LatestNews() {
  const t = await getTranslations("home.news");
  const news = await latestNews(await getLocale(), 2);
  if (news.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl reveal px-4 pb-7 md:pb-14">
      <div className="flex flex-col gap-3.5">
        <SectionTitle
          action={
            <Link
              href="/actualites"
              className="text-xs font-semibold text-gold-ink hover:text-gold-ink-hover"
            >
              {t("all")}
            </Link>
          }
        >
          {t("title")}
        </SectionTitle>
        <ul className="flex flex-col gap-px bg-line md:grid md:grid-cols-2 md:gap-6 md:bg-transparent">
          {news.map((item) => (
            <NewsRow key={item.slug} item={item} />
          ))}
        </ul>
      </div>
    </section>
  );
}
