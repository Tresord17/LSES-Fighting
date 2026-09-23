import { z } from "zod";
import { routing } from "@/i18n/routing";
import { REASON_MAX_LENGTH } from "@/lib/review/schemas";

// Décisions et filtres de l'espace superviseur. Les messages d'erreur sont
// des clés de traduction (errors, profile.errors).

const locale = z.enum(routing.locales).catch(routing.defaultLocale);

const reason = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().max(REASON_MAX_LENGTH, { error: "too_long" }).nullable().default(null),
);

export const coachDecisionSchema = z
  .object({
    locale,
    request_id: z.uuid({ error: "request_not_found" }),
    decision: z.enum(["approve", "reject"], { error: "unknown" }),
    reason,
  })
  .superRefine((value, ctx) => {
    if (value.decision === "reject" && !value.reason) {
      ctx.addIssue({ code: "custom", path: ["reason"], message: "reason_required" });
    }
  });

export const withdrawSchema = z.object({
  locale,
  profile_id: z.uuid({ error: "profile_not_published" }),
  reason: reason.refine((value) => value !== null, { error: "withdraw_reason_required" }),
});

// ---------------------------------------------------------------------------
// Journal d'audit : catégories d'actions et filtres d'adresse
// ---------------------------------------------------------------------------
export const JOURNAL_CATEGORIES = {
  athletes: [
    "athlete.submitted",
    "athlete.approved",
    "athlete.rejected",
    "athlete.changes_reviewed",
    "athlete.consent_withdrawn",
    "athlete.withdrawn",
    "palmares.submitted",
    "palmares.approved",
    "palmares.rejected",
  ],
  coaches: [
    "coach.submitted",
    "coach.approved",
    "coach.rejected",
    "coach.consent_withdrawn",
    "coach.withdrawn",
  ],
  escalations: ["request.escalated"],
  roles: ["profile.role_changed"],
  content: ["media.created", "media.deleted", "news.published"],
} as const;

export type JournalCategory = keyof typeof JOURNAL_CATEGORIES;

type Params = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.trim() || null;

// Nom recherché : lettres, chiffres, espaces, tirets et apostrophes
export function cleanName(value: string | null) {
  const cleaned = (value ?? "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s'’-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  return cleaned || null;
}

export function pageNumber(value: string | null, max = 50) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 ? Math.min(number, max) : 1;
}

export function parseJournalFilters(params: Params) {
  const category = first(params.categorie);
  return {
    q: cleanName(first(params.q)),
    category: (category && category in JOURNAL_CATEGORIES
      ? category
      : null) as JournalCategory | null,
    page: pageNumber(first(params.page)),
  };
}

export function parseProfileFilters(params: Params) {
  return {
    type: first(params.type) === "coachs" ? ("coaches" as const) : ("athletes" as const),
    q: cleanName(first(params.q)),
    page: pageNumber(first(params.page)),
  };
}
