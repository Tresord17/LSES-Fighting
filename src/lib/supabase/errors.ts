// Les fonctions SQL du circuit de validation lèvent des erreurs dont le
// message est une clé stable (ex. « consent_required »). On la retrouve ici
// pour afficher le texte traduit : t(`errors.${getDbErrorKey(error)}`).

export const DB_ERROR_KEYS = [
  "not_authenticated",
  "forbidden",
  "role_not_allowed",
  "role_already_chosen",
  "profile_not_found",
  "not_an_athlete",
  "not_a_coach",
  "invalid_status",
  "profile_incomplete",
  "consent_required",
  "identity_locked",
  "invalid_birth_date",
  "invalid_photo_path",
  "coach_not_approved",
  "request_not_found",
  "request_closed",
  "request_escalated",
  "reason_required",
  "guardian_attestation_required",
  "nothing_to_review",
  "profile_not_published",
] as const;

export type DbErrorKey = (typeof DB_ERROR_KEYS)[number] | "unknown";

export function getDbErrorKey(error: { message?: string } | null | undefined): DbErrorKey {
  const message = error?.message ?? "";
  return DB_ERROR_KEYS.find((key) => message === key || message.includes(key)) ?? "unknown";
}
