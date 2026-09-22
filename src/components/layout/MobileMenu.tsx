"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NAV_ITEMS } from "@/lib/site";
import { CloseIcon, MenuIcon } from "@/components/ui/icons";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ThemeSwitcher } from "./ThemeSwitcher";

export function MobileMenu() {
  const t = useTranslations();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);

  // Referme le menu quand on change de page (motif « état dérivé » de React).
  if (open && openedAt !== pathname) {
    setOpen(false);
  }

  function toggle() {
    setOpenedAt(pathname);
    setOpen((value) => !value);
  }

  // Échap pour fermer, et pas de défilement de la page derrière le menu.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="menu-mobile"
        aria-label={open ? t("a11y.closeMenu") : t("a11y.openMenu")}
        className="flex h-11 w-11 items-center justify-center text-foreground"
      >
        {open ? <CloseIcon className="h-5.5 w-5.5" /> : <MenuIcon className="h-5.5 w-5.5" />}
      </button>

      {open && (
        <div
          id="menu-mobile"
          className="fixed inset-x-0 top-15 bottom-0 z-40 overflow-y-auto border-t border-line bg-background px-4 pt-6 pb-10"
        >
          <nav aria-label={t("a11y.mainNav")}>
            <ul className="flex flex-col">
              {NAV_ITEMS.map((item) => (
                <li key={item.href} className="border-b border-line">
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block py-3.5 font-display text-3xl font-bold uppercase"
                  >
                    {t(`nav.${item.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-6 flex gap-2.5">
            <ButtonLink href="/inscription" className="flex-1" onClick={() => setOpen(false)}>
              {t("nav.join")}
            </ButtonLink>
            <ButtonLink href="/connexion" variant="outline" onClick={() => setOpen(false)}>
              {t("nav.login")}
            </ButtonLink>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <span className="eyebrow text-muted">{t("theme.label")}</span>
            <ThemeSwitcher />
          </div>
        </div>
      )}
    </>
  );
}
