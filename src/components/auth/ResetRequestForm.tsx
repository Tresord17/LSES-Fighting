"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { requestPasswordResetAction, type FormState } from "@/lib/auth/actions";
import { Field } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormAlert } from "@/components/forms/FormAlert";
import { useErrorText } from "@/components/forms/useErrorText";

const initialState: FormState = { status: "idle" };

export function ResetRequestForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const errorText = useErrorText();
  const [state, action] = useActionState(requestPasswordResetAction, initialState);

  return (
    <div className="flex flex-col gap-6">
      {state.status === "success" ? (
        <FormAlert tone="success">
          <strong className="block">{t("reset.sentTitle")}</strong>
          {t("reset.sentText", { email: state.email ?? "" })}
        </FormAlert>
      ) : (
        <form action={action} className="flex flex-col gap-4" noValidate>
          <input type="hidden" name="locale" value={locale} />
          <Field
            name="email"
            type="email"
            autoComplete="email"
            required
            label={t("fields.email")}
            placeholder={t("fields.emailPlaceholder")}
            error={errorText(state.fields?.email)}
          />
          {state.status === "error" && state.error && (
            <FormAlert tone="error">{errorText(state.error)}</FormAlert>
          )}
          <SubmitButton>{t("reset.submit")}</SubmitButton>
        </form>
      )}
      <Link
        href="/connexion"
        className="text-center text-[13px] font-semibold text-gold-ink hover:text-gold-ink-hover"
      >
        {t("reset.back")}
      </Link>
    </div>
  );
}
