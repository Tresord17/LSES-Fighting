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
      <p className="animate-rise eyebrow tracking-[0.16em] text-gold-ink">{eyebrow}</p>
      <h1 className="animate-rise font-display text-4xl leading-none font-extrabold uppercase [animation-delay:0.08s] md:text-5xl">
        {title}
      </h1>
      <p className="max-w-xl animate-rise text-sm leading-relaxed text-muted [animation-delay:0.16s]">
        {intro}
      </p>
    </header>
  );
}
