import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import type { CompetitionResult, Discipline, Sex } from "@/lib/profile/options";
import { PAGE_SIZE, type AthleteFilters, type CoachFilters } from "./filters";

// Lectures des pages publiques, toujours avec le client « visiteur » :
// seules les fiches en ligne et les entrées de palmarès vérifiées remontent.

export type PhotoKind = "athletes" | "coaches";

export type AthleteCard = {
  slug: string;
  lastName: string;
  firstNames: string;
  discipline: Discipline | null;
  weightClass: string | null;
  city: string | null;
  photoUrl: string | null;
  titles: number;
};

export type PalmaresItem = {
  id: string;
  competition: string;
  year: number;
  location: string | null;
  weightClass: string | null;
  result: CompetitionResult;
};

export type CoachCard = {
  slug: string;
  lastName: string;
  firstNames: string;
  disciplines: Discipline[];
  city: string | null;
  dojoName: string | null;
  photoUrl: string | null;
  athletes: number;
};

export type AthleteDetail = AthleteCard & {
  sex: Sex | null;
  bio: string | null;
  practiceSince: number | null;
  fightsCount: number | null;
  verifiedAt: string | null;
  palmares: PalmaresItem[];
  coach: CoachCard | null;
};

export type CoachDetail = CoachCard & {
  bio: string | null;
  experienceYears: number | null;
  approvedAt: string | null;
  titles: number;
  roster: AthleteCard[];
};

type Listing<T> = { items: T[]; total: number; cities: string[] };
const EMPTY = { items: [], total: 0, cities: [] };

// Adresse stable de la photo, servie par /api/photos. Le numéro de version
// tiré du nom de fichier force le rafraîchissement quand la photo change.
export function photoUrl(kind: PhotoKind, slug: string | null, path: string | null) {
  if (!slug || !path) return null;
  const version = /photo-([0-9]+)\./.exec(path)?.[1] ?? "0";
  return `/api/photos/${kind}/${slug}?v=${version}`;
}

const byName = (a: string, b: string) => a.localeCompare(b, "fr", { sensitivity: "base" });

function uniqueCities(rows: { city: string | null }[] | null) {
  return [...new Set((rows ?? []).map((row) => row.city?.trim()).filter(Boolean) as string[])].sort(
    byName,
  );
}

type Supabase = NonNullable<ReturnType<typeof createPublicClient>>;

// Nombre de titres (médailles d'or vérifiées) par athlète
async function titlesFor(supabase: Supabase, athleteIds: string[]) {
  const counts = new Map<string, number>();
  if (athleteIds.length === 0) return counts;
  const { data, error } = await supabase
    .from("palmares_entries")
    .select("athlete_id")
    .eq("status", "approved")
    .eq("result", "gold")
    .in("athlete_id", athleteIds);
  if (error) throw error;
  for (const row of data ?? []) counts.set(row.athlete_id, (counts.get(row.athlete_id) ?? 0) + 1);
  return counts;
}

type AthleteRow = {
  id: string;
  slug: string | null;
  last_name: string | null;
  first_names: string | null;
  discipline: Discipline | null;
  weight_class: string | null;
  city: string | null;
  photo_path: string | null;
};

const ATHLETE_CARD = "id, slug, last_name, first_names, discipline, weight_class, city, photo_path";

