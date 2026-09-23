import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { CompetitionResult, Discipline, Sex } from "@/lib/profile/options";
import type { ReviewKind } from "./schemas";

// Données de la file de vérification, lues avec les droits du coach
// connecté : la RLS limite d'elle-même ce qui remonte (demandes d'athlètes
// pour un coach référencé, tout pour le superviseur général).

type Supabase = Awaited<ReturnType<typeof createClient>>;
type AthleteRow = Pick<
  Database["public"]["Tables"]["athletes"]["Row"],
  | "id"
  | "last_name"
  | "first_names"
  | "sex"
  | "discipline"
  | "weight_class"
  | "city"
  | "bio"
  | "photo_path"
  | "practice_since"
  | "fights_count"
  | "coach_id"
  | "status"
  | "modified_since_review"
>;

export type QueueAthlete = {
  id: string;
  name: string;
  sex: Sex | null;
  discipline: Discipline | null;
  weightClass: string | null;
  city: string | null;
  bio: string | null;
  practiceSince: number | null;
  fightsCount: number | null;
  coachName: string | null;
  photoUrl: string | null;
  age: number | null;
  isMinor: boolean;
};

export type QueueEntry = {
  id: string;
  competition: string;
  year: number;
  location: string | null;
  weightClass: string | null;
  result: CompetitionResult;
};

export type QueueRequest = {
  id: string;
  kind: ReviewKind;
  submittedAt: string;
  // jours restants avant l'escalade (0 le dernier jour), null sans échéance
  daysLeft: number | null;
  escalated: boolean;
  // le compte connecté peut-il trancher ? (non pour un coach après escalade)
  actionable: boolean;
  athlete: QueueAthlete;
  entries: QueueEntry[];
};

export type RosterAthlete = QueueAthlete & {
  status: Database["public"]["Enums"]["review_status"];
  modified: boolean;
};

export type ReviewStats = {
  open: number;
  approvedByMe: number;
  // délai moyen de décision, en jours
  averageDays: number | null;
};

const ATHLETE_COLUMNS =
  "id, last_name, first_names, sex, discipline, weight_class, city, bio, photo_path, practice_since, fights_count, coach_id, status, modified_since_review";

const DAY = 24 * 60 * 60 * 1000;

const fullName = (last: string | null, first: string | null) =>
  [last, first].filter(Boolean).join(" ") || "—";

// Adresses signées d'une heure pour les photos (bucket privé)
async function signPhotos(supabase: Supabase, paths: string[]) {
  const urls = new Map<string, string>();
  if (paths.length === 0) return urls;
  const { data } = await supabase.storage.from("profile-photos").createSignedUrls(paths, 60 * 60);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl && !item.error) urls.set(item.path, item.signedUrl);
  }
  return urls;
}

async function coachNames(supabase: Supabase, ids: string[]) {
  const names = new Map<string, string>();
  if (ids.length === 0) return names;
  const { data } = await supabase
    .from("coaches")
    .select("id, last_name, first_names")
    .in("id", ids);
  for (const coach of data ?? []) {
    names.set(coach.id, fullName(coach.last_name, coach.first_names));
  }
  return names;
}

// Complète les fiches (photo signée, nom du coach, âge) en trois requêtes
async function enrich(
  supabase: Supabase,
  rows: AthleteRow[],
  ages: Map<string, { age: number | null; isMinor: boolean }>,
) {
  const unique = [...new Map(rows.map((row) => [row.id, row])).values()];
  const [photos, coaches] = await Promise.all([
    signPhotos(
      supabase,
      unique.map((row) => row.photo_path).filter((path): path is string => Boolean(path)),
    ),
    coachNames(supabase, [
      ...new Set(unique.map((row) => row.coach_id).filter((id): id is string => Boolean(id))),
    ]),
  ]);
  return (row: AthleteRow): QueueAthlete => ({
    id: row.id,
    name: fullName(row.last_name, row.first_names),
    sex: row.sex,
    discipline: row.discipline,
    weightClass: row.weight_class,
    city: row.city,
    bio: row.bio,
    practiceSince: row.practice_since,
    fightsCount: row.fights_count,
    coachName: row.coach_id ? (coaches.get(row.coach_id) ?? null) : null,
    photoUrl: row.photo_path ? (photos.get(row.photo_path) ?? null) : null,
    age: ages.get(row.id)?.age ?? null,
    isMinor: ages.get(row.id)?.isMinor ?? false,
  });
}

