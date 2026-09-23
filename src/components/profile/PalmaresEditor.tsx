"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  addPalmaresEntryAction,
  deletePalmaresEntryAction,
  type ProfileFormState,
} from "@/lib/profile/actions";
import { RESULTS, formatWeightClass, type CompetitionResult } from "@/lib/profile/options";
import { Field } from "@/components/forms/Field";
import { SelectField } from "@/components/forms/SelectField";
import { useErrorText } from "@/components/forms/useErrorText";
import { CloseIcon } from "@/components/ui/icons";
import { FormFeedback } from "./FormFeedback";
import { useManualAction } from "./useManualAction";

export type PalmaresEntry = {
  id: string;
  competition: string;
  year: number;
  location: string | null;
  weightClass: string | null;
  result: CompetitionResult;
  status: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
};

const initialState: ProfileFormState = { status: "idle" };

const STATUS_STYLES = {
  approved: "border-success text-success",
  pending: "border-gold text-gold-ink",
  rejected: "border-blood text-blood-ink",
};

export function PalmaresEditor({
  entries,
  weightClasses,
}: {
  entries: PalmaresEntry[];
  weightClasses: string[];
}) {
  const t = useTranslations("profile.palmares");
  const locale = useLocale();
  const errorText = useErrorText();
  const formRef = useRef<HTMLFormElement>(null);
  const add = useManualAction(addPalmaresEntryAction, initialState);
  const remove = useManualAction(deletePalmaresEntryAction, initialState);
  const fields = add.state.fields ?? {};

  // Formulaire vidé après un ajout réussi
  useEffect(() => {
    if (add.state.status === "success") formRef.current?.reset();
  }, [add.state]);

  return (
    <div className="flex flex-col gap-3.5">
      <form
        ref={formRef}
        onSubmit={add.onSubmit}
        noValidate
        className="flex flex-col gap-3 border-l-3 border-gold bg-surface p-3.5"
      >
        <input type="hidden" name="locale" value={locale} />
        <div className="grid grid-cols-2 gap-2.75">
          <div className="col-span-2 sm:col-span-1">
            <Field
              name="competition"
              label={t("competition")}
              placeholder={t("competitionPlaceholder")}
              maxLength={160}
              error={errorText(fields.competition)}
            />
          </div>
          <Field
            name="year"
            label={t("year")}
            inputMode="numeric"
            placeholder={String(new Date().getFullYear())}
            maxLength={4}
            className="font-mono"
            error={errorText(fields.year)}
          />
          <Field
            name="location"
            label={t("location")}
            maxLength={120}
            error={errorText(fields.location)}
          />
          <SelectField
            name="result"
            label={t("result")}
            defaultValue="gold"
            error={errorText(fields.result)}
          >
            {RESULTS.map((value) => (
              <option key={value} value={value}>
                {t(`results.${value}`)}
              </option>
            ))}
          </SelectField>
          <SelectField name="weight_class" label={t("weightClass")} defaultValue="">
            <option value="">—</option>
            {weightClasses.map((value) => (
              <option key={value} value={value}>
                {formatWeightClass(value)}
              </option>
            ))}
          </SelectField>
        </div>
        <button
          type="submit"
          disabled={add.pending}
          className="inline-flex h-11 items-center justify-center border border-line-strong text-sm font-semibold transition-colors hover:border-gold disabled:opacity-60"
        >
          + {t("add")}
        </button>
        <FormFeedback state={add.state} />
      </form>

      {entries.length === 0 ? (
        <p className="text-[13px] text-subtle">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-px bg-line">
          {entries.map((entry) => {
            const name = `${entry.year} · ${entry.competition}`;
            return (
              <li key={entry.id} className="flex items-center gap-3 bg-surface px-3.25 py-3">
                <span className="shrink-0 font-mono text-xs text-muted">{entry.year}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[13px] leading-snug font-medium break-words">
                    {entry.competition} · {t(`results.${entry.result}`)}
                  </span>
                  {(entry.location || entry.weightClass) && (
                    <span className="truncate text-[11px] text-subtle">
                      {[entry.location, formatWeightClass(entry.weightClass)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  )}
                  {entry.status === "rejected" && entry.rejectionReason && (
                    <span className="text-[11px] text-blood-ink">
                      {t("reason", { reason: entry.rejectionReason })}
                    </span>
                  )}
                </span>
                <span
                  className={`shrink-0 border px-1.75 py-1 font-mono text-[9px] tracking-widest uppercase ${STATUS_STYLES[entry.status]}`}
                >
                  {t(`status.${entry.status}`)}
                </span>
                <form onSubmit={remove.onSubmit}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={entry.id} />
                  <button
                    type="submit"
                    disabled={remove.pending}
                    aria-label={t("delete", { name })}
                    title={t("delete", { name })}
                    className="flex h-9 w-9 items-center justify-center text-subtle hover:text-blood-ink disabled:opacity-50"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
      {remove.state.status === "error" && <FormFeedback state={remove.state} />}
      <p className="text-[11.5px] leading-relaxed text-subtle">{t("note")}</p>
    </div>
  );
}
