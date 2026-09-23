"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { saveAthleteProfileAction, type ProfileFormState } from "@/lib/profile/actions";
import {
  CITY_SUGGESTIONS,
  DISCIPLINES,
  MAJORITY_AGE,
  SEXES,
  ageFromBirthDate,
  formatWeightClass,
  weightClassesFor,
  type Discipline,
  type Sex,
} from "@/lib/profile/options";
import type { Database } from "@/lib/supabase/database.types";
import { Field } from "@/components/forms/Field";
import { SelectField } from "@/components/forms/SelectField";
import { TextAreaField } from "@/components/forms/TextAreaField";
import { useErrorText } from "@/components/forms/useErrorText";
import { FormFeedback } from "./FormFeedback";
import { PalmaresEditor, type PalmaresEntry } from "./PalmaresEditor";
import { PhotoUploader } from "./PhotoUploader";
import { FormSection, Note, ProgressBlock } from "./ProfileParts";
import { StatusBanner } from "./StatusBanner";
import { useManualAction } from "./useManualAction";

export type AthleteProfileData = {
  status: Database["public"]["Enums"]["review_status"];
  lastName: string | null;
  firstNames: string | null;
  birthDate: string | null;
  sex: Sex | null;
  discipline: Discipline | null;
  weightClass: string | null;
  city: string | null;
  coachId: string | null;
  bio: string | null;
  practiceSince: number | null;
  fightsCount: number | null;
  consent: boolean;
  rejectionReason: string | null;
};

type Props = {
  userId: string;
  data: AthleteProfileData;
  coaches: { id: string; label: string }[];
  entries: PalmaresEntry[];
  photoUrl: string | null;
};

const FORM_ID = "profil-athlete";
const IDENTITY_FIELDS = ["last_name", "first_names", "birth_date", "sex"] as const;
const REQUIRED_FIELDS = [...IDENTITY_FIELDS, "discipline", "weight_class", "city"] as const;
const initialState: ProfileFormState = { status: "idle" };

function countMissing(form: HTMLFormElement | null, locked: boolean): number {
  if (!form) return REQUIRED_FIELDS.length + 1;
  const data = new FormData(form);
  let missing = 0;
  for (const name of REQUIRED_FIELDS) {
    if (locked && (IDENTITY_FIELDS as readonly string[]).includes(name)) continue;
    if (locked && name === "discipline") continue;
    if (!String(data.get(name) ?? "").trim()) missing += 1;
  }
  if (data.get("consent") !== "on") missing += 1;
  return missing;
}

