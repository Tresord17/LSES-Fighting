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
              // filet doré qui se trace de gauche à droite au survol
              className={`relative py-1 transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:bg-gold after:transition-transform after:duration-300 after:ease-out hover:text-foreground hover:after:scale-x-100 ${
                active ? "text-foreground after:scale-x-100" : "after:scale-x-0"
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
