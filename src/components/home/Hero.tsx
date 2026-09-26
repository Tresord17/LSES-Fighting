import Image from "next/image";
import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { AccountButton } from "./AccountButton";

export function Hero() {
  const t = useTranslations("home.hero");

  return (
    <section className="grain relative flex min-h-120 flex-col justify-end overflow-hidden border-b-2 border-gold hatch md:min-h-90">
      {/* Emblème : doré en thème sombre, noir en thème clair. Il apparaît en
          fondu, flotte doucement devant un halo doré qui respire. */}
      <div className="absolute inset-x-0 top-6.5 flex justify-center md:top-1/2 md:right-[8%] md:left-auto md:-translate-y-1/2">
        <div className="relative animate-fade [animation-duration:1.2s]">
          <span
            aria-hidden="true"
            className="absolute -inset-10 animate-glow bg-[radial-gradient(closest-side,rgb(192_135_10/0.32),transparent)] md:-inset-20"
          />
          <div className="relative animate-float">
            <Image
              src="/brand/logo-or-alt.png"
              alt={t("emblem")}
              width={280}
              height={350}
              priority
              className="hidden w-28 md:w-56 dark:block"
            />
            <Image
              src="/brand/logo-noir.png"
              alt={t("emblem")}
              width={256}
              height={320}
              priority
              className="w-28 md:w-56 dark:hidden"
            />
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-65 bg-linear-to-b from-[rgb(var(--hero-fade)/0)] via-[rgb(var(--hero-fade)/0.86)] to-background md:h-full md:bg-linear-to-r md:from-background md:via-[rgb(var(--hero-fade)/0.8)] md:to-[rgb(var(--hero-fade)/0)]"
      />

      {/* Reflet doré qui traverse le bandeau une fois, au chargement */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-sweep bg-linear-to-r from-transparent via-gold/10 to-transparent"
      />

      {/* Marge haute : sous l'emblème sur mobile, sous l'en-tête sur ordinateur,
          même quand le contenu dépasse la hauteur minimale */}
      <div className="relative mx-auto w-full max-w-6xl px-4 pt-48 pb-6 md:pt-12 md:pb-16">
        <div className="flex max-w-xl flex-col gap-3">
          {/* Entrée en cascade : sur-titre, titre, texte, boutons */}
          <p className="animate-rise eyebrow tracking-[0.22em] text-gold-ink [animation-delay:0.05s]">
            {t("eyebrow")}
          </p>
          <h1 className="animate-rise font-display text-[44px] leading-[0.94] font-extrabold tracking-[-0.01em] text-balance uppercase [animation-delay:0.15s] md:text-7xl">
            {t.rich("title", { gold: (chunks) => <span className="text-gold-ink">{chunks}</span> })}
          </h1>
          <p className="max-w-80 animate-rise text-sm leading-normal text-muted [animation-delay:0.25s] md:max-w-md md:text-base">
            {t("lead")}
          </p>
          {/* Sur mobile, les deux boutons passent l'un sous l'autre quand le
              libellé du second s'allonge (« Compléter mon profil ») */}
          <div className="mt-1.5 flex animate-rise flex-wrap gap-2.5 [animation-delay:0.35s]">
            <ButtonLink href="/#disciplines" className="flex-[1_1_13.5rem] md:flex-none">
              {t("primary")}
            </ButtonLink>
            <AccountButton
              guestLabel={t("secondary")}
              variant="outline"
              className="flex-[1_0_auto] md:flex-none"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
