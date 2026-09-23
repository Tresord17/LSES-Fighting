import type { Database } from "@/lib/supabase/database.types";

export type Discipline = Database["public"]["Enums"]["discipline"];
export type Sex = Database["public"]["Enums"]["sex"];
export type CompetitionResult = Database["public"]["Enums"]["competition_result"];

export const DISCIPLINES = ["sambo", "mma"] as const satisfies readonly Discipline[];
export const SEXES = ["male", "female"] as const satisfies readonly Sex[];
export const RESULTS = [
  "gold",
  "silver",
  "bronze",
  "participation",
] as const satisfies readonly CompetitionResult[];

// Catégories de poids proposées dans les formulaires (modifiables ici).
// Sambo : catégories FIAS en vigueur depuis le 1er janvier 2021, communes
// au sambo sportif et au sambo combat.
// MMA : catégories amateurs IMMAF, arrondies au kilogramme.
export const WEIGHT_CLASSES: Record<Discipline, Record<Sex, string[]>> = {
  sambo: {
    male: ["-58", "-64", "-71", "-79", "-88", "-98", "+98"],
    female: ["-50", "-54", "-59", "-65", "-72", "-80", "+80"],
  },
  mma: {
    male: ["-57", "-61", "-66", "-70", "-77", "-84", "-93", "-120"],
    female: ["-48", "-52", "-57", "-61", "-66"],
  },
};

const weightValue = (value: string) => Number(value.slice(1)) + (value.startsWith("+") ? 0.5 : 0);

// Catégories à proposer selon la discipline et le sexe. Une valeur déjà
// enregistrée hors liste (ancien barème) reste proposée pour ne pas la perdre.
export function weightClassesFor(
  discipline: Discipline | null,
  sex: Sex | null,
  current?: string | null,
): string[] {
  const disciplines: readonly Discipline[] = discipline ? [discipline] : DISCIPLINES;
  const sexes: readonly Sex[] = sex ? [sex] : SEXES;
  const set = new Set<string>();
  for (const d of disciplines)
    for (const s of sexes) WEIGHT_CLASSES[d][s].forEach((w) => set.add(w));
  if (current) set.add(current);
  return [...set].sort((a, b) => weightValue(a) - weightValue(b));
}

// « -74 » devient « −74 kg » (vrai signe moins typographique)
export function formatWeightClass(value: string | null | undefined): string {
  if (!value) return "";
  return `${value.replace("-", "−")} kg`;
}

// Villes proposées à la saisie (liste indicative, la saisie reste libre)
export const CITY_SUGGESTIONS = [
  "Yaoundé",
  "Douala",
  "Bafoussam",
  "Bamenda",
  "Garoua",
  "Maroua",
  "Ngaoundéré",
  "Bertoua",
  "Ebolowa",
  "Kribi",
  "Limbé",
  "Buea",
  "Kumba",
  "Dschang",
  "Edéa",
  "Nkongsamba",
  "Oldham",
];

export function ageFromBirthDate(
  value: string | null | undefined,
  today = new Date(),
): number | null {
  if (!value) return null;
  const birth = new Date(`${value}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

// Doit rester aligné sur private.majority_age() dans la base
export const MAJORITY_AGE = 18;
