import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DEMO_ATHLETES } from "@/lib/demo-data";
import { SectionTitle } from "@/components/ui/SectionTitle";

export function FeaturedAthletes() {
  const t = useTranslations("home.athletes");

  return (
    <section className="mx-auto max-w-6xl pb-7 md:pb-14">
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

        {/* Défilement horizontal sur mobile, grille à partir de la tablette */}
        <ul className="flex snap-x scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-2 md:grid md:grid-cols-4 md:overflow-visible">
          {DEMO_ATHLETES.map((athlete) => (
            <li
              key={athlete.id}
              className="w-36.5 shrink-0 snap-start border-t-2 border-gold bg-surface md:w-auto"
            >
              <div className="h-37.5 hatch md:h-56" />
              <div className="flex flex-col gap-1 px-2.75 py-2.5">
                <span className="font-display text-[17px] leading-tight font-bold uppercase">
                  {athlete.name}
                </span>
                <span className="font-mono text-[10px] text-subtle uppercase">
                  {athlete.discipline} · −{athlete.weightClassKg} kg
                </span>
                <span className="text-[11px] text-muted">{athlete.city}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
