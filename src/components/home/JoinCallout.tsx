"use client";

import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { useAccountAction } from "@/components/account/useAccountStage";

// Encart de fin de page : invitation à s'inscrire pour un visiteur,
// rappel de l'état de la fiche pour un compte connecté.
export function JoinCallout() {
  const t = useTranslations("home.cta");
  const nav = useTranslations("nav");
  const action = useAccountAction();

  return (
    <section className="mx-auto max-w-6xl reveal px-4 pb-7 md:pb-16">
      <div className="grain relative flex flex-col gap-3 overflow-hidden border-l-3 border-gold bg-surface px-5 py-6.5 md:flex-row md:items-center md:justify-between md:gap-10 md:px-10 md:py-10">
        {/* Filigrane en contour doré */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-4 -bottom-6 font-display text-[120px] leading-none font-extrabold text-outline uppercase opacity-25 select-none md:-bottom-10 md:text-[200px]"
        >
          LSES
        </span>
        <div className="relative flex flex-col gap-3">
          <h2 className="font-display text-[26px] leading-[1.05] font-bold uppercase md:text-4xl">
            {action ? t(`${action.stage}.title`) : t("title")}
          </h2>
          <p className="max-w-xl text-[13px] leading-relaxed text-muted md:text-base">
            {action ? t(`${action.stage}.text`) : t("text")}
          </p>
        </div>
        <ButtonLink
          href={action?.href ?? "/inscription"}
          className="relative mt-1 shrink-0 md:mt-0"
        >
          {action ? nav(action.label) : t("button")}
        </ButtonLink>
      </div>
    </section>
  );
}
