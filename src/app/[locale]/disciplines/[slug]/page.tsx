import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { pickLocale } from "@/lib/auth/redirect";
import { loadGallery, type MediaItem } from "@/lib/media/data";
import { formatDuration } from "@/lib/media/options";
import { practiceSummary } from "@/lib/directory/queries";
import { DISCIPLINES, type Discipline } from "@/lib/profile/options";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ImageGallery, type GalleryImage } from "@/components/discipline/ImageGallery";
import { VideoList, type GalleryVideo } from "@/components/discipline/VideoList";

// Pages Sambo et MMA générées au build, puis régénérées au plus toutes les
// cinq minutes ; un ajout de média les régénère aussitôt (lib/media/actions).
export const revalidate = 300;

const FACTS = ["f1", "f2", "f3", "f4"] as const;
const NAMES: Record<Discipline, string> = { sambo: "Sambo", mma: "MMA" };

function isDiscipline(slug: string): slug is Discipline {
  return DISCIPLINES.includes(slug as Discipline);
}

export function generateStaticParams() {
  return DISCIPLINES.map((slug) => ({ slug }));
}

const titleOf = (item: MediaItem, locale: string) =>
  locale === "en" && item.titleEn ? item.titleEn : item.titleFr;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/disciplines/[slug]">): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  if (!isDiscipline(slug)) return {};
  const locale = pickLocale(rawLocale);
  const t = await getTranslations({ locale, namespace: "discipline" });
  const cover = (await loadGallery(slug)).find((item) => item.kind === "image");
  const path = `/disciplines/${slug}`;
  return {
    title: NAMES[slug],
    description: t(`${slug}.meta`),
    alternates: {
      canonical: `/${locale}${path}`,
      languages: { fr: `/fr${path}`, en: `/en${path}` },
    },
    openGraph: {
      title: NAMES[slug],
      description: t(`${slug}.meta`),
      url: `/${locale}${path}`,
      images: cover ? [{ url: cover.url, alt: titleOf(cover, locale) }] : undefined,
    },
  };
}

export default async function DisciplinePage({
  params,
}: PageProps<"/[locale]/disciplines/[slug]">) {
  const { locale: rawLocale, slug } = await params;
  if (!isDiscipline(slug)) notFound();
  const locale = pickLocale(rawLocale);
  const t = await getTranslations("discipline");
  const format = await getFormatter();
  const [gallery, practice] = await Promise.all([loadGallery(slug), practiceSummary(slug)]);

  const images: GalleryImage[] = gallery
    .filter((item) => item.kind === "image")
    .map((item) => ({
      id: item.id,
      title: titleOf(item, locale),
      url: item.url,
      thumbnailUrl: item.thumbnailUrl ?? item.url,
    }));
  const videos: GalleryVideo[] = gallery
    .filter((item) => item.kind !== "image")
    .map((item) => ({
      id: item.id,
      title: titleOf(item, locale),
      fileUrl: item.kind === "video" ? item.url : null,
      embedUrl: item.embedUrl,
      thumbnailUrl: item.thumbnailUrl,
      duration: formatDuration(item.durationSeconds),
      provider: item.provider,
    }));

  // « à Yaoundé, Douala et Bafoussam », trois villes au plus
  const shownCities = practice.cities.slice(0, 3);
  const otherCities = practice.cities.length - shownCities.length;
  const cities = format.list(
    otherCities > 0
      ? [...shownCities, t("practice.otherCities", { count: otherCities })]
      : shownCities,
    { type: "conjunction" },
  );

  return (
    <>
      {/* Bandeau */}
      <section className="flex h-70 items-end border-b-2 border-gold hatch md:h-80">
        <div className="relative w-full">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-47.5 bg-linear-to-b from-[rgb(var(--hero-fade)/0)] via-[rgb(var(--hero-fade)/0.9)] via-60% to-background"
          />
          <div className="relative mx-auto flex max-w-6xl flex-col gap-2 px-4 pb-5 md:pb-10">
            <p className="eyebrow text-gold-ink">{t("eyebrow")}</p>
            <h1 className="font-display text-[54px] leading-[0.9] font-extrabold uppercase md:text-7xl">
              {NAMES[slug]}
            </h1>
            <p className="text-[13px] text-muted md:text-base">{t(`${slug}.tagline`)}</p>
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-6xl flex-col gap-6.5 px-4 pt-6.5 pb-8 md:gap-12 md:pt-12 md:pb-16">
        {/* Présentation et repères */}
        <div className="flex flex-col gap-5.5 md:grid md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-12">
          <div className="flex max-w-prose flex-col gap-3.5 text-[15px] leading-[1.7] text-foreground/90 md:text-base">
            <p>{t(`${slug}.intro1`)}</p>
            <p>{t(`${slug}.intro2`)}</p>
          </div>
          <dl
            aria-label={t("facts")}
            className="grid grid-cols-2 gap-px self-start border border-line bg-line"
          >
            {FACTS.map((fact) => (
              <div key={fact} className="flex flex-col gap-1.25 bg-surface p-3.5">
                <dt className="font-mono text-[9px] tracking-[0.14em] text-subtle uppercase">
                  {t(`${slug}.facts.${fact}.label`)}
                </dt>
                <dd className="font-display text-xl font-bold uppercase">
                  {t(`${slug}.facts.${fact}.value`)}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Galerie */}
        {images.length > 0 && (
          <section className="flex flex-col gap-3.5">
            <SectionTitle
              action={<span className="font-mono text-[10px] text-subtle">{images.length}</span>}
            >
              {t("gallery.images")}
            </SectionTitle>
            <ImageGallery images={images} />
          </section>
        )}

        {videos.length > 0 && (
          <section className="flex flex-col gap-3.5">
            <SectionTitle>{t("gallery.videos")}</SectionTitle>
            <VideoList videos={videos} />
            <p className="font-mono text-[9.5px] leading-relaxed text-subtle uppercase">
              {t("gallery.dataNote")}
            </p>
          </section>
        )}

        {images.length === 0 && videos.length === 0 && (
          <p className="border border-line bg-surface px-4 py-5 text-sm text-muted">
            {t("gallery.empty")}
          </p>
        )}

        {/* Passerelle vers les répertoires */}
        <section className="flex flex-col gap-3 border-l-3 border-gold bg-surface px-5 py-6 md:flex-row md:items-center md:justify-between md:gap-10 md:px-10 md:py-9">
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-[26px] leading-[1.05] font-bold uppercase md:text-4xl">
              {t("practice.title")}
            </h2>
            <p className="text-[13px] leading-normal text-muted md:text-base">
              {practice.count === 0
                ? t("practice.none")
                : shownCities.length > 0
                  ? t("practice.some", { count: practice.count, cities })
                  : t("practice.count", { count: practice.count })}
            </p>
          </div>
          <div className="mt-1 flex gap-2.25 md:mt-0 md:shrink-0">
            <ButtonLink href={`/coachs?discipline=${slug}`} className="grow md:grow-0">
              {t("practice.coaches")}
            </ButtonLink>
            <ButtonLink
              href={`/athletes?discipline=${slug}`}
              variant="outline"
              className="grow md:grow-0"
            >
              {t("practice.athletes")}
            </ButtonLink>
          </div>
        </section>
      </div>
    </>
  );
}
