import { z } from "zod";
import { routing } from "@/i18n/routing";

// Décisions prises depuis la file de vérification. Les messages d'erreur
// sont des clés de traduction (espaces review.errors puis errors).

const locale = z.enum(routing.locales).catch(routing.defaultLocale);

const emptyToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

export const REVIEW_KINDS = ["athlete_profile", "palmares"] as const;
export type ReviewKind = (typeof REVIEW_KINDS)[number];

// Même plafond que la colonne decision_reason de la base
export const REASON_MAX_LENGTH = 500;

export const reviewDecisionSchema = z
  .object({
    locale,
    request_id: z.uuid({ error: "request_not_found" }),
    kind: z.enum(REVIEW_KINDS, { error: "request_not_found" }),
    decision: z.enum(["approve", "reject"], { error: "unknown" }),
    reason: z.preprocess(
      emptyToNull,
      z.string().trim().max(REASON_MAX_LENGTH, { error: "too_long" }).nullable().default(null),
    ),
    guardian: z.preprocess((value) => value === "on", z.boolean()),
    rejected_entries: z
      .array(z.uuid({ error: "unknown" }))
      .max(200)
      .default([]),
  })
  // Un refus, ou une entrée de palmarès écartée, doit être motivé :
  // l'athlète lit ce motif pour corriger sa fiche.
  .superRefine((value, ctx) => {
    if ((value.decision === "reject" || value.rejected_entries.length > 0) && !value.reason) {
      ctx.addIssue({ code: "custom", path: ["reason"], message: "reason_required" });
    }
  });

export const markReviewedSchema = z.object({
  locale,
  athlete_id: z.uuid({ error: "unknown" }),
});
