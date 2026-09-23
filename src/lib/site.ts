// Réglages globaux du site. Les liens vers les réseaux sociaux ne s'affichent
// que s'ils sont renseignés (à obtenir auprès du client).
export const SITE_NAME = "LSES Fighting";

export const NAV_ITEMS = [
  { href: "/", key: "home" },
  { href: "/disciplines/sambo", key: "sambo" },
  { href: "/disciplines/mma", key: "mma" },
  { href: "/athletes", key: "athletes" },
  { href: "/coachs", key: "coaches" },
  { href: "/actualites", key: "news" },
] as const;

export const SOCIAL_LINKS: {
  whatsapp: string | null;
  facebook: string | null;
  instagram: string | null;
} = {
  whatsapp: null,
  facebook: null,
  instagram: null,
};

// Rubrique active : correspondance exacte pour l'accueil, par préfixe pour
// les autres (une fiche d'athlète garde « Athlètes » actif).
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
