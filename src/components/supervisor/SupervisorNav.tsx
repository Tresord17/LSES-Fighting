"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const TABS = [
  { href: "/mon-espace/superviseur", key: "requests", icon: <path d="M5 12l5 5 9-10" /> },
  {
    href: "/mon-espace/superviseur/fiches",
    key: "profiles",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" />
        <circle cx="9" cy="11" r="2.2" />
        <path d="M6 16c.8-1.6 1.8-2.3 3-2.3s2.2.7 3 2.3M14.5 10h4M14.5 13.5h3" />
      </>
    ),
  },
  {
    href: "/mon-espace/superviseur/medias",
    key: "media",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" />
        <path d="M3 15l5-5 4 4 3-3 6 6" />
      </>
    ),
  },
  {
    href: "/mon-espace/superviseur/actualites",
    key: "news",
    icon: (
      <>
        <rect x="4" y="4" width="16" height="16" />
        <path d="M8 9h8M8 13h8M8 17h4" />
      </>
    ),
  },
  {
    href: "/mon-espace/superviseur/journal",
    key: "journal",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  },
] as const;

// Onglets de l'espace superviseur : filet bleu sur l'onglet actif
export function SupervisorNav() {
  const t = useTranslations("supervisor.tabs");
  const pathname = usePathname();

  return (
    <nav aria-label={t("label")} className="border-y border-line">
      <ul className="grid grid-cols-5">
        {TABS.map((tab) => {
          // l'onglet reste actif sur ses sous-pages (édition d'une actualité)
          const active =
            pathname === tab.href ||
            (tab.href !== "/mon-espace/superviseur" && pathname.startsWith(`${tab.href}/`));
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`-mt-px flex h-15 flex-col items-center justify-center gap-1.25 border-t-2 font-mono text-[9px] tracking-[0.06em] uppercase transition-colors sm:text-[10px] sm:tracking-[0.08em] ${
                  active
                    ? "border-admin-fill text-admin"
                    : "border-transparent text-subtle hover:text-foreground"
                }`}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4.75 w-4.75"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  {tab.icon}
                </svg>
                {t(tab.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
