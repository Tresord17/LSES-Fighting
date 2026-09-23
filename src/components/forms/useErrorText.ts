"use client";

import { useTranslations } from "next-intl";

// Transforme une clé d'erreur renvoyée par le serveur en texte traduit :
// d'abord les erreurs d'authentification, puis celles de la base.
export function useErrorText() {
  const t = useTranslations();
  return (key: string | undefined): string | undefined => {
    if (!key) return undefined;
    if (t.has(`auth.errors.${key}` as never)) return t(`auth.errors.${key}` as never);
    if (t.has(`errors.${key}` as never)) return t(`errors.${key}` as never);
    return t("auth.errors.unknown");
  };
}
