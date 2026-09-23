import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatWeightClass, type Discipline } from "@/lib/profile/options";
import type { AthleteCard, CoachCard } from "@/lib/directory/queries";
import { ChevronRightIcon } from "@/components/ui/icons";

export const disciplineLabel = (discipline: Discipline | null) =>
  discipline === "mma" ? "MMA" : discipline === "sambo" ? "Sambo" : null;

// « SAMBO · −74 KG · YAOUNDÉ »
export function athleteLine(athlete: Pick<AthleteCard, "discipline" | "weightClass" | "city">) {
  return [
    disciplineLabel(athlete.discipline),
    athlete.weightClass ? formatWeightClass(athlete.weightClass) : null,
    athlete.city,
  ]
    .filter(Boolean)
    .join(" · ");
}

// « SAMBO · MMA · YAOUNDÉ »
export function coachLine(coach: Pick<CoachCard, "disciplines" | "city">) {
  return [...coach.disciplines.map(disciplineLabel), coach.city].filter(Boolean).join(" · ");
}

// Photo carrée ou motif hachuré en attendant
export function Portrait({ url, className }: { url: string | null; className: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" loading="lazy" className={`${className} shrink-0 object-cover`} />
  ) : (
    <span aria-hidden="true" className={`${className} block shrink-0 hatch`} />
  );
}

// Liste d'une colonne sur mobile (filets de 1 px), grille ensuite
export function ResultGrid({ children }: { children: ReactNode }) {
  return (
    <ul className="flex flex-col gap-px bg-line md:grid md:grid-cols-2 md:gap-3 md:bg-transparent lg:grid-cols-3">
      {children}
    </ul>
  );
}

function ResultLink({
  href,
  photoUrl,
  name,
  lines,
}: {
  href: string;
  photoUrl: string | null;
  name: string;
  lines: ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex h-full items-center gap-3.25 border-l-3 border-gold bg-surface p-3 transition-colors hover:bg-line/40"
      >
        <Portrait url={photoUrl} className="h-19.5 w-19.5" />
        <span className="flex min-w-0 grow flex-col gap-1.25">
          <span className="font-display text-xl leading-[1.05] font-bold uppercase">{name}</span>
          {lines}
        </span>
        <ChevronRightIcon className="h-4.25 w-4.25 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" />
      </Link>
    </li>
  );
}

export function AthleteResult({ athlete }: { athlete: AthleteCard }) {
  const t = useTranslations("directory.card");
  return (
    <ResultLink
      href={`/athletes/${athlete.slug}`}
      photoUrl={athlete.photoUrl}
      name={`${athlete.lastName} ${athlete.firstNames}`}
      lines={
        <>
          <span className="font-mono text-[10px] text-subtle uppercase">
            {athleteLine(athlete)}
          </span>
          {athlete.titles > 0 && (
            <span className="font-mono text-[10px] text-gold-ink uppercase">
              {t("titles", { count: athlete.titles })}
            </span>
          )}
        </>
      }
    />
  );
}

export function CoachResult({ coach }: { coach: CoachCard }) {
  const t = useTranslations("directory.card");
  return (
    <ResultLink
      href={`/coachs/${coach.slug}`}
      photoUrl={coach.photoUrl}
      name={`${coach.lastName} ${coach.firstNames}`}
      lines={
        <>
          <span className="font-mono text-[10px] text-subtle uppercase">{coachLine(coach)}</span>
          {coach.dojoName && <span className="text-xs text-muted">{coach.dojoName}</span>}
          <span className="font-mono text-[10px] text-gold-ink uppercase">
            {t("athletes", { count: coach.athletes })}
          </span>
        </>
      }
    />
  );
}

export function EmptyResults({ children }: { children: ReactNode }) {
  return <p className="border border-line bg-surface px-4 py-6 text-sm text-muted">{children}</p>;
}
