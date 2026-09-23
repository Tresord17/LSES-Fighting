"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { chooseRoleAction, type FormState } from "@/lib/auth/actions";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormAlert } from "@/components/forms/FormAlert";
import { useErrorText } from "@/components/forms/useErrorText";

const initialState: FormState = { status: "idle" };

export function ChooseRoleForm({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const errorText = useErrorText();
  const [state, action] = useActionState(chooseRoleAction, initialState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      <fieldset className="flex flex-col gap-2.5">
        <legend className="sr-only">{t("welcome.title")}</legend>
        {(["athlete", "coach"] as const).map((value) => (
          <label
            key={value}
            className="flex cursor-pointer items-start gap-3.5 border border-line-strong bg-surface p-4 transition-colors has-checked:border-gold has-checked:bg-gold/10 has-focus-visible:outline-2 has-focus-visible:outline-gold"
          >
            <input
              type="radio"
              name="role"
              value={value}
              required
              className="mt-1 h-4.5 w-4.5 accent-gold"
            />
            <span className="flex flex-col gap-1">
              <span className="font-display text-xl font-bold uppercase">
                {t(`signup.${value}`)}
              </span>
              <span className="text-[13px] leading-normal text-muted">
                {t(value === "athlete" ? "welcome.athleteText" : "welcome.coachText")}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      {state.fields?.role && <FormAlert tone="error">{errorText(state.fields.role)}</FormAlert>}
      {state.status === "error" && state.error && (
        <FormAlert tone="error">{errorText(state.error)}</FormAlert>
      )}
      <SubmitButton>{t("welcome.submit")}</SubmitButton>
    </form>
  );
}
