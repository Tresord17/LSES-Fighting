"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

// Bascule FR / EN en restant sur la même page.
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const t = useTranslations("language");
  const current = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t("label")} className={`flex gap-px border border-line bg-line ${className}`}>
      {routing.locales.map((locale) => {
        const active = locale === current;
        return (
          <Link
            key={locale}
            href={pathname}
            locale={locale}
            hrefLang={locale}
            lang={locale}
            aria-current={active ? "true" : undefined}
            title={t(locale)}
            className={`flex h-9 min-w-9 items-center justify-center px-2 font-mono text-[11px] uppercase transition-colors ${
              active
                ? "bg-foreground text-background"
                : "bg-surface text-muted hover:text-foreground"
            }`}
          >
            {locale}
          </Link>
        );
      })}
    </nav>
  );
}
