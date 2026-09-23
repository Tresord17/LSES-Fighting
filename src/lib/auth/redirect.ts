import { hasLocale } from "next-intl";
import { routing, type Locale } from "@/i18n/routing";

export function pickLocale(value: string | null | undefined): Locale {
  return hasLocale(routing.locales, value) ? value : routing.defaultLocale;
}

export function accountHome(locale: Locale): string {
  return `/${locale}/mon-espace`;
}

// Protection contre les redirections ouvertes : seul un chemin interne,
// préfixé par une langue connue, est accepté après connexion.
export function safeNextPath(value: string | null | undefined, locale: Locale): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\") ||
    value.includes("://")
  ) {
    return accountHome(locale);
  }
  const firstSegment = value.split(/[/?#]/)[1];
  return hasLocale(routing.locales, firstSegment) ? value : accountHome(locale);
}
