import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/ButtonLink";

export function JoinCallout() {
  const t = useTranslations("home.cta");

  return (
    <section className="mx-auto max-w-6xl px-4 pb-7 md:pb-16">
      <div className="flex flex-col gap-3 border-l-3 border-gold bg-surface px-5 py-6.5 md:flex-row md:items-center md:justify-between md:gap-10 md:px-10 md:py-10">
        <div className="flex flex-col gap-3">
          <h2 className="font-display text-[26px] leading-[1.05] font-bold uppercase md:text-4xl">
            {t("title")}
          </h2>
          <p className="max-w-xl text-[13px] leading-relaxed text-muted md:text-base">
            {t("text")}
          </p>
        </div>
        <ButtonLink href="/inscription" className="mt-1 shrink-0 md:mt-0">
          {t("button")}
        </ButtonLink>
      </div>
    </section>
  );
}
