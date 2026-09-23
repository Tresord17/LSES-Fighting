"use client";

import { useTranslations } from "next-intl";
import type { QueueRequest } from "@/lib/review/queue";
import type { CoachRequest } from "@/lib/supervisor/data";
import { useErrorText } from "@/components/forms/useErrorText";
import { ReviewCard } from "@/components/review/ReviewCard";
import { ReviewSection } from "@/components/review/ReviewParts";
import { CoachAccountCard } from "./CoachAccountCard";
import { useNotice } from "@/components/forms/useNotice";
import { de } from "@/lib/french";

const REVIEW_DONE = [
  "approvedProfile",
  "rejectedProfile",
  "approvedPalmares",
  "rejectedPalmares",
] as const;
const COACH_DONE = ["approvedCoach", "rejectedCoach"] as const;

// Demandes escaladées (priorité haute) puis comptes de coach à valider
export function SupervisorRequests({
  escalated,
  coachRequests,
}: {
  escalated: QueueRequest[];
  coachRequests: CoachRequest[];
}) {
  const t = useTranslations("supervisor");
  const tReview = useTranslations("review");
  const errorText = useErrorText();
  const { announce, region } = useNotice();

  function onDone(message: string, name: string) {
    const review = REVIEW_DONE.find((key) => key === message);
    if (review) return announce("success", tReview(`done.${review}`, { name, de: de(name) }));
    const coach = COACH_DONE.find((key) => key === message);
    if (coach) announce("success", t(`done.${coach}`, { name, de: de(name) }));
  }

  function onGone(message: string, name: string) {
    announce("error", tReview("gone", { name, error: errorText(message) ?? "" }));
  }

  return (
    <div className="flex flex-col gap-8">
      {region}

      <ReviewSection title={t("escalated.title")} aside={escalated.length} tone="blood">
        <p className="-mt-1 text-xs leading-relaxed text-muted">{t("escalated.intro")}</p>
        {escalated.length === 0 ? (
          <p className="border border-line bg-surface px-4 py-5 text-sm text-muted">
            {t("escalated.empty")}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {escalated.map((request, index) => (
              <ReviewCard
                key={request.id}
                request={request}
                defaultOpen={index === 0}
                isSuperviseur
                onDone={onDone}
                onGone={onGone}
              />
            ))}
          </div>
        )}
      </ReviewSection>

      <ReviewSection title={t("coaches.title")} aside={coachRequests.length}>
        {coachRequests.length === 0 ? (
          <p className="border border-line bg-surface px-4 py-5 text-sm text-muted">
            {t("coaches.empty")}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {coachRequests.map((request, index) => (
              <CoachAccountCard
                key={request.id}
                request={request}
                defaultOpen={index === 0 && escalated.length === 0}
                onDone={onDone}
                onGone={onGone}
              />
            ))}
          </div>
        )}
      </ReviewSection>
    </div>
  );
}
