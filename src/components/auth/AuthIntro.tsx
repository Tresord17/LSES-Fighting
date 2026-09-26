// En-tête commun aux pages de connexion : sur-titre, grand titre, chapeau.
export function AuthIntro({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="animate-rise eyebrow tracking-[0.16em] text-gold-ink">{eyebrow}</p>
      <h1 className="animate-rise font-display text-4xl leading-[0.98] font-extrabold text-balance uppercase [animation-delay:0.08s] md:text-5xl">
        {title}
      </h1>
      {lead && (
        <p className="animate-rise text-[13px] leading-relaxed text-muted [animation-delay:0.16s] md:text-sm">
          {lead}
        </p>
      )}
    </div>
  );
}

export function OrDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3.5" aria-hidden="true">
      <span className="h-px flex-1 bg-line" />
      <span className="eyebrow tracking-[0.16em] text-subtle">{label}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
