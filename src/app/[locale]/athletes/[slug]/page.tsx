import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { pickLocale } from "@/lib/auth/redirect";
import { getSiteUrl } from "@/lib/auth/site-url";
import { getAthlete } from "@/lib/directory/queries";
import { formatWeightClass } from "@/lib/profile/options";
import { Portrait, athleteLine, disciplineLabel } from "@/components/directory/Cards";
import { PalmaresList } from "@/components/directory/PalmaresList";
import {
  ProfileHero,
  ProfileMention,
  ProfileSection,
  StatStrip,
} from "@/components/directory/ProfileParts";
import { ShareButtons } from "@/components/directory/ShareButtons";
import { ChevronRightIcon } from "@/components/ui/icons";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

async function load(slug: string) {
  return slug.length <= 100 && SLUG.test(slug) ? getAthlete(slug) : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/athletes/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const athlete = await load(slug);
  if (!athlete) return {};
  const t = await getTranslations("directory.profile");
  const name = `${athlete.firstNames} ${athlete.lastName}`;
  const description = t("metaAthlete", { name, details: athleteLine(athlete) });
  const path = `/athletes/${slug}`;
  return {
    title: name,
    description,
    alternates: {
      canonical: `/${pickLocale(locale)}${path}`,
      languages: { fr: `/fr${path}`, en: `/en${path}` },
    },
    openGraph: {
      type: "profile",
      title: name,
      description,
      url: `/${pickLocale(locale)}${path}`,
      images: athlete.photoUrl ? [{ url: athlete.photoUrl, alt: name }] : undefined,
    },
  };
}

export default async function AthletePage({ params }: PageProps<"/[locale]/athletes/[slug]">) {
  const { locale: rawLocale, slug } = await params;
  const locale = pickLocale(rawLocale);
  const athlete = await load(slug);
  if (!athlete) notFound();

  const t = await getTranslations("directory");
  const format = await getFormatter();
  const name = `${athlete.firstNames} ${athlete.lastName}`;
  const yearsOfPractice =
    athlete.practiceSince !== null
      ? Math.max(0, new Date().getFullYear() - athlete.practiceSince)
      : null;

  return (
    <article className="mx-auto max-w-5xl md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-10 md:px-4 md:pt-10 md:pb-16">
      <div className="px-4 py-3 md:hidden">
        <Link href="/athletes" className="text-xs font-semibold text-subtle hover:text-foreground">
          ← {t("athletes.back")}
        </Link>
      </div>

      <div className="md:sticky md:top-24 md:self-start">
        <ProfileHero
          photoUrl={athlete.photoUrl}
          photoAlt={t("profile.photoAlt", { name })}
          badge={t("profile.verified")}
          eyebrow={disciplineLabel(athlete.discipline) ?? ""}
          lastName={athlete.lastName}
          firstNames={athlete.firstNames}
          chips={[
            ...(athlete.weightClass
              ? [{ label: formatWeightClass(athlete.weightClass), highlight: true }]
              : []),
            ...(athlete.city ? [{ label: athlete.city }] : []),
          ]}
        />
      </div>

      <div className="flex flex-col gap-6.5 pb-10 md:pb-0">
        <Link
          href="/athletes"
          className="hidden text-xs font-semibold text-subtle hover:text-foreground md:block"
        >
          ← {t("athletes.back")}
        </Link>

        <StatStrip
          items={[
            { label: t("profile.stats.titles"), value: String(athlete.titles), highlight: true },
            {
              label: t("profile.stats.fights"),
              value: athlete.fightsCount !== null ? String(athlete.fightsCount) : "—",
            },
            {
              label: t("profile.stats.years"),
              value: yearsOfPractice !== null ? String(yearsOfPractice) : "—",
            },
          ]}
        />

        <div className="flex flex-col gap-6.5 px-4 md:px-0">
          {athlete.bio && (
            <ProfileSection title={t("profile.about")}>
              <p className="text-sm leading-relaxed whitespace-pre-line text-muted">
                {athlete.bio}
              </p>
            </ProfileSection>
          )}

          <ProfileSection
            title={t("profile.palmares")}
            aside={
              athlete.palmares.length
                ? t("profile.palmaresCount", { count: athlete.palmares.length })
                : undefined
            }
          >
            {athlete.palmares.length ? (
              <PalmaresList items={athlete.palmares} />
            ) : (
              <p className="text-sm text-subtle">{t("profile.palmaresEmpty")}</p>
            )}
          </ProfileSection>

          {athlete.coach && (
            <ProfileSection title={t("profile.coach")}>
              <Link
                href={`/coachs/${athlete.coach.slug}`}
                className="group flex items-center gap-3.25 border-l-3 border-gold bg-surface p-3.25 transition-colors hover:bg-line/40"
              >
                <Portrait url={athlete.coach.photoUrl} className="h-13.5 w-13.5" />
                <span className="flex min-w-0 grow flex-col gap-0.75">
                  <span className="font-display text-[19px] leading-[1.1] font-bold uppercase">
                    {athlete.coach.lastName} {athlete.coach.firstNames}
                  </span>
                  <span className="font-mono text-[10px] text-subtle uppercase">
                    {[athlete.coach.dojoName, athlete.coach.city].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <ChevronRightIcon className="h-4.5 w-4.5 shrink-0 text-subtle" />
              </Link>
            </ProfileSection>
          )}

          <ProfileSection title={t("profile.share")}>
            <ShareButtons
              url={`${getSiteUrl()}/${locale}/athletes/${athlete.slug}`}
              text={t("profile.shareText", { name })}
            />
          </ProfileSection>

          {athlete.verifiedAt && (
            <ProfileMention>
              {t.rich("profile.mentionAthlete", {
                date: format.dateTime(new Date(athlete.verifiedAt), { dateStyle: "long" }),
                link: (chunks) => (
                  <Link href="/mentions-legales" className="text-gold-ink underline">
                    {chunks}
                  </Link>
                ),
              })}
            </ProfileMention>
          )}
        </div>
      </div>
    </article>
  );
}