function toAthleteCard(row: AthleteRow, titles: Map<string, number>): AthleteCard {
  return {
    slug: row.slug ?? "",
    lastName: row.last_name ?? "",
    firstNames: row.first_names ?? "",
    discipline: row.discipline,
    weightClass: row.weight_class,
    city: row.city,
    photoUrl: photoUrl("athletes", row.slug, row.photo_path),
    titles: titles.get(row.id) ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Répertoire des athlètes
// ---------------------------------------------------------------------------
export async function listAthletes(filters: AthleteFilters): Promise<Listing<AthleteCard>> {
  const supabase = createPublicClient();
  if (!supabase) return EMPTY;

  let query = supabase
    .rpc("search_athletes", { p_query: filters.q ?? undefined }, { count: "exact" })
    .select(ATHLETE_CARD);
  if (filters.discipline) query = query.eq("discipline", filters.discipline);
  if (filters.sex) query = query.eq("sex", filters.sex);
  if (filters.weight) query = query.eq("weight_class", filters.weight);
  if (filters.city) query = query.eq("city", filters.city);

  const [{ data, count, error }, { data: cityRows, error: cityError }] = await Promise.all([
    query
      .order("last_name", { ascending: true })
      .order("first_names", { ascending: true })
      .range(0, filters.page * PAGE_SIZE - 1),
    supabase.from("athletes").select("city").eq("status", "approved").limit(1000),
  ]);
  if (error) throw error;
  if (cityError) throw cityError;

  const rows = (data ?? []) as AthleteRow[];
  const titles = await titlesFor(
    supabase,
    rows.map((row) => row.id),
  );
  return {
    items: rows.filter((row) => row.slug).map((row) => toAthleteCard(row, titles)),
    total: count ?? rows.length,
    cities: uniqueCities(cityRows),
  };
}

// Dernières fiches publiées, pour la page d'accueil. Une base injoignable
// ne doit pas empêcher l'accueil de s'afficher : on renvoie alors une liste vide.
export async function latestAthletes(limit: number): Promise<AthleteCard[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("athletes")
      .select(ATHLETE_CARD)
      .eq("status", "approved")
      .not("slug", "is", null)
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    const titles = await titlesFor(
      supabase,
      (data ?? []).map((row) => row.id),
    );
    return (data ?? []).map((row) => toAthleteCard(row, titles));
  } catch (error) {
    console.error("Accueil : lecture des athlètes impossible", error);
    return [];
  }
}

// Mis en cache le temps d'une requête : la page et ses métadonnées
// partagent la même lecture.
export const getAthlete = cache(async (slug: string): Promise<AthleteDetail | null> => {
  const supabase = createPublicClient();
  if (!supabase) return null;

  const { data: row, error } = await supabase
    .from("athletes")
    .select(
      `${ATHLETE_CARD}, sex, bio, practice_since, fights_count, coach_id, reviewed_at, published_at`,
    )
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;

  const [{ data: entries, error: entriesError }, { data: coach, error: coachError }] =
    await Promise.all([
      supabase
        .from("palmares_entries")
        .select("id, competition, year, location, weight_class, result")
        .eq("athlete_id", row.id)
        .eq("status", "approved")
        .order("year", { ascending: false })
        .order("created_at", { ascending: false }),
      row.coach_id
        ? supabase
            .from("coaches")
            .select("slug, last_name, first_names, disciplines, city, dojo_name, photo_path")
            .eq("id", row.coach_id)
            .eq("status", "approved")
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
  if (entriesError) throw entriesError;
  if (coachError) throw coachError;

  const palmares = (entries ?? []).map((entry) => ({
    id: entry.id,
    competition: entry.competition,
    year: entry.year,
    location: entry.location,
    weightClass: entry.weight_class,
    result: entry.result,
  }));

  return {
    ...toAthleteCard(row, new Map([[row.id, palmares.filter((e) => e.result === "gold").length]])),
    sex: row.sex,
    bio: row.bio,
    practiceSince: row.practice_since,
    fightsCount: row.fights_count,
    verifiedAt: row.reviewed_at ?? row.published_at,
    palmares,
    coach:
      coach && coach.slug
        ? {
            slug: coach.slug,
            lastName: coach.last_name ?? "",
            firstNames: coach.first_names ?? "",
            disciplines: coach.disciplines,
            city: coach.city,
            dojoName: coach.dojo_name,
            photoUrl: photoUrl("coaches", coach.slug, coach.photo_path),
            athletes: 0,
          }
        : null,
  };
});

// ---------------------------------------------------------------------------
// Répertoire des coachs
// ---------------------------------------------------------------------------
type CoachRow = {
  id: string;
  slug: string | null;
  last_name: string | null;
  first_names: string | null;
  disciplines: Discipline[];
  city: string | null;
  dojo_name: string | null;
  photo_path: string | null;
};

const COACH_CARD = "id, slug, last_name, first_names, disciplines, city, dojo_name, photo_path";

// Nombre d'athlètes en ligne rattachés à chaque coach
async function rosterCounts(supabase: Supabase, coachIds: string[]) {
  const counts = new Map<string, number>();
  if (coachIds.length === 0) return counts;
  const { data, error } = await supabase
    .from("athletes")
    .select("coach_id")
    .eq("status", "approved")
    .in("coach_id", coachIds);
  if (error) throw error;
  for (const row of data ?? []) {
    if (row.coach_id) counts.set(row.coach_id, (counts.get(row.coach_id) ?? 0) + 1);
  }
  return counts;
}

function toCoachCard(row: CoachRow, counts: Map<string, number>): CoachCard {
  return {
    slug: row.slug ?? "",
    lastName: row.last_name ?? "",
    firstNames: row.first_names ?? "",
    disciplines: row.disciplines ?? [],
    city: row.city,
    dojoName: row.dojo_name,
    photoUrl: photoUrl("coaches", row.slug, row.photo_path),
    athletes: counts.get(row.id) ?? 0,
  };
}

export async function listCoaches(filters: CoachFilters): Promise<Listing<CoachCard>> {
  const supabase = createPublicClient();
  if (!supabase) return EMPTY;

  let query = supabase
    .rpc("search_coaches", { p_query: filters.q ?? undefined }, { count: "exact" })
    .select(COACH_CARD);
  if (filters.discipline) query = query.contains("disciplines", [filters.discipline]);
  if (filters.city) query = query.eq("city", filters.city);

  const [{ data, count, error }, { data: cityRows, error: cityError }] = await Promise.all([
    query
      .order("last_name", { ascending: true })
      .order("first_names", { ascending: true })
      .range(0, filters.page * PAGE_SIZE - 1),
    supabase.from("coaches").select("city").eq("status", "approved").limit(1000),
  ]);
  if (error) throw error;
  if (cityError) throw cityError;

  const rows = (data ?? []) as CoachRow[];
  const counts = await rosterCounts(
    supabase,
    rows.map((row) => row.id),
  );
  return {
    items: rows.filter((row) => row.slug).map((row) => toCoachCard(row, counts)),
    total: count ?? rows.length,
    cities: uniqueCities(cityRows),
  };
}

export const getCoach = cache(async (slug: string): Promise<CoachDetail | null> => {
  const supabase = createPublicClient();
  if (!supabase) return null;

  const { data: row, error } = await supabase
    .from("coaches")
    .select(`${COACH_CARD}, bio, experience_years, approved_at`)
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;

  const { data: athletes, error: rosterError } = await supabase
    .from("athletes")
    .select(ATHLETE_CARD)
    .eq("coach_id", row.id)
    .eq("status", "approved")
    .not("slug", "is", null)
    .order("last_name", { ascending: true });
  if (rosterError) throw rosterError;

  const roster = athletes ?? [];
  const titles = await titlesFor(
    supabase,
    roster.map((athlete) => athlete.id),
  );

  return {
    ...toCoachCard(row, new Map([[row.id, roster.length]])),
    bio: row.bio,
    experienceYears: row.experience_years,
    approvedAt: row.approved_at,
    titles: [...titles.values()].reduce((sum, value) => sum + value, 0),
    roster: roster.map((athlete) => toAthleteCard(athlete, titles)),
  };
});
