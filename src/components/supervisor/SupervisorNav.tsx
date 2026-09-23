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
      <ul className="grid grid-cols-3">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`-mt-px flex h-15 flex-col items-center justify-center gap-1.25 border-t-2 font-mono text-[10px] tracking-[0.08em] uppercase transition-colors ${
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
