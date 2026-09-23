"use client";

import { useTranslations } from "next-intl";
import type { QueueRequest, RosterAthlete } from "@/lib/review/queue";
import { useNotice } from "@/components/forms/useNotice";
import { useErrorText } from "@/components/forms/useErrorText";
import { Note } from "@/components/profile/ProfileParts";
import { ReviewCard } from "./ReviewCard";
import { ReviewSection } from "./ReviewParts";
import { RosterList } from "./RosterList";
import { de } from "@/lib/french";

const DONE_KEYS = [
  "approvedProfile",
  "rejectedProfile",
  "approvedPalmares",
  "rejectedPalmares",
  "markedReviewed",
] as const;

type Props = {
  queue: QueueRequest[];
  roster: RosterAthlete[];
  otherModified: RosterAthlete[];
  isSuperviseur: boolean;
  isCoach: boolean;
};

// File de vérification et liste des athlètes du coach.
export function ReviewWorkspace({ queue, roster, otherModified, isSuperviseur, isCoach }: Props) {
  const t = useTranslations("review");
  const errorText = useErrorText();
  const { announce, region } = useNotice();

  function onDone(message: string, name: string) {
    const key = DONE_KEYS.find((candidate) => candidate === message);
    if (key) announce("success", t(`done.${key}`, { name, de: de(name) }));
  }

  // Demande tranchée entre-temps par quelqu'un d'autre : la carte disparaît
  function onGone(message: string, name: string) {
    announce("error", t("gone", { name, error: errorText(message) ?? "" }));
  }

  return (
    <div className="flex flex-col gap-8">
      {region}

      <ReviewSection title={t("queue.title")} aside={queue.length}>
        {queue.length === 0 ? (
          <p className="border border-line bg-surface px-4 py-5 text-sm text-muted">
            {t("queue.empty")}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {queue.map((request, index) => (
              <ReviewCard
                key={request.id}
                request={request}
                defaultOpen={index === 0 && request.actionable}
                isSuperviseur={isSuperviseur}
                onDone={onDone}
                onGone={onGone}
              />
            ))}
          </div>
        )}
        <Note>{isSuperviseur ? t("queue.noteSuperviseur") : t("queue.note")}</Note>
      </ReviewSection>

      {(isCoach || roster.length > 0) && (
        <ReviewSection title={t("roster.title")} aside={roster.length}>
          {roster.length === 0 ? (
            <p className="border border-line bg-surface px-4 py-5 text-sm text-muted">
              {t("roster.empty")}
            </p>
          ) : (
            <RosterList athletes={roster} onDone={onDone} />
          )}
        </ReviewSection>
      )}

      {otherModified.length > 0 && (
        <ReviewSection title={t("roster.others")} aside={otherModified.length}>
          <RosterList athletes={otherModified} onDone={onDone} />
        </ReviewSection>
      )}
    </div>
  );
}
