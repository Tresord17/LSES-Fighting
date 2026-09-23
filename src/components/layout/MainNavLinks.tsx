"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NAV_ITEMS, isActivePath } from "@/lib/site";

// Liens de la barre de navigation (bureau), avec la rubrique en cours signalée
// visuellement et pour les lecteurs d'écran (aria-current).
export function MainNavLinks() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <ul className="flex items-center gap-6 text-sm font-medium text-muted">
      {NAV_ITEMS.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative py-1 transition-colors hover:text-foreground ${
                active
                  ? "text-foreground after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:bg-gold"
                  : ""
              }`}
            >
              {t(item.key)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
