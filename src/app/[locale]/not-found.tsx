import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/ButtonLink";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <section className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-16 md:py-24">
      <p className="eyebrow text-blood-ink">{t("eyebrow")}</p>
      <h1 className="font-display text-5xl leading-none font-extrabold uppercase md:text-6xl">
        {t("title")}
      </h1>
      <p className="max-w-md text-muted">{t("text")}</p>
      <ButtonLink href="/" className="mt-2">
        {t("back")}
      </ButtonLink>
    </section>
  );
}
