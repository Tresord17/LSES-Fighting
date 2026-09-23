"use client";

import { useTranslations } from "next-intl";
import { FormAlert } from "@/components/forms/FormAlert";
import { useErrorText } from "@/components/forms/useErrorText";
import type { ProfileFormState } from "@/lib/profile/actions";

// Message affiché après un enregistrement (succès ou erreur)
export function FormFeedback({ state }: { state: ProfileFormState }) {
  const t = useTranslations("profile.feedback");
  const errorText = useErrorText();
  if (state.status === "idle" || !state.message) return null;
  if (state.status === "success") {
    return (
      <FormAlert tone="success">
        {t.has(state.message as never) ? t(state.message as never) : ""}
      </FormAlert>
    );
  }
  return <FormAlert tone="error">{errorText(state.message)}</FormAlert>;
}
