"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { markReviewedAction } from "@/lib/review/actions";
import type { RosterAthlete } from "@/lib/review/queue";
import { FormAlert } from "@/components/forms/FormAlert";
import { useErrorText } from "@/components/forms/useErrorText";
import { AthleteFacts, Thumb, athleteMeta } from "./ReviewParts";

// Carré de couleur : vert en ligne, doré à revoir, rouge sang refusée
const DOTS = {
  approved: "bg-success",
  modified: "bg-gold",
  pending: "border border-gold",
  rejected: "bg-blood",
  draft: "border border-line-strong",
} as const;

function RosterRow({
  athlete,
  onDone,
}: {
  athlete: RosterAthlete;
  onDone: (message: string, name: string) => void;
}) {
  const t = useTranslations("review.roster");
  const locale = useLocale();
  const errorText = useErrorText();
  const bodyId = useId();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const key = athlete.modified ? "modified" : athlete.status;
  const label = (
    <>
      <span aria-hidden="true" className={`h-2 w-2 shrink-0 ${DOTS[key]}`} />
      <span className="grow text-sm font-medium">{athlete.name}</span>
      <span
        className={`font-mono text-[10px] uppercase ${athlete.modified ? "text-gold-ink" : "text-subtle"}`}
      >
        {t(`status.${key}`)}
      </span>
    </>
  );

  if (!athlete.modified) {
    return <li className="flex items-center gap-2.75 bg-surface px-3.25 py-3">{label}</li>;
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const outcome = await markReviewedAction(data);
      startTransition(() => {
        if (outcome.status === "success") onDone(outcome.message, athlete.name);
        else setError(outcome.message);
      });
    });
  }

  return (
    <li className="bg-surface">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2.75 px-3.25 py-3 text-left transition-colors hover:bg-line/40"
      >
        {label}
      </button>
      <div id={bodyId} hidden={!open} className="px-3.25 pb-3.25">
        <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="athlete_id" value={athlete.id} />
          <p className="text-xs leading-relaxed text-muted">{t("modifiedNote")}</p>
          <div className="flex gap-3.5">
            <Thumb url={athlete.photoUrl} alt="" size="lg" />
            <div className="flex min-w-0 grow flex-col gap-3">
              <p className="font-mono text-[10px] text-subtle uppercase">{athleteMeta(athlete)}</p>
              <AthleteFacts athlete={athlete} />
            </div>
          </div>
          {error && <FormAlert tone="error">{errorText(error)}</FormAlert>}
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 items-center justify-center bg-admin-fill px-5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {t("markReviewed")}
          </button>
        </form>
      </div>
    </li>
  );
}

export function RosterList({
  athletes,
  onDone,
}: {
  athletes: RosterAthlete[];
  onDone: (message: string, name: string) => void;
}) {
  return (
    <ul className="flex flex-col gap-px bg-line">
      {athletes.map((athlete) => (
        <RosterRow key={athlete.id} athlete={athlete} onDone={onDone} />
      ))}
    </ul>
  );
}
