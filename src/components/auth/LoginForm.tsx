"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { signInAction, type FormState } from "@/lib/auth/actions";
import { Field } from "@/components/forms/Field";
import { PasswordField } from "@/components/forms/PasswordField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormAlert } from "@/components/forms/FormAlert";
import { useErrorText } from "@/components/forms/useErrorText";
import { GoogleButton } from "./GoogleButton";
import { OrDivider } from "./AuthIntro";

const initialState: FormState = { status: "idle" };

export function LoginForm({ next, linkError }: { next?: string; linkError?: string }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const errorText = useErrorText();
  const [state, action] = useActionState(signInAction, initialState);
  const fields = state.fields ?? {};

  return (
    <div className="flex flex-col gap-6">
      {linkError && state.status === "idle" && <FormAlert tone="error">{linkError}</FormAlert>}

      <form action={action} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="locale" value={locale} />
        {next && <input type="hidden" name="next" value={next} />}
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
          autoComplete="current-password"
          required
          label={t("fields.password")}
          error={errorText(fields.password)}
        />
        <Link
          href="/mot-de-passe-oublie"
          className="self-end text-xs font-semibold text-gold-ink hover:text-gold-ink-hover"
        >
          {t("login.forgot")}
        </Link>

        {state.status === "error" && state.error && (
          <FormAlert tone="error">{errorText(state.error)}</FormAlert>
        )}
        <SubmitButton>{t("login.submit")}</SubmitButton>
      </form>

      <OrDivider label={t("or")} />
      <GoogleButton next={next} />

      <p className="flex justify-center gap-1.5 text-[13px] text-muted">
        {t("login.noAccount")}
        <Link href="/inscription" className="font-semibold text-gold-ink hover:text-gold-ink-hover">
          {t("login.signup")}
        </Link>
      </p>
    </div>
  );
}
