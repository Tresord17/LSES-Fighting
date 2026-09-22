// Typage des clés de traduction : VS Code signale une clé inexistante
// et propose l'autocomplétion dans t("...").
import type { routing } from "./routing";
import type messages from "../../messages/fr.json";

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
