"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { reviewCoachAction } from "@/lib/supervisor/actions";
import type { ReviewResult } from "@/lib/review/actions";
import { REASON_MAX_LENGTH } from "@/lib/review/schemas";
import type { CoachRequest } from "@/lib/supervisor/data";
import { FormAlert } from "@/components/forms/FormAlert";
import { TextAreaField } from "@/components/forms/TextAreaField";
import { useErrorText } from "@/components/forms/useErrorText";
import { Note } from "@/components/profile/ProfileParts";
import { Thumb } from "@/components/review/ReviewParts";
import { CheckIcon } from "@/components/ui/icons";

const GONE = ["request_closed", "request_not_found"];
const disciplineLabel = (value: string) => (value === "mma" ? "MMA" : "Sambo");

// Compte de coach en attente : présentation, avertissement, décision
export function CoachAccountCard({
  request,
  defaultOpen = false,
  onDone,
  onGone,
}: {
  request: CoachRequest;
  defaultOpen?: boolean;
  onDone: (message: string, name: string) => void;
  onGone: (message: string, name: string) => void;
}) {
  const t = useTranslations("supervisor.coaches");
  const format = useFormatter();
  const locale = useLocale();
  const errorText = useErrorText();
  const bodyId = useId();
  const [open, setOpen] = useState(defaultOpen);
  const [rejecting, setRejecting] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [pending, startTransition] = useTransition();
  const { coach } = request;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const data = submitter
      ? new FormData(event.currentTarget, submitter)
      : new FormData(event.currentTarget);
    startTransition(async () => {
      const outcome = await reviewCoachAction(data);
      startTransition(() => {
        if (outcome.status === "success") onDone(outcome.message, coach.name);
        else if (GONE.includes(outcome.message)) onGone(outcome.message, coach.name);
        else setResult(outcome);
      });
    });
  }

  const reasonError = result?.fields?.reason ? errorText(result.fields.reason) : undefined;
  const facts: [string, string][] = [
    [
      t("facts.disciplines"),
      coach.disciplines.map(disciplineLabel).join(" · ") || t("facts.empty"),
    ],
    [t("facts.city"), coach.city ?? t("facts.empty")],
    [
      t("facts.experience"),
      coach.experienceYears !== null
        ? t("facts.years", { count: coach.experienceYears })
        : t("facts.empty"),
    ],
    [t("facts.dojo"), coach.dojoName ?? t("facts.empty")],
  ];

  return (
    <article className="border-l-3 border-admin-fill bg-surface">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start gap-3 p-3.25 text-left transition-colors hover:bg-line/40"
      >
        <Thumb url={coach.photoUrl} alt="" size={open ? "md" : "sm"} />
        <span className="flex min-w-0 grow flex-col gap-1.25">
          <span className="font-display text-lg leading-[1.05] font-bold uppercase">
            {coach.name}
          </span>
          <span className="font-mono text-[10px] text-subtle uppercase">
            {[
              coach.disciplines.map(disciplineLabel).join(" · "),
              coach.city,
              coach.experienceYears !== null
                ? t("experience", { count: coach.experienceYears })
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
          <span className="font-mono text-[10px] text-subtle uppercase">
            {[
              coach.dojoName,
              t("submitted", {
                date: format.dateTime(new Date(request.submittedAt), {
                  day: "numeric",
                  month: "short",
                }),
              }),
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
      </button>

      <div id={bodyId} hidden={!open}>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 px-3.25 pb-3.25">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="request_id" value={request.id} />

          <div className="flex gap-3.5">
            {coach.photoUrl && (
              <a
                href={coach.photoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0"
              >
                <Thumb url={coach.photoUrl} alt={t("photoAlt", { name: coach.name })} size="lg" />
              </a>
            )}
            <dl className="grid min-w-0 grow grid-cols-2 gap-px bg-line">
              {facts.map(([label, value]) => (
                <div key={label} className="flex flex-col gap-1 bg-background px-3 py-2.5">
                  <dt className="eyebrow tracking-[0.12em] text-subtle">{label}</dt>
                  <dd className="text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {coach.bio && (
            <div className="flex flex-col gap-1.5">
              <p className="eyebrow tracking-[0.12em] text-subtle">{t("bio")}</p>
              <p className="border-l-2 border-line-strong pl-3 text-[13px] leading-relaxed whitespace-pre-line text-muted">
                {coach.bio}
              </p>
            </div>
          )}

          {!rejecting && <Note>{t("warning")}</Note>}

          {result?.status === "error" && !reasonError && (
            <FormAlert tone="error">{errorText(result.message)}</FormAlert>
          )}

          {rejecting && (
            <>
              <TextAreaField
                id={`motif-coach-${request.id}`}
                name="reason"
                label={t("reason")}
                placeholder={t("reasonPlaceholder")}
                maxLength={REASON_MAX_LENGTH}
                rows={3}
                required
                autoFocus
                error={reasonError}
              />
              <p className="-mt-2.5 text-[11px] leading-normal text-subtle">{t("reasonHint")}</p>
            </>
          )}

          <div className="flex gap-2">
            {rejecting ? (
              <>
                <button
                  type="submit"
                  name="decision"
                  value="reject"
                  disabled={pending}
                  className="inline-flex h-12 grow items-center justify-center bg-blood text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                >
                  {pending ? t("sending") : t("confirmReject")}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setRejecting(false);
                    setResult(null);
                  }}
                  className="inline-flex h-12 w-28 shrink-0 items-center justify-center border border-line-strong text-sm font-semibold transition hover:border-gold"
                >
                  {t("cancel")}
                </button>
              </>
            ) : (
              <>
                <button
                  type="submit"
                  name="decision"
                  value="approve"
                  disabled={pending}
                  className="inline-flex h-12 grow items-center justify-center gap-2 bg-admin-fill text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                >
                  <CheckIcon className="h-4 w-4" />
                  {pending ? t("sending") : t("approve")}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setRejecting(true);
                    setResult(null);
                  }}
                  className="inline-flex h-12 w-28 shrink-0 items-center justify-center border border-line-strong text-sm font-semibold transition hover:border-blood"
                >
                  {t("reject")}
                </button>
              </>
            )}
          </div>
          <p className="font-mono text-[9.5px] leading-normal text-subtle uppercase">
            {t("signed")}
          </p>
        </form>
      </div>
    </article>
  );
}