// escalatedOnly : seules les demandes passées au superviseur, sans les
// indicateurs ni les listes d'athlètes (espace superviseur).
export async function loadReviewQueue(
  supabase: Supabase,
  viewer: { id: string; isSuperviseur: boolean },
  { escalatedOnly = false }: { escalatedOnly?: boolean } = {},
) {
  const now = Date.now();
  const none = Promise.resolve({ data: [] as never[] });

  let requestQuery = supabase
    .from("review_requests")
    .select("id, kind, athlete_id, submitted_at, due_at, escalated_at")
    .eq("status", "open")
    .in("kind", ["athlete_profile", "palmares"]);
  if (escalatedOnly) requestQuery = requestQuery.not("escalated_at", "is", null);

  const [{ data: requests }, { data: decisions }, { data: roster }, { data: flagged }] =
    await Promise.all([
      requestQuery.order("due_at", { ascending: true }),
      escalatedOnly
        ? none
        : supabase
            .from("review_requests")
            .select("status, submitted_at, decided_at")
            .eq("decided_by", viewer.id)
            .in("status", ["approved", "rejected"])
            .limit(500),
      // athlètes qui ont choisi ce coach comme référent
      escalatedOnly
        ? none
        : supabase
            .from("athletes")
            .select(ATHLETE_COLUMNS)
            .eq("coach_id", viewer.id)
            .neq("status", "draft")
            .order("last_name", { ascending: true }),
      // le superviseur voit aussi les fiches modifiées des autres athlètes
      viewer.isSuperviseur && !escalatedOnly
        ? supabase
            .from("athletes")
            .select(ATHLETE_COLUMNS)
            .eq("status", "approved")
            .eq("modified_since_review", true)
            .order("last_name", { ascending: true })
        : Promise.resolve({ data: [] as AthleteRow[] }),
    ]);

  const open = (requests ?? []).filter(
    (request): request is typeof request & { athlete_id: string; kind: ReviewKind } =>
      Boolean(request.athlete_id) && request.kind !== "coach_account",
  );
  const athleteIds = [...new Set(open.map((request) => request.athlete_id))];

  const [{ data: athletes }, { data: entries }, { data: ageRows }] = await Promise.all([
    athleteIds.length
      ? supabase.from("athletes").select(ATHLETE_COLUMNS).in("id", athleteIds)
      : Promise.resolve({ data: [] as AthleteRow[] }),
    athleteIds.length
      ? supabase
          .from("palmares_entries")
          .select(
            "id, athlete_id, competition, year, location, weight_class, result, review_request_id",
          )
          .in("athlete_id", athleteIds)
          .eq("status", "pending")
          .order("year", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.rpc("pending_athlete_ages"),
  ]);

  const ages = new Map(
    (ageRows ?? []).map((row) => [row.athlete_id, { age: row.age, isMinor: row.is_minor }]),
  );
  const others = (flagged ?? []).filter((row) => row.coach_id !== viewer.id);
  const toAthlete = await enrich(
    supabase,
    [...(athletes ?? []), ...(roster ?? []), ...others],
    ages,
  );
  const athleteById = new Map((athletes ?? []).map((row) => [row.id, row]));

  const queue: QueueRequest[] = [];
  for (const request of open) {
    const athlete = athleteById.get(request.athlete_id);
    if (!athlete) continue;
    const escalated = request.escalated_at !== null;
    const daysLeft = request.due_at
      ? Math.max(0, Math.ceil((new Date(request.due_at).getTime() - now) / DAY))
      : null;
    queue.push({
      id: request.id,
      kind: request.kind,
      submittedAt: request.submitted_at,
      daysLeft,
      escalated,
      actionable: viewer.isSuperviseur || !escalated,
      athlete: toAthlete(athlete),
      entries: (entries ?? [])
        .filter((entry) =>
          request.kind === "athlete_profile"
            ? entry.athlete_id === request.athlete_id
            : entry.review_request_id === request.id,
        )
        .map((entry) => ({
          id: entry.id,
          competition: entry.competition,
          year: entry.year,
          location: entry.location,
          weightClass: entry.weight_class,
          result: entry.result,
        })),
    });
  }

  // Demandes que l'on peut trancher d'abord, les plus urgentes en tête ;
  // pour le superviseur, les demandes escaladées passent devant.
  queue.sort((a, b) => {
    if (a.actionable !== b.actionable) return a.actionable ? -1 : 1;
    if (viewer.isSuperviseur && a.escalated !== b.escalated) return a.escalated ? -1 : 1;
    return (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity);
  });

  const decided = decisions ?? [];
  const delays = decided
    .filter((row) => row.decided_at)
    .map(
      (row) => (new Date(row.decided_at!).getTime() - new Date(row.submitted_at).getTime()) / DAY,
    );

  const stats: ReviewStats = {
    open: queue.length,
    approvedByMe: decided.filter((row) => row.status === "approved").length,
    averageDays: delays.length ? delays.reduce((sum, d) => sum + d, 0) / delays.length : null,
  };

  const toRoster = (row: AthleteRow): RosterAthlete => ({
    ...toAthlete(row),
    status: row.status,
    modified: row.status === "approved" && row.modified_since_review,
  });

  return {
    queue,
    stats,
    roster: (roster ?? []).map(toRoster),
    otherModified: others.map(toRoster),
  };
}
