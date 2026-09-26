import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { latestAthletes } from "@/lib/directory/queries";
import { formatWeightClass } from "@/lib/profile/options";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { disciplineLabel } from "@/components/directory/Cards";

// Dernières fiches publiées. La page d'accueil est régénérée toutes les
// cinq minutes (voir app/[locale]/page.tsx).
export async function FeaturedAthletes() {
  const t = await getTranslations("home.athletes");
  const tDirectory = await getTranslations("directory.home");
  const athletes = await latestAthletes(4);

  return (
    <section className="mx-auto max-w-6xl reveal pb-7 md:pb-14">
      <div className="flex flex-col gap-3.5">
        <div className="px-4">
          <SectionTitle
            action={
              <Link
                href="/athletes"
                className="text-xs font-semibold text-gold-ink hover:text-gold-ink-hover"
              >
                {t("all")}
              </Link>
            }
          >
            {t("title")}
          </SectionTitle>
        </div>

        {athletes.length === 0 ? (
          <p className="mx-4 border border-line bg-surface px-4 py-5 text-sm text-muted">
            {tDirectory("empty")}
          </p>
        ) : (
          /* Défilement horizontal sur mobile, grille à partir de la tablette */
          <ul className="flex snap-x scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-2 md:grid md:grid-cols-4 md:overflow-visible">
            {athletes.map((athlete) => (
              <li
                key={athlete.slug}
                className="w-36.5 shrink-0 snap-start border-t-2 border-gold bg-surface transition-transform duration-300 md:w-auto md:hover:-translate-y-1"
              >
                <Link href={`/athletes/${athlete.slug}`} className="group flex h-full flex-col">
                  {athlete.photoUrl ? (
                    <span className="block overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={athlete.photoUrl}
                        alt=""
                        loading="lazy"
                        className="h-37.5 w-full object-cover object-top transition-transform duration-500 group-hover:scale-105 md:h-56"
                      />
                    </span>
                  ) : (
                    <span aria-hidden="true" className="block h-37.5 hatch md:h-56" />
                  )}
                  <span className="flex flex-col gap-1 px-2.75 py-2.5">
                    <span className="font-display text-[17px] leading-tight font-bold uppercase group-hover:text-gold-ink">
                      {athlete.lastName} {athlete.firstNames}
                    </span>
                    <span className="font-mono text-[10px] text-subtle uppercase">
                      {[
                        disciplineLabel(athlete.discipline),
                        athlete.weightClass ? formatWeightClass(athlete.weightClass) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {athlete.city && <span className="text-[11px] text-muted">{athlete.city}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
