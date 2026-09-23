// En-tête des répertoires : sur-titre doré, titre et phrase d'introduction
export function DirectoryHeader({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: string;
  intro: string;
}) {
  return (
    <header className="flex flex-col gap-2.5">
      <p className="eyebrow tracking-[0.16em] text-gold-ink">{eyebrow}</p>
      <h1 className="font-display text-4xl leading-none font-extrabold uppercase md:text-5xl">
        {title}
      </h1>
      <p className="max-w-xl text-sm leading-relaxed text-muted">{intro}</p>
    </header>
  );
}
