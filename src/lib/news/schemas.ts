import { z } from "zod";
import { routing } from "@/i18n/routing";
import { storagePathPattern } from "@/lib/media/options";

const locale = z.enum(routing.locales).catch(routing.defaultLocale);
const emptyToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;
const optional = (max: number) =>
  z.preprocess(
    emptyToNull,
    z.string().trim().max(max, { error: "too_long" }).nullable().default(null),
  );

// Limites identiques aux contraintes de la table news
export const newsSchema = z.object({
  locale,
  id: z.preprocess(emptyToNull, z.uuid().nullable().default(null)),
  intent: z.enum(["save", "publish", "unpublish"]).catch("save"),
  title_fr: z
    .string({ error: "title_required" })
    .trim()
    .min(1, { error: "title_required" })
    .max(200, { error: "too_long" }),
  title_en: optional(200),
  excerpt_fr: optional(400),
  excerpt_en: optional(400),
  body_fr: optional(20000),
  body_en: optional(20000),
  cover_path: z.preprocess(
    emptyToNull,
    z
      .string()
      .regex(storagePathPattern("actualites", "webp|jpg"), { error: "invalid_media_path" })
      .nullable()
      .default(null),
  ),
});

export const newsIdSchema = z.object({ locale, id: z.uuid({ error: "unknown" }) });

// Adresse lisible tirée du titre : « trois-medailles-au-tournoi-de-douala »
export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}
