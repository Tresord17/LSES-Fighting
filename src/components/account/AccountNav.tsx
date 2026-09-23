"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { useSignedIn } from "./useSignedIn";

type Props = {
  variant: "header" | "menu";
  onNavigate?: () => void;
};

// « Connexion » et « Rejoindre », ou « Mon espace » une fois connecté.
export function AccountNav({ variant, onNavigate }: Props) {
  const t = useTranslations("nav");
  const signedIn = useSignedIn();

  if (variant === "header") {
    return signedIn ? (
      <ButtonLink href="/mon-espace" size="sm" variant="outline">
        {t("account")}
      </ButtonLink>
    ) : (
      <>
        <Link href="/connexion" className="text-sm font-semibold text-muted hover:text-foreground">
          {t("login")}
        </Link>
        <ButtonLink href="/inscription" size="sm">
          {t("join")}
        </ButtonLink>
      </>
    );
  }

  return signedIn ? (
    <ButtonLink href="/mon-espace" className="flex-1" onClick={onNavigate}>
      {t("account")}
    </ButtonLink>
  ) : (
    <>
      <ButtonLink href="/inscription" className="flex-1" onClick={onNavigate}>
        {t("join")}
      </ButtonLink>
      <ButtonLink href="/connexion" variant="outline" onClick={onNavigate}>
        {t("login")}
      </ButtonLink>
    </>
  );
}
