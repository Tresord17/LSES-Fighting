"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { saveCoachProfileAction, type ProfileFormState } from "@/lib/profile/actions";
import { CITY_SUGGESTIONS, DISCIPLINES, type Discipline } from "@/lib/profile/options";
import type { Database } from "@/lib/supabase/database.types";
import { Field } from "@/components/forms/Field";
import { TextAreaField } from "@/components/forms/TextAreaField";
import { useErrorText } from "@/components/forms/useErrorText";
import { FormFeedback } from "./FormFeedback";
import { PhotoUploader } from "./PhotoUploader";
import { FormSection, Note, ProgressBlock } from "./ProfileParts";
import { StatusBanner } from "./StatusBanner";
import { useManualAction } from "./useManualAction";

export type CoachProfileData = {
  status: Database["public"]["Enums"]["review_status"];
  lastName: string | null;
  firstNames: string | null;
  disciplines: Discipline[];
  city: string | null;
  dojoName: string | null;
  experienceYears: number | null;
  bio: string | null;
  consent: boolean;
  rejectionReason: string | null;
};

const FORM_ID = "profil-coach";
const initialState: ProfileFormState = { status: "idle" };
// Champs exigés par la base pour soumettre un compte de coach
const TOTAL = 5;

export function CoachProfileForm({
  userId,
  data,
  photoUrl,
}: {
  userId: string;
  data: CoachProfileData;
  photoUrl: string | null;
}) {
  const t = useTranslations("profile");
  const locale = useLocale();
  const errorText = useErrorText();
  const formRef = useRef<HTMLFormElement>(null);
  const { state, pending, onSubmit } = useManualAction(saveCoachProfileAction, initialState);
  const fields = state.fields ?? {};

  const locked = data.status === "approved";
  const canSubmit = data.status === "draft" || data.status === "rejected";
  const [disciplines, setDisciplines] = useState<Discipline[]>(data.disciplines);
  const [consent, setConsent] = useState(data.consent);
  const [missing, setMissing] = useState(
    () =>
      [data.lastName, data.firstNames, data.city].filter((v) => !v).length +
      (data.disciplines.length === 0 ? 1 : 0) +
      (data.consent ? 0 : 1),
  );

  function refreshProgress() {
    const form = formRef.current;
    if (!form) return;
    const values = new FormData(form);
    const text = (name: string) => String(values.get(name) ?? "").trim();
    const identity = locked ? 0 : [text("last_name"), text("first_names")].filter((v) => !v).length;
    setMissing(
      identity +
        (text("city") ? 0 : 1) +
        (values.getAll("disciplines").length ? 0 : 1) +
        (values.get("consent") === "on" ? 0 : 1),
    );
  }

  function toggleDiscipline(value: Discipline) {
    setDisciplines((current) =>
      current.includes(value) ? current.filter((d) => d !== value) : [...current, value],
    );
  }

  return (
    <div className="flex flex-col gap-7" onChange={refreshProgress}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <Link
            href="/mon-espace"
            className="text-xs font-semibold text-subtle hover:text-foreground"
          >
            ← {t("back")}
          </Link>
          <h1 className="font-display text-3xl font-extrabold tracking-[0.03em] uppercase md:text-4xl">
            {t("title")}
          </h1>
        </div>
        <button
          type="submit"
          form={FORM_ID}
          name="intent"
          value="save"
          disabled={pending}
          className="text-sm font-semibold text-muted hover:text-foreground disabled:opacity-60"
        >
          {pending ? t("saving") : t("save")}
        </button>
      </div>

      <StatusBanner status={data.status} kind="coach" reason={data.rejectionReason} />

      <ProgressBlock
        step={t("step")}
        remaining={t("remaining", { count: missing })}
        ratio={(TOTAL - missing) / TOTAL}
      />

      <form
        id={FORM_ID}
        ref={formRef}
        onSubmit={onSubmit}
        noValidate
        className="flex flex-col gap-7"
      >
        <input type="hidden" name="locale" value={locale} />

        <FormSection title={t("sections.identity")}>
          <div className="grid grid-cols-2 gap-3">
            <Field
              name="last_name"
              label={t("fields.lastName")}
              defaultValue={data.lastName ?? ""}
              autoComplete="family-name"
              maxLength={80}
              disabled={locked}
              className="uppercase"
              error={errorText(fields.last_name)}
            />
            <Field
              name="first_names"
              label={t("fields.firstNames")}
              defaultValue={data.firstNames ?? ""}
              autoComplete="given-name"
              maxLength={120}
              disabled={locked}
              error={errorText(fields.first_names)}
            />
          </div>
          {locked && <Note>{t("lockedNoteCoach")}</Note>}
        </FormSection>

        <FormSection title={t("sections.practice")}>
          <fieldset className="flex flex-col gap-1.75">
            <legend className="mb-1.75 eyebrow tracking-[0.12em] text-subtle">
              {t("fields.disciplines")}
            </legend>
            <div className="flex gap-2.25">
              {DISCIPLINES.map((value) => {
                const checked = disciplines.includes(value);
                return (
                  <label
                    key={value}
                    className={`flex h-12.5 flex-1 cursor-pointer items-center justify-center font-display text-lg font-bold tracking-[0.04em] uppercase transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-gold ${
                      checked
                        ? "bg-gold text-on-gold"
                        : "border border-line-strong text-muted hover:text-foreground"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="disciplines"
                      value={value}
                      checked={checked}
                      onChange={() => toggleDiscipline(value)}
                      className="sr-only"
                    />
                    {value === "mma" ? "MMA" : "Sambo"}
                  </label>
                );
              })}
            </div>
            {fields.disciplines && (
              <p className="text-xs text-blood-ink">{errorText(fields.disciplines)}</p>
            )}
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <Field
              name="city"
              label={t("fields.city")}
              defaultValue={data.city ?? ""}
              list="villes-coach"
              autoComplete="address-level2"
              maxLength={80}
              error={errorText(fields.city)}
            />
            <datalist id="villes-coach">
              {CITY_SUGGESTIONS.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
            <Field
              name="experience_years"
              label={t("fields.experience")}
              defaultValue={data.experienceYears ?? ""}
              inputMode="numeric"
              maxLength={2}
              className="font-mono"
              error={errorText(fields.experience_years)}
            />
            <div className="col-span-2">
              <Field
                name="dojo_name"
                label={t("fields.dojo")}
                defaultValue={data.dojoName ?? ""}
                maxLength={120}
                error={errorText(fields.dojo_name)}
              />
            </div>
          </div>

          <TextAreaField
            name="bio"
            label={t("fields.bio")}
            defaultValue={data.bio ?? ""}
            placeholder={t("fields.bioCoachPlaceholder")}
            maxLength={1500}
            rows={5}
            error={errorText(fields.bio)}
          />
        </FormSection>
      </form>

      <FormSection title={t("sections.photo")}>
        <PhotoUploader userId={userId} initialUrl={photoUrl} />
      </FormSection>

      <FormSection title={t("sections.publication")}>
        <label className="flex cursor-pointer items-start gap-2.75">
          <input
            type="checkbox"
            name="consent"
            form={FORM_ID}
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-gold"
          />
          <span className="text-xs leading-relaxed text-muted">
            {t("publication.consentCoach")}
          </span>
        </label>
        {locked && !consent && (
          <p className="text-xs text-blood-ink">{t("publication.withdrawWarning")}</p>
        )}

        <FormFeedback state={state} />

        <div className="flex flex-col gap-2.5">
          {canSubmit && (
            <button
              type="submit"
              form={FORM_ID}
              name="intent"
              value="submit"
              disabled={pending}
              className="inline-flex h-13.5 items-center justify-center bg-gold text-[15px] font-semibold text-on-gold transition hover:brightness-110 disabled:opacity-60"
            >
              {t("submitCoach")}
            </button>
          )}
          <button
            type="submit"
            form={FORM_ID}
            name="intent"
            value="save"
            disabled={pending}
            className={`inline-flex h-12 items-center justify-center text-sm font-semibold transition disabled:opacity-60 ${
              canSubmit
                ? "border border-line-strong text-foreground hover:border-gold"
                : "bg-gold text-on-gold hover:brightness-110"
            }`}
          >
            {pending ? t("saving") : canSubmit ? t("saveDraft") : t("save")}
          </button>
        </div>
        <p className="text-center eyebrow leading-relaxed tracking-[0.12em] text-subtle">
          {t("publication.footnoteCoach")}
        </p>
      </FormSection>
    </div>
  );
}
