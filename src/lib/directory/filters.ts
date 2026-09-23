import { DISCIPLINES, SEXES, type Discipline, type Sex } from "@/lib/profile/options";

// Filtres des répertoires publics, lus dans l'adresse de la page
// (?q=…&discipline=…). Toute valeur inattendue est simplement ignorée.

export const PAGE_SIZE = 12;
const MAX_PAGES = 50;

export type AthleteFilters = {
  q: string | null;
  discipline: Discipline | null;
  sex: Sex | null;
  weight: string | null;
  city: string | null;
  page: number;
};

export type CoachFilters = Pick<AthleteFilters, "q" | "discipline" | "city" | "page">;

type Params = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.trim() || null;

// Recherche : lettres, chiffres, espaces, tirets et apostrophes, 60 signes
function cleanQuery(value: string | null) {
  if (!value) return null;
  const cleaned = value
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s'’-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  return cleaned || null;
}

const pick = <T extends string>(values: readonly T[], value: string | null) =>
  values.includes(value as T) ? (value as T) : null;

function page(value: string | null) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 ? Math.min(number, MAX_PAGES) : 1;
}

export function parseAthleteFilters(params: Params): AthleteFilters {
  const discipline = pick(DISCIPLINES, first(params.discipline));
  const weight = first(params.weight);
  return {
    q: cleanQuery(first(params.q)),
    discipline,
    sex: pick(SEXES, first(params.sex)),
    // une catégorie n'a de sens qu'avec une discipline
    weight: discipline && weight && /^[+-][0-9]{2,3}$/.test(weight) ? weight : null,
    city: first(params.city)?.slice(0, 80) ?? null,
    page: page(first(params.page)),
  };
}

export function parseCoachFilters(params: Params): CoachFilters {
  return {
    q: cleanQuery(first(params.q)),
    discipline: pick(DISCIPLINES, first(params.discipline)),
    city: first(params.city)?.slice(0, 80) ?? null,
    page: page(first(params.page)),
  };
}

// Paramètres d'adresse sans les valeurs vides, pour des liens propres
export function toQuery(filters: Partial<Record<string, string | number | null>>) {
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined || value === "") continue;
    if (key === "page" && value === 1) continue;
    query[key] = String(value);
  }
  return query;
}
