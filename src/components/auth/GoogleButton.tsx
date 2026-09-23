"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { signInWithGoogleAction, type FormState } from "@/lib/auth/actions";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormAlert } from "@/components/forms/FormAlert";
import { useErrorText } from "@/components/forms/useErrorText";

const initialState: FormState = { status: "idle" };

// Le rôle choisi sur la page d'inscription accompagne la redirection vers
// Google : il est appliqué au retour si le compte est nouveau.
export function GoogleButton({ role, next }: { role?: "athlete" | "coach"; next?: string }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const errorText = useErrorText();
  const [state, action] = useActionState(signInWithGoogleAction, initialState);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      {role && <input type="hidden" name="role" value={role} />}
      {next && <input type="hidden" name="next" value={next} />}
      <SubmitButton variant="outline">{t("google")}</SubmitButton>
      {state.status === "error" && <FormAlert tone="error">{errorText(state.error)}</FormAlert>}
    </form>
  );
}
