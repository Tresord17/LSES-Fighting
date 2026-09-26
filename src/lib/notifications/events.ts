// Demande à la cloche de l'en-tête de recompter les éléments à traiter,
// par exemple juste après une décision prise dans la file de vérification.
export const NOTIFICATIONS_REFRESH = "lses-notifications-refresh";

export function refreshNotifications() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(NOTIFICATIONS_REFRESH));
}
