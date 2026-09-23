import type { ReactNode } from "react";
import { CheckIcon, InfoIcon } from "@/components/ui/icons";

// Portrait de tête des fiches publiques : photo pleine largeur sur mobile,
// colonne fixe sur ordinateur, fondu vers le fond de page sous le nom.
export function ProfileHero({
  photoUrl,
  photoAlt,
  badge,
  eyebrow,
  lastName,
  firstNames,
  chips,
}: {
  photoUrl: string | null;
  photoAlt: string;
  badge: string;
  eyebrow: string;
  lastName: string;
  firstNames: string;
  chips: { label: string; highlight?: boolean }[];
}) {
  return (
    <div className="relative flex h-90 items-end overflow-hidden md:h-auto md:min-h-135">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={photoAlt}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      ) : (
        <span aria-hidden="true" className="absolute inset-0 hatch" />
      )}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-55 bg-linear-to-b from-background/0 via-background/90 via-60% to-background"
      />

      <p className="absolute top-4 left-4 flex items-center gap-1.5 border border-success bg-background/75 px-2.25 py-1.25 font-mono text-[9px] tracking-[0.14em] text-success uppercase">
        <CheckIcon className="h-3 w-3" strokeWidth={3} />
        {badge}
      </p>

      <div className="relative flex flex-col gap-2.5 px-4 pb-4.5 md:px-6 md:pb-6">
        <p className="eyebrow text-gold-ink">{eyebrow}</p>
        <h1 className="font-display text-[40px] leading-[0.95] font-extrabold uppercase md:text-5xl">
          {lastName}
          <br />
          {firstNames}
        </h1>
        {chips.length > 0 && (
          <ul className="mt-0.5 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <li
                key={chip.label}
                className={`px-2.5 py-1.5 font-mono text-[11px] uppercase ${
                  chip.highlight ? "bg-gold text-on-gold" : "border border-line-strong text-muted"
                }`}
              >
                {chip.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Bandeau de trois chiffres sous le portrait
export function StatStrip({
  items,
}: {
  items: { label: string; value: string; highlight?: boolean }[];
}) {
  return (
    <dl className="grid grid-cols-3 gap-px border-y border-line bg-line">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col-reverse items-center gap-1 bg-background px-3 py-4"
        >
          <dt className="text-center font-mono text-[9px] tracking-[0.14em] text-subtle uppercase">
            {item.label}
          </dt>
          <dd
            className={`font-display text-[30px] leading-none font-extrabold ${
              item.highlight ? "text-gold-ink" : "text-foreground"
            }`}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// Section de fiche : filet doré, titre mono, compteur facultatif
export function ProfileSection({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5">
          <span aria-hidden="true" className="h-0.5 w-5.5 bg-gold" />
          <span className="eyebrow text-muted">{title}</span>
        </h2>
        {aside && <span className="font-mono text-[10px] text-subtle uppercase">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

// Mention de vérification et de retrait, en pied de fiche
export function ProfileMention({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.75 border border-line p-3.5">
      <InfoIcon className="mt-0.5 h-3.75 w-3.75 shrink-0 text-subtle" />
      <p className="text-[11px] leading-relaxed text-subtle">{children}</p>
    </div>
  );
}
