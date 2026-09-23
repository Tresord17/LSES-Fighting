"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { signUpAction, type FormState } from "@/lib/auth/actions";
import { Field } from "@/components/forms/Field";
import { PasswordField } from "@/components/forms/PasswordField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormAlert } from "@/components/forms/FormAlert";
import { useErrorText } from "@/components/forms/useErrorText";
import { MailIcon } from "@/components/ui/icons";
import { GoogleButton } from "./GoogleButton";
import { OrDivider } from "./AuthIntro";

const initialState: FormState = { status: "idle" };
const ROLES = ["athlete", "coach"] as const;

export function SignUpForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const errorText = useErrorText();
  const [role, setRole] = useState<(typeof ROLES)[number]>("athlete");
  const [state, action] = useActionState(signUpAction, initialState);

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-4 border-l-3 border-gold bg-surface p-5">
        <MailIcon className="h-7 w-7 text-gold-ink" />
        <h2 className="font-display text-2xl font-bold uppercase">{t("signup.checkEmailTitle")}</h2>
        <p className="text-sm leading-relaxed text-muted">
          {t("signup.checkEmailText", { email: state.email ?? "" })}
        </p>
        <p className="text-xs text-subtle">{t("signup.checkEmailHint")}</p>
      </div>
    );
  }

  const fields = state.fields ?? {};

  return (
    <div className="flex flex-col gap-6">
      <form action={action} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="locale" value={locale} />

        <fieldset className="flex flex-col gap-2.25">
          <legend className="mb-2.25 eyebrow tracking-[0.16em] text-subtle">
            {t("signup.roleLabel")}
          </legend>
          <div className="flex gap-2.25">
            {ROLES.map((value) => (
              <label
                key={value}
                className={`flex h-13.5 flex-1 cursor-pointer items-center justify-center font-display text-[19px] font-bold tracking-[0.04em] uppercase transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-gold ${
                  role === value
                    ? "bg-gold text-on-gold"
                    : "border border-line-strong text-muted hover:text-foreground"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={value}
                  checked={role === value}
                  onChange={() => setRole(value)}
                  className="sr-only"
                />
                {t(`signup.${value}`)}
              </label>
            ))}
          </div>
          {fields.role && <p className="text-xs text-blood-ink">{errorText(fields.role)}</p>}
        </fieldset>

        <Field
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          label={t("fields.email")}
          placeholder={t("fields.emailPlaceholder")}
          error={errorText(fields.email)}
        />
        <PasswordField
          name="password"
          autoComplete="new-password"
          required
          minLength={10}
          label={t("fields.password")}
          placeholder={t("fields.passwordHint")}
          error={errorText(fields.password)}
        />

        <div className="flex flex-col gap-1.5">
          <label className="flex cursor-pointer items-start gap-2.75">
            <input
              type="checkbox"
              name="consent"
              required
              className="mt-0.5 h-5 w-5 shrink-0 accent-gold"
            />
            <span className="text-xs leading-relaxed text-muted">{t("signup.consent")}</span>
          </label>
          {fields.consent && <p className="text-xs text-blood-ink">{errorText(fields.consent)}</p>}
        </div>

        {state.status === "error" && state.error && (
          <FormAlert tone="error">{errorText(state.error)}</FormAlert>
        )}

        <SubmitButton>{t("signup.submit")}</SubmitButton>
      </form>

      <OrDivider label={t("or")} />
      <GoogleButton role={role} />

      <p className="flex justify-center gap-1.5 text-[13px] text-muted">
        {t("signup.haveAccount")}
        <Link href="/connexion" className="font-semibold text-gold-ink hover:text-gold-ink-hover">
          {t("signup.login")}
        </Link>
      </p>

      <aside className="flex flex-col gap-3.5 border-l-3 border-gold bg-surface p-4.5">
        <h2 className="eyebrow tracking-[0.16em] text-gold-ink">{t("signup.nextTitle")}</h2>
        <ol className="flex flex-col gap-3.5">
          {[
            t("signup.step1"),
            t("signup.step2"),
            t(role === "coach" ? "signup.step3Coach" : "signup.step3Athlete"),
          ].map((text, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="w-4 shrink-0 font-display text-lg font-bold text-gold-ink">
                {index + 1}
              </span>
              <span className="text-[12.5px] leading-normal text-muted">{text}</span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
