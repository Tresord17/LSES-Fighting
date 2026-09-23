import { z } from "zod";
import { routing } from "@/i18n/routing";
import { DISCIPLINES, RESULTS, SEXES } from "./options";

// Validation des formulaires de profil. Les brouillons peuvent être
// incomplets : chaque champ est facultatif, mais contrôlé s'il est rempli.
// Les champs obligatoires pour la soumission sont vérifiés par la base.

const locale = z.enum(routing.locales).catch(routing.defaultLocale);
const currentYear = new Date().getFullYear();

const emptyToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

const text = (max: number) =>
  z.preprocess(
    emptyToNull,
    z.string().trim().max(max, { error: "too_long" }).nullable().default(null),
  );

const choice = <const T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(emptyToNull, z.enum(values, { error: "invalid_choice" }).nullable().default(null));

const integer = (min: number, max: number, error: string) =>
  z.preprocess(
    emptyToNull,
    z.coerce
      .number({ error: "invalid_number" })
      .int({ error })
      .min(min, { error })
      .max(max, { error })
      .nullable()
      .default(null),
  );

const weightClass = z.preprocess(
  emptyToNull,
  z
    .string()
    .regex(/^[+-][0-9]{2,3}$/, { error: "invalid_weight_class" })
    .nullable()
    .default(null),
);

const birthDate = z.preprocess(
  emptyToNull,
  z.iso
    .date({ error: "invalid_date" })
    .refine((value) => value >= "1920-01-01", { error: "invalid_date" })
    .refine((value) => value <= new Date().toISOString().slice(0, 10), { error: "future_date" })
    .nullable()
    .default(null),
);

const checkbox = z.preprocess((value) => value === "on", z.boolean());
const intent = z.enum(["save", "submit"]).catch("save");

export const athleteProfileSchema = z.object({
  locale,
  intent,
  last_name: text(80),
  first_names: text(120),
  birth_date: birthDate,
  sex: choice(SEXES),
  discipline: choice(DISCIPLINES),
  weight_class: weightClass,
  city: text(80),
  coach_id: z.preprocess(emptyToNull, z.uuid({ error: "invalid_choice" }).nullable().default(null)),
  bio: text(1500),
  practice_since: integer(1950, currentYear, "invalid_year"),
  fights_count: integer(0, 1000, "invalid_number"),
  consent: checkbox,
});

export const coachProfileSchema = z.object({
  locale,
  intent,
  last_name: text(80),
  first_names: text(120),
  disciplines: z.array(z.enum(DISCIPLINES)).default([]),
  city: text(80),
  dojo_name: text(120),
  experience_years: integer(0, 80, "invalid_number"),
  bio: text(1500),
  consent: checkbox,
});

export const palmaresEntrySchema = z.object({
  locale,
  competition: z
    .string()
    .trim()
    .min(2, { error: "competition_required" })
    .max(160, { error: "too_long" }),
  year: z.coerce
    .number({ error: "invalid_year" })
    .int({ error: "invalid_year" })
    .min(1950, { error: "invalid_year" })
    .max(currentYear, { error: "invalid_year" }),
  location: text(120),
  weight_class: weightClass,
  result: z.enum(RESULTS, { error: "invalid_choice" }),
});

export const idSchema = z.object({ locale, id: z.uuid() });
