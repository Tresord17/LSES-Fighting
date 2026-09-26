import { z } from "zod";
import { routing } from "@/i18n/routing";
import { DISCIPLINES } from "@/lib/profile/options";
import { VIDEO_LINK, VIDEO_MAX_BYTES, storagePathPattern } from "./options";

const locale = z.enum(routing.locales).catch(routing.defaultLocale);
const emptyToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

const titles = {
  title_fr: z
    .string({ error: "title_required" })
    .trim()
    .min(1, { error: "title_required" })
    .max(160, { error: "too_long" }),
  title_en: z.preprocess(
    emptyToNull,
    z.string().trim().max(160, { error: "too_long" }).nullable().default(null),
  ),
};

export const mediaLinkSchema = z.object({
  locale,
  discipline: z.enum(DISCIPLINES, { error: "invalid_choice" }),
  url: z
    .string()
    .trim()
    .max(500, { error: "too_long" })
    .regex(VIDEO_LINK, { error: "invalid_video_link" }),
  ...titles,
});

// Fichier déjà déposé par le navigateur : on vérifie son chemin avant
// d'enregistrer la ligne qui le rend visible
export const mediaFileSchema = z
  .object({
    locale,
    discipline: z.enum(DISCIPLINES, { error: "invalid_choice" }),
    kind: z.enum(["image", "video"]),
    path: z.string().max(300),
    // fichier et vignette : la vidéo seule est plafonnée à VIDEO_MAX_BYTES
    size: z
      .number()
      .int()
      .min(1)
      .max(VIDEO_MAX_BYTES + 2 * 1024 * 1024),
    duration: z
      .number()
      .min(0)
      .max(24 * 3600)
      .nullable()
      .default(null),
    ...titles,
  })
  .superRefine((value, ctx) => {
    const pattern = storagePathPattern(
      value.discipline,
      value.kind === "image" ? "webp|jpg" : "mp4",
    );
    if (!pattern.test(value.path)) {
      ctx.addIssue({ code: "custom", path: ["path"], message: "invalid_media_path" });
    }
  });

export const mediaTitlesSchema = z.object({
  locale,
  id: z.uuid({ error: "unknown" }),
  ...titles,
});

export const mediaOrderSchema = z.object({
  locale,
  discipline: z.enum(DISCIPLINES),
  ids: z.array(z.uuid()).min(1).max(500),
});

export const mediaIdSchema = z.object({ locale, id: z.uuid({ error: "unknown" }) });
