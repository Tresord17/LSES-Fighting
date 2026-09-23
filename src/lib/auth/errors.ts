// Traduction des erreurs de Supabase Auth en clés de messages.
// Les réponses restent volontairement vagues quand une information pourrait
// révéler l'existence d'un compte (connexion, mot de passe oublié).

const AUTH_ERROR_KEYS: Record<string, string> = {
  invalid_credentials: "invalid_credentials",
  email_not_confirmed: "email_not_confirmed",
  weak_password: "weak_password",
  same_password: "same_password",
  over_email_send_rate_limit: "rate_limited",
  over_request_rate_limit: "rate_limited",
  email_address_invalid: "invalid_email",
  email_address_not_authorized: "email_not_authorized",
  signup_disabled: "signup_disabled",
  session_expired: "session_expired",
  session_not_found: "session_expired",
  otp_expired: "link_expired",
  flow_state_expired: "link_expired",
  flow_state_not_found: "link_expired",
  bad_code_verifier: "link_other_device",
};

export function getAuthErrorKey(
  error: { code?: string; status?: number } | null | undefined,
): string {
  if (!error) return "unknown";
  if (error.code && AUTH_ERROR_KEYS[error.code]) return AUTH_ERROR_KEYS[error.code];
  if (error.status === 429) return "rate_limited";
  return "unknown";
}
