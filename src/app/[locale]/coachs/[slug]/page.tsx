import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { pickLocale } from "@/lib/auth/redirect";
import { getSiteUrl } from "@/lib/auth/site-url";
import { getCoach } from "@/lib/directory/queries";
import { AthleteResult, disciplineLabel } from "@/components/directory/Cards";
import {
  ProfileHero,
  ProfileMention,
  ProfileSection,
  StatStrip,
} from "@/components/directory/ProfileParts";
import { ShareButtons } from "@/components/directory/ShareButtons";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

async function load(slug: string) {
  return slug.length <= 100 && SLUG.test(slug) ? getCoach(slug) : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/coachs/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const coach = await load(slug);
  if (!coach) return {};
  const t = await getTranslations("directory.profile");
  const name = `${coach.firstNames} ${coach.lastName}`;
  const details = [coach.disciplines.map(disciplineLabel).join(" & "), coach.city]
    .filter(Boolean)
    .join(", ");
  const description = t("metaCoach", { name, details });
  const path = `/coachs/${slug}`;
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
      images: coach.photoUrl ? [{ url: coach.photoUrl, alt: name }] : undefined,
    },
  };
}

export default async function CoachPage({ params }: PageProps<"/[locale]/coachs/[slug]">) {
  const { locale: rawLocale, slug } = await params;
  const locale = pickLocale(rawLocale);
  const coach = await load(slug);
  if (!coach) notFound();

  const t = await getTranslations("directory");
  const format = await getFormatter();
  const name = `${coach.firstNames} ${coach.lastName}`;

  return (
    <article className="mx-auto max-w-5xl md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-10 md:px-4 md:pt-10 md:pb-16">
      <div className="px-4 py-3 md:hidden">
        <Link href="/coachs" className="text-xs font-semibold text-subtle hover:text-foreground">
          ← {t("coaches.back")}
        </Link>
      </div>

      <div className="md:sticky md:top-24 md:self-start">
        <ProfileHero
          photoUrl={coach.photoUrl}
          photoAlt={t("profile.photoAlt", { name })}
          badge={t("profile.verifiedCoach")}
          eyebrow={[t("profile.coachEyebrow"), ...coach.disciplines.map(disciplineLabel)].join(
            " · ",
          )}
          lastName={coach.lastName}
          firstNames={coach.firstNames}
          chips={[
            ...(coach.city ? [{ label: coach.city, highlight: true }] : []),
            ...(coach.dojoName ? [{ label: coach.dojoName }] : []),
          ]}
        />
      </div>

      <div className="flex flex-col gap-6.5 pb-10 md:pb-0">
        <Link
          href="/coachs"
          className="hidden text-xs font-semibold text-subtle hover:text-foreground md:block"
        >
          ← {t("coaches.back")}
        </Link>

        <StatStrip
          items={[
            {
              label: t("profile.stats.athletes"),
              value: String(coach.athletes),
              highlight: true,
            },
            {
              label: t("profile.stats.experience"),
              value: coach.experienceYears !== null ? String(coach.experienceYears) : "—",
            },
            { label: t("profile.stats.rosterTitles"), value: String(coach.titles) },
          ]}
        />

        <div className="flex flex-col gap-6.5 px-4 md:px-0">
          {coach.bio && (
            <ProfileSection title={t("profile.about")}>
              <p className="text-sm leading-relaxed whitespace-pre-line text-muted">{coach.bio}</p>
            </ProfileSection>
          )}

          <ProfileSection
            title={t("profile.roster")}
            aside={coach.roster.length ? String(coach.roster.length) : undefined}
          >
            {coach.roster.length ? (
              <ul className="flex flex-col gap-px bg-line">
                {coach.roster.map((athlete) => (
                  <AthleteResult key={athlete.slug} athlete={athlete} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-subtle">{t("profile.rosterEmpty")}</p>
            )}
          </ProfileSection>

          <ProfileSection title={t("profile.share")}>
            <ShareButtons
              url={`${getSiteUrl()}/${locale}/coachs/${coach.slug}`}
              text={t("profile.shareText", { name })}
            />
          </ProfileSection>

          {coach.approvedAt && (
            <ProfileMention>
              {t.rich("profile.mentionCoach", {
                date: format.dateTime(new Date(coach.approvedAt), { dateStyle: "long" }),
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
