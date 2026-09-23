import { z } from "zod";
import { routing } from "@/i18n/routing";

// Règles de saisie vérifiées côté serveur. Les messages sont des clés de
// traduction (espace « auth.errors » des fichiers messages/*.json).

export const PASSWORD_MIN_LENGTH = 10;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "invalid_email" }));
const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { error: "password_too_short" })
  .max(72, { error: "password_too_long" });
const locale = z.enum(routing.locales).catch(routing.defaultLocale);

export const localeOnlySchema = z.object({ locale });

export const signUpSchema = z.object({
  locale,
  role: z.enum(["athlete", "coach"], { error: "role_required" }),
  email,
  password,
  consent: z.literal("on", { error: "consent_required" }),
});

export const signInSchema = z.object({
  locale,
  email,
  password: z.string().min(1, { error: "password_required" }),
  next: z.string().optional(),
});

export const googleSchema = z.object({
  locale,
  role: z.enum(["athlete", "coach"]).optional().catch(undefined),
  next: z.string().optional(),
});

export const resetRequestSchema = z.object({ locale, email });

export const newPasswordSchema = z
  .object({ locale, password, confirm: z.string() })
  .refine((data) => data.password === data.confirm, {
    error: "passwords_mismatch",
    path: ["confirm"],
  });

export const chooseRoleSchema = z.object({
  locale,
  role: z.enum(["athlete", "coach"], { error: "role_required" }),
  next: z.string().optional(),
});

export type FieldErrors = Partial<Record<string, string>>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}
