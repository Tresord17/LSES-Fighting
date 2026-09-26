"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import {
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  isThemePreference,
  type ThemePreference,
} from "@/lib/theme";
import { MonitorIcon, MoonIcon, SunIcon } from "@/components/ui/icons";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(value) ? value : "system";
  } catch {
    return "system";
  }
}

function applyTheme(preference: ThemePreference) {
  const dark =
    preference === "dark" || (preference === "system" && window.matchMedia(DARK_QUERY).matches);
  const root = document.documentElement;
  root.dataset.theme = dark ? "dark" : "light";
  root.style.colorScheme = dark ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  media.addEventListener("change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    media.removeEventListener("change", onChange);
  };
}

// Thème réellement affiché, y compris quand « Système » décide
function readResolved(): "light" | "dark" {
  const preference = readPreference();
  if (preference !== "system") return preference;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

const OPTIONS = [
  { value: "system", Icon: MonitorIcon },
  { value: "light", Icon: SunIcon },
  { value: "dark", Icon: MoonIcon },
] as const;

type Props = {
  /** "full" : icône + libellé (menu, pied de page). "compact" : icône seule (en-tête bureau). */
  variant?: "full" | "compact";
  /** Sans « Système » (en-tête et menu) : ce réglage n'est proposé qu'en pied de page. */
  withSystem?: boolean;
  className?: string;
};

export function ThemeSwitcher({ variant = "full", withSystem = true, className = "" }: Props) {
  const t = useTranslations("theme");
  // Côté serveur la préférence est inconnue : aucun bouton n'est coché
  // tant que le navigateur n'a pas pris le relais.
  const preference = useSyncExternalStore(subscribe, readPreference, () => null);
  const resolved = useSyncExternalStore(subscribe, readResolved, () => null);
  const options = withSystem ? OPTIONS : OPTIONS.filter((option) => option.value !== "system");

  // Filet de sécurité : pour les pages 404, Next.js rend la page côté client
  // et le script du <head> ne s'exécute pas. On applique alors le thème ici.
  useEffect(() => {
    if (!document.documentElement.dataset.theme) applyTheme(readPreference());
  }, []);

  // Suit en direct un changement du réglage système quand « Système » est choisi.
  useEffect(() => {
    if (preference !== "system") return;
    const media = window.matchMedia(DARK_QUERY);
    const onSystemChange = () => applyTheme("system");
    media.addEventListener("change", onSystemChange);
    return () => media.removeEventListener("change", onSystemChange);
  }, [preference]);

  function choose(value: ThemePreference) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {
      // Stockage indisponible (navigation privée stricte) : le choix vaut pour la page.
    }
    applyTheme(value);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  const compact = variant === "compact";

  return (
    <div
      role="radiogroup"
      aria-label={t("label")}
      className={`flex gap-px border border-line bg-line ${className}`}
    >
      {options.map(({ value, Icon }) => {
        // sans « Système », le bouton du thème affiché reste coché
        const active = withSystem ? preference === value : resolved === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={compact ? t(value) : undefined}
            title={compact ? t(value) : undefined}
            onClick={() => choose(value)}
            className={`flex flex-1 items-center justify-center gap-2 text-[13px] font-semibold transition-colors ${
              compact ? "h-9 w-9" : "h-11 px-3"
            } ${
              active
                ? "bg-foreground text-background"
                : "bg-surface text-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {!compact && <span>{t(value)}</span>}
          </button>
        );
      })}
    </div>
  );
}
