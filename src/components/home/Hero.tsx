import Image from "next/image";
import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/ButtonLink";

export function Hero() {
  const t = useTranslations("home.hero");

  return (
    <section className="relative flex min-h-[480px] flex-col justify-end border-b-2 border-gold hatch md:min-h-[560px]">
      {/* Emblème : doré en thème sombre, noir en thème clair */}
      <div className="absolute inset-x-0 top-6.5 flex justify-center md:top-1/2 md:right-[8%] md:left-auto md:-translate-y-1/2">
        <Image
          src="/brand/logo-or.png"
          alt={t("emblem")}
          width={167}
          height={208}
          priority
          className="hidden w-28 opacity-90 md:w-52 dark:block"
        />
        <Image
          src="/brand/logo-noir.png"
          alt={t("emblem")}
          width={256}
          height={320}
          priority
          className="w-28 opacity-90 md:w-52 dark:hidden"
        />
      </div>

      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[260px] bg-linear-to-b from-[rgb(var(--hero-fade)/0)] via-[rgb(var(--hero-fade)/0.86)] to-background md:h-full md:bg-linear-to-r md:from-background md:via-[rgb(var(--hero-fade)/0.8)] md:to-[rgb(var(--hero-fade)/0)]"
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 pb-6 md:pb-16">
        <div className="flex max-w-xl flex-col gap-3">
          <p className="eyebrow tracking-[0.22em] text-gold-ink">{t("eyebrow")}</p>
          <h1 className="font-display text-[44px] leading-[0.94] font-extrabold tracking-[-0.01em] text-balance uppercase md:text-7xl">
            {t("title")}
          </h1>
          <p className="max-w-80 text-sm leading-normal text-muted md:max-w-md md:text-base">
            {t("lead")}
          </p>
          <div className="mt-1.5 flex gap-2.5">
            <ButtonLink href="/#disciplines" className="flex-1 md:flex-none">
              {t("primary")}
            </ButtonLink>
            <ButtonLink href="/inscription" variant="outline" className="w-27 md:w-auto">
              {t("secondary")}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
