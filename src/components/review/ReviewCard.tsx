"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { reviewRequestAction, type ReviewResult } from "@/lib/review/actions";
import { REASON_MAX_LENGTH } from "@/lib/review/schemas";
import { formatWeightClass } from "@/lib/profile/options";
import type { QueueRequest } from "@/lib/review/queue";
import { FormAlert } from "@/components/forms/FormAlert";
import { TextAreaField } from "@/components/forms/TextAreaField";
import { useErrorText } from "@/components/forms/useErrorText";
import { AthleteFacts, Thumb, athleteMeta } from "./ReviewParts";

type Props = {
  request: QueueRequest;
  defaultOpen?: boolean;
  isSuperviseur: boolean;
  onDone: (message: string, name: string) => void;
  onGone: (message: string, name: string) => void;
};

// Erreurs après lesquelles la demande quitte la file (déjà tranchée ailleurs)
const GONE = ["request_closed", "request_not_found"];

// Pastille d'échéance : « J−3 », rouge sang le dernier jour ou après escalade
function DueBadge({ request, isSuperviseur }: { request: QueueRequest; isSuperviseur: boolean }) {
  const t = useTranslations("review.card");
  if (request.escalated) {
    return (
      <span
        className={`shrink-0 px-1.75 py-1 font-mono text-[10px] font-medium uppercase ${
          isSuperviseur ? "bg-blood text-white" : "border border-blood text-blood-ink"
        }`}
      >
        <span className="sr-only">{t("escalatedLabel")}</span>
        <span aria-hidden="true">{t("escalated")}</span>
      </span>
    );
  }
  if (request.daysLeft === null) return null;
  const urgent = request.daysLeft <= 1;
  return (
    <span
      className={`shrink-0 px-1.75 py-1 font-mono text-[10px] font-medium ${
        urgent ? "bg-blood text-white" : "border border-line-strong text-muted"
      }`}
    >
      <span className="sr-only">{t("dueLabel", { days: request.daysLeft })}</span>
      <span aria-hidden="true">{t("due", { days: request.daysLeft })}</span>
    </span>
  );
}

