"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { updatePasswordAction, type FormState } from "@/lib/auth/actions";
import { PasswordField } from "@/components/forms/PasswordField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormAlert } from "@/components/forms/FormAlert";
import { useErrorText } from "@/components/forms/useErrorText";

const initialState: FormState = { status: "idle" };

export function NewPasswordForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const errorText = useErrorText();
  const [state, action] = useActionState(updatePasswordAction, initialState);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <PasswordField
        name="password"
        autoComplete="new-password"
        required
        minLength={10}
        label={t("fields.password")}
        placeholder={t("fields.passwordHint")}
        error={errorText(state.fields?.password)}
      />
      <PasswordField
        name="confirm"
        autoComplete="new-password"
        required
        label={t("newPassword.confirm")}
        error={errorText(state.fields?.confirm)}
      />
      {state.status === "error" && state.error && (
        <FormAlert tone="error">{errorText(state.error)}</FormAlert>
      )}
      <SubmitButton>{t("newPassword.submit")}</SubmitButton>
    </form>
  );
}
