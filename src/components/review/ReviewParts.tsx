"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { formatWeightClass } from "@/lib/profile/options";
import type { QueueAthlete } from "@/lib/review/queue";

// Titre de section de l'espace coach : filet bleu du back-office
// (rouge sang pour les demandes escaladées, seule urgence de l'écran)
export function ReviewSection({
  title,
  aside,
  tone = "admin",
  children,
}: {
  title: string;
  aside?: ReactNode;
  tone?: "admin" | "blood";
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className={`h-0.5 w-5.5 ${tone === "blood" ? "bg-blood" : "bg-admin-fill"}`}
          />
          <span className="eyebrow text-muted">{title}</span>
        </h2>
        {aside !== undefined && <span className="font-mono text-[10px] text-subtle">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

// Vignette : photo de l'athlète ou motif hachuré en attendant
export function Thumb({
  url,
  alt,
  size = "md",
}: {
  url: string | null;
  alt: string;
  size?: "sm" | "md" | "lg";
}) {
  const box = { sm: "h-13.5 w-13.5", md: "h-16.5 w-16.5", lg: "h-24 w-24" }[size];
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className={`${box} shrink-0 object-cover`} />
  ) : (
    <span aria-hidden="true" className={`${box} block shrink-0 hatch`} />
  );
}

// « SAMBO · −74 KG · YAOUNDÉ »
export function athleteMeta(athlete: QueueAthlete) {
  return [
    athlete.discipline === "mma" ? "MMA" : athlete.discipline === "sambo" ? "Sambo" : null,
    athlete.weightClass ? formatWeightClass(athlete.weightClass) : null,
    athlete.city,
  ]
    .filter(Boolean)
    .join(" · ");
}

// Fiche détaillée présentée au coach avant sa décision
export function AthleteFacts({ athlete }: { athlete: QueueAthlete }) {
  const t = useTranslations("review.card");
  const tFields = useTranslations("profile.fields");
  const empty = t("facts.empty");

  const facts: [string, string][] = [
    [t("facts.sex"), athlete.sex ? tFields(`sexOptions.${athlete.sex}`) : empty],
    [t("facts.age"), athlete.age !== null ? t("facts.ageValue", { age: athlete.age }) : empty],
    [t("facts.practiceSince"), athlete.practiceSince ? String(athlete.practiceSince) : empty],
    [t("facts.fights"), athlete.fightsCount !== null ? String(athlete.fightsCount) : empty],
    [t("facts.coach"), athlete.coachName ?? t("facts.noCoach")],
  ];

  return (
    <div className="flex flex-col gap-3.5">
      <dl className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3">
        {/* cinq cases : la dernière s'étire pour ne pas laisser de trou */}
        {facts.map(([label, value]) => (
          <div
            key={label}
            className="flex flex-col gap-1 bg-background px-3 py-2.5 last:col-span-2"
          >
            <dt className="eyebrow tracking-[0.12em] text-subtle">{label}</dt>
            <dd className="text-sm text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      {athlete.bio && (
        <div className="flex flex-col gap-1.5">
          <p className="eyebrow tracking-[0.12em] text-subtle">{t("bio")}</p>
          <p className="border-l-2 border-line-strong pl-3 text-[13px] leading-relaxed whitespace-pre-line text-muted">
            {athlete.bio}
          </p>
        </div>
      )}
    </div>
  );
}