export function ReviewCard({ request, defaultOpen = false, isSuperviseur, onDone, onGone }: Props) {
  const t = useTranslations("review.card");
  const tResults = useTranslations("profile.palmares.results");
  const format = useFormatter();
  const locale = useLocale();
  const errorText = useErrorText();
  const bodyId = useId();

  const [open, setOpen] = useState(defaultOpen);
  const [rejecting, setRejecting] = useState(false);
  const [attested, setAttested] = useState(false);
  const [setAside, setSetAside] = useState<string[]>([]);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [pending, startTransition] = useTransition();

  const { athlete, entries } = request;
  const isProfile = request.kind === "athlete_profile";
  const needsAttestation = isProfile && athlete.isMinor;
  const askReason = rejecting || setAside.length > 0;
  const urgent = request.escalated || (request.daysLeft !== null && request.daysLeft <= 1);
  const accent = urgent ? "border-blood" : isProfile ? "border-line-strong" : "border-gold";

  function toggleEntry(id: string) {
    setSetAside((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const data = submitter
      ? new FormData(event.currentTarget, submitter)
      : new FormData(event.currentTarget);
    startTransition(async () => {
      const outcome = await reviewRequestAction(data);
      // dans la même transition que le rafraîchissement de la page : le
      // message et la disparition de la carte s'affichent ensemble
      startTransition(() => {
        if (outcome.status === "success") onDone(outcome.message, athlete.name);
        else if (GONE.includes(outcome.message)) onGone(outcome.message, athlete.name);
        else setResult(outcome);
      });
    });
  }

  const reasonError = result?.fields?.reason ? errorText(result.fields.reason) : undefined;

  return (
    <article className={`border-l-3 bg-surface ${accent}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start gap-3.25 p-3.25 text-left transition-colors hover:bg-line/40"
      >
        <Thumb url={athlete.photoUrl} alt="" size={open ? "md" : "sm"} />
        <span className="flex min-w-0 grow flex-col gap-1.25">
          <span className="flex items-start justify-between gap-2">
            <span className="font-display text-[19px] leading-[1.05] font-bold uppercase">
              {athlete.name}
            </span>
            <DueBadge request={request} isSuperviseur={isSuperviseur} />
          </span>
          <span className="font-mono text-[10px] text-subtle uppercase">
            {athleteMeta(athlete)}
          </span>
          {isProfile ? (
            <span className="font-mono text-[10px] text-muted uppercase">
              {t("submitted", {
                date: format.dateTime(new Date(request.submittedAt), {
                  day: "numeric",
                  month: "short",
                }),
              })}
              {" · "}
              {t("entries", { count: entries.length })}
            </span>
          ) : (
            <>
              <span className="font-mono text-[10px] text-gold-ink uppercase">
                {t("palmaresKind", { count: entries.length })}
              </span>
              <span className="font-mono text-[10px] text-subtle uppercase">
                {t("alreadyOnline")}
              </span>
            </>
          )}
        </span>
      </button>

      <div id={bodyId} hidden={!open}>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 px-3.25 pb-3.25">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="request_id" value={request.id} />
          <input type="hidden" name="kind" value={request.kind} />

          <div className="flex gap-3.5">
            {athlete.photoUrl && (
              <a
                href={athlete.photoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0"
              >
                <Thumb
                  url={athlete.photoUrl}
                  alt={t("photoAlt", { name: athlete.name })}
                  size="lg"
                />
              </a>
            )}
            <div className="min-w-0 grow">
              <AthleteFacts athlete={athlete} />
            </div>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 eyebrow tracking-[0.12em] text-subtle">
              {t("entriesTitle")}
            </legend>
            {entries.length === 0 ? (
              <p className="text-xs text-subtle">{t("noEntries")}</p>
            ) : (
              <ul className="flex flex-col gap-px bg-line">
                {entries.map((entry) => {
                  const aside = setAside.includes(entry.id);
                  return (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between gap-3 bg-background px-3 py-2.5"
                    >
                      <div
                        className={`flex min-w-0 flex-col gap-0.5 ${aside ? "line-through opacity-60" : ""}`}
                      >
                        <span className="text-sm font-medium">
                          {entry.year} · {entry.competition}
                        </span>
                        <span className="font-mono text-[10px] text-subtle uppercase">
                          {[
                            tResults(entry.result),
                            entry.weightClass ? formatWeightClass(entry.weightClass) : null,
                            entry.location,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                      {request.actionable && !rejecting && (
                        <label className="flex shrink-0 cursor-pointer items-center gap-1.75 text-xs text-muted">
                          <input
                            type="checkbox"
                            name="rejected_entries"
                            value={entry.id}
                            checked={aside}
                            onChange={() => toggleEntry(entry.id)}
                            aria-label={t("setAsideLabel", { name: entry.competition })}
                            className="h-4.5 w-4.5 accent-blood"
                          />
                          <span aria-hidden="true">{t("setAside")}</span>
                        </label>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </fieldset>

          {needsAttestation && request.actionable && !rejecting && (
            <div className="flex items-start gap-2.5 border border-blood bg-blood/10 p-3">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="mt-px h-4 w-4 shrink-0 text-blood-ink"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.9}
              >
                <path d="M12 4l9 16H3z" />
                <path d="M12 10v4M12 17h.01" />
              </svg>
              <div className="flex flex-col gap-1.75">
                <p className="text-xs font-semibold text-blood-ink">
                  {athlete.age !== null
                    ? t("minorTitle", { age: athlete.age })
                    : t("minorTitleUnknown")}
                </p>
                <p className="text-xs leading-normal text-muted">{t("minorText")}</p>
                <label className="mt-0.5 flex cursor-pointer items-start gap-2.25">
                  <input
                    type="checkbox"
                    name="guardian"
                    checked={attested}
                    onChange={(event) => setAttested(event.target.checked)}
                    className="mt-px h-4.75 w-4.75 shrink-0 accent-blood"
                  />
                  <span className="text-xs leading-normal text-foreground">{t("attest")}</span>
                </label>
              </div>
            </div>
          )}

          {!request.actionable && <FormAlert tone="info">{t("escalatedNote")}</FormAlert>}

          {result?.status === "error" && !reasonError && (
            <FormAlert tone="error">{errorText(result.message)}</FormAlert>
          )}

          {request.actionable && askReason && (
            <TextAreaField
              id={`motif-${request.id}`}
              name="reason"
              label={rejecting ? t("reason") : t("reasonEntries")}
              placeholder={t("reasonPlaceholder")}
              maxLength={REASON_MAX_LENGTH}
              rows={3}
              required
              autoFocus={rejecting}
              error={reasonError}
            />
          )}
          {request.actionable && askReason && (
            <p className="-mt-2.5 text-[11px] leading-normal text-subtle">{t("reasonHint")}</p>
          )}

          {request.actionable && (
            <div className="flex flex-col gap-2.5">
              {rejecting ? (
                <div className="flex gap-2">
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
                    onClick={() => {
                      setRejecting(false);
                      setResult(null);
                    }}
                    disabled={pending}
                    className="inline-flex h-12 w-28 shrink-0 items-center justify-center border border-line-strong text-sm font-semibold text-foreground transition hover:border-gold"
                  >
                    {t("cancel")}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="submit"
                    name="decision"
                    value="approve"
                    disabled={pending || (needsAttestation && !attested)}
                    className="inline-flex h-12 grow items-center justify-center gap-2 bg-admin-fill text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-line disabled:text-subtle"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.6}
                    >
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                    {pending ? t("sending") : isProfile ? t("approve") : t("approvePalmares")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRejecting(true);
                      setSetAside([]);
                      setResult(null);
                    }}
                    disabled={pending}
                    className="inline-flex h-12 w-28 shrink-0 items-center justify-center border border-line-strong text-sm font-semibold text-foreground transition hover:border-blood"
                  >
                    {t("reject")}
                  </button>
                </div>
              )}
              <p className="font-mono text-[9.5px] leading-normal text-subtle uppercase">
                {needsAttestation && !attested && !rejecting ? t("blocked") : t("signed")}
              </p>
            </div>
          )}
        </form>
      </div>
    </article>
  );
}
