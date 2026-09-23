"use client";

import type { ComponentProps } from "react";
import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { useAccountAction } from "@/components/account/useAccountStage";

type Props = Omit<ComponentProps<typeof ButtonLink>, "href" | "children"> & {
  guestLabel: string;
};

// « Rejoindre » pour un visiteur ; une fois connecté, « Compléter mon profil »,
// « Modifier mon profil » (fiche refusée) ou « Mon espace ».
export function AccountButton({ guestLabel, ...props }: Props) {
  const t = useTranslations("nav");
  const action = useAccountAction();

  return (
    <ButtonLink href={action?.href ?? "/inscription"} {...props}>
      {action ? t(action.label) : guestLabel}
    </ButtonLink>
  );
}
