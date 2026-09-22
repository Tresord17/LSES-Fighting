import { useTranslations } from "next-intl";
import { ButtonLink } from "./ButtonLink";

// Page d'attente pour les rubriques pas encore développées.
export function ComingSoon({ title }: { title: string }) {
  const t = useTranslations("comingSoon");
  return (
    <section className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-16 md:py-24">
      <p className="eyebrow text-gold-ink">{t("eyebrow")}</p>
      <h1 className="font-display text-5xl leading-none font-extrabold uppercase md:text-6xl">
        {title}
      </h1>
      <p className="max-w-md text-muted">{t("text")}</p>
      <ButtonLink href="/" variant="outline" className="mt-2">
        {t("back")}
      </ButtonLink>
    </section>
  );
}
