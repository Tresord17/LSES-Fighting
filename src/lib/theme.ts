// Thème clair / sombre.
// Règle métier : à la première visite on suit le réglage du système,
// ensuite le choix manuel est retenu sur l'appareil (localStorage).

export const THEME_STORAGE_KEY = "lses-theme";
export const THEME_CHANGE_EVENT = "lses-theme-change";

export const THEME_PREFERENCES = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_PREFERENCES.includes(value as ThemePreference);
}

// Script exécuté dans <head> AVANT le premier affichage : il pose
// data-theme sur <html> pour éviter tout clignotement du mauvais thème.
// Il doit rester autonome (aucun import) car il est injecté tel quel.
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");if(p!=="light"&&p!=="dark")p="system";var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.dataset.theme=d?"dark":"light";r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