export function AthleteProfileForm({ userId, data, coaches, entries, photoUrl }: Props) {
  const t = useTranslations("profile");
  const locale = useLocale();
  const errorText = useErrorText();
  const formRef = useRef<HTMLFormElement>(null);
  const { state, pending, onSubmit } = useManualAction(saveAthleteProfileAction, initialState);
  const fields = state.fields ?? {};

  const locked = data.status === "approved";
  const canSubmit = data.status === "draft" || data.status === "rejected";
  const [discipline, setDiscipline] = useState<Discipline | null>(data.discipline);
  const [sex, setSex] = useState<Sex | null>(data.sex);
  const [weightClass, setWeightClass] = useState(data.weightClass ?? "");
  const [birthDate, setBirthDate] = useState(data.birthDate ?? "");
  const [consent, setConsent] = useState(data.consent);
  const [missing, setMissing] = useState<number | null>(null);

  const classes = weightClassesFor(discipline, sex, data.weightClass);
  const age = ageFromBirthDate(birthDate);
  const isMinor = age !== null && age < MAJORITY_AGE;
  const total = REQUIRED_FIELDS.length + 1;
  const shownRemaining = missing ?? initialMissing(data, locked);

  function refreshProgress() {
    setMissing(countMissing(formRef.current, locked));
  }

  function changeDiscipline(value: Discipline) {
    setDiscipline(value);
    if (weightClass && !weightClassesFor(value, sex).includes(weightClass)) setWeightClass("");
  }

  function changeSex(value: Sex | null) {
    setSex(value);
    if (weightClass && !weightClassesFor(discipline, value).includes(weightClass))
      setWeightClass("");
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

      <StatusBanner status={data.status} kind="athlete" reason={data.rejectionReason} />

      <ProgressBlock
        step={t("step")}
        remaining={t("remaining", { count: shownRemaining })}
        ratio={(total - shownRemaining) / total}
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
            <Field
              name="birth_date"
              type="date"
              label={t("fields.birthDate")}
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              min="1920-01-01"
              autoComplete="bday"
              disabled={locked}
              className="font-mono"
              error={errorText(fields.birth_date)}
            />
            <SelectField
              name="sex"
              label={t("fields.sex")}
              value={sex ?? ""}
              onChange={(event) => changeSex((event.target.value || null) as Sex | null)}
              disabled={locked}
              error={errorText(fields.sex)}
            >
              <option value="">{t("fields.choose")}</option>
              {SEXES.map((value) => (
                <option key={value} value={value}>
                  {t(`fields.sexOptions.${value}`)}
                </option>
              ))}
            </SelectField>
          </div>
          <Note>{locked ? t("lockedNote") : t("birthDateNote")}</Note>
        </FormSection>

        <FormSection title={t("sections.practice")}>
          <fieldset className="flex flex-col gap-1.75" disabled={locked}>
            <legend className="mb-1.75 eyebrow tracking-[0.12em] text-subtle">
              {t("fields.discipline")}
            </legend>
            <div className="flex gap-2.25">
              {DISCIPLINES.map((value) => (
                <label
                  key={value}
                  className={`flex h-12.5 flex-1 cursor-pointer items-center justify-center font-display text-lg font-bold tracking-[0.04em] uppercase transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-gold ${
                    discipline === value
                      ? "bg-gold text-on-gold"
                      : "border border-line-strong text-muted hover:text-foreground"
                  } ${locked ? "cursor-not-allowed opacity-70" : ""}`}
                >
                  <input
                    type="radio"
                    name="discipline"
                    value={value}
                    checked={discipline === value}
                    onChange={() => changeDiscipline(value)}
                    className="sr-only"
                  />
                  {value === "mma" ? "MMA" : "Sambo"}
                </label>
              ))}
            </div>
            {fields.discipline && (
              <p className="text-xs text-blood-ink">{errorText(fields.discipline)}</p>
            )}
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <SelectField
              name="weight_class"
              label={t("fields.weightClass")}
              value={weightClass}
              onChange={(event) => setWeightClass(event.target.value)}
              className="font-mono"
              error={errorText(fields.weight_class)}
            >
              <option value="">{t("fields.choose")}</option>
              {classes.map((value) => (
                <option key={value} value={value}>
                  {formatWeightClass(value)}
                </option>
              ))}
            </SelectField>
            <Field
              name="city"
              label={t("fields.city")}
              defaultValue={data.city ?? ""}
              list="villes"
              autoComplete="address-level2"
              maxLength={80}
              error={errorText(fields.city)}
            />
            <datalist id="villes">
              {CITY_SUGGESTIONS.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
            <Field
              name="practice_since"
              label={t("fields.practiceSince")}
              defaultValue={data.practiceSince ?? ""}
              inputMode="numeric"
              maxLength={4}
              className="font-mono"
              error={errorText(fields.practice_since)}
            />
            <Field
              name="fights_count"
              label={t("fields.fightsCount")}
              defaultValue={data.fightsCount ?? ""}
              inputMode="numeric"
              maxLength={4}
              className="font-mono"
              error={errorText(fields.fights_count)}
            />
          </div>

          <SelectField
            name="coach_id"
            label={t("fields.coach")}
            defaultValue={data.coachId ?? ""}
            hint={t("fields.coachHint")}
            error={errorText(fields.coach_id)}
          >
            <option value="">{t("fields.coachNone")}</option>
            {coaches.map((coach) => (
              <option key={coach.id} value={coach.id}>
                {coach.label}
              </option>
            ))}
          </SelectField>

          <TextAreaField
            name="bio"
            label={t("fields.bio")}
            defaultValue={data.bio ?? ""}
            placeholder={t("fields.bioPlaceholder")}
            maxLength={1500}
            rows={5}
            error={errorText(fields.bio)}
          />
        </FormSection>
      </form>

      <FormSection title={t("sections.palmares")} aside={t("palmares.later")}>
        <PalmaresEditor entries={entries} weightClasses={weightClassesFor(discipline, sex)} />
      </FormSection>

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
            {t("publication.consentAthlete")}
          </span>
        </label>
        {locked && !consent && (
          <p className="text-xs text-blood-ink">{t("publication.withdrawWarning")}</p>
        )}
        {isMinor && (
          <div className="border-l-3 border-blood bg-surface px-4 py-3 text-xs leading-relaxed text-foreground">
            {t("publication.minor")}
          </div>
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
              {t("submit")}
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
          {t("publication.footnote")}
        </p>
      </FormSection>
    </div>
  );
}

// Nombre de champs manquants au premier affichage, à partir des données enregistrées
function initialMissing(data: AthleteProfileData, locked: boolean): number {
  const values: Record<string, unknown> = {
    last_name: data.lastName,
    first_names: data.firstNames,
    birth_date: data.birthDate,
    sex: data.sex,
    discipline: data.discipline,
    weight_class: data.weightClass,
    city: data.city,
  };
  let missing = 0;
  for (const [name, value] of Object.entries(values)) {
    if (locked && (name === "discipline" || (IDENTITY_FIELDS as readonly string[]).includes(name)))
      continue;
    if (value === null || value === "") missing += 1;
  }
  if (!data.consent) missing += 1;
  return missing;
}
