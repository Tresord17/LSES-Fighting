import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { Discipline } from "@/lib/profile/options";
import { JOURNAL_CATEGORIES, type JournalCategory } from "./schemas";

// Lectures de l'espace superviseur, avec les droits du compte connecté :
// la RLS réserve les comptes de coach en attente, les profils et le
// journal d'audit au superviseur général.

type Supabase = Awaited<ReturnType<typeof createClient>>;
type AppRole = Database["public"]["Enums"]["app_role"];

export const JOURNAL_PAGE_SIZE = 40;
export const PROFILES_PAGE_SIZE = 20;

const fullName = (last: string | null, first: string | null) =>
  [last, first].filter(Boolean).join(" ") || "—";

async function signPhotos(supabase: Supabase, paths: string[]) {
  const urls = new Map<string, string>();
  if (paths.length === 0) return urls;
  const { data } = await supabase.storage.from("profile-photos").createSignedUrls(paths, 60 * 60);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl && !item.error) urls.set(item.path, item.signedUrl);
  }
  return urls;
}

// ---------------------------------------------------------------------------
// Indicateurs et comptes de coach en attente
// ---------------------------------------------------------------------------
export type CoachRequest = {
  id: string;
  submittedAt: string;
  coach: {
    name: string;
    disciplines: Discipline[];
    city: string | null;
    dojoName: string | null;
    experienceYears: number | null;
    bio: string | null;
    photoUrl: string | null;
  };
};

export async function loadSupervisorOverview(supabase: Supabase) {
  const head = { count: "exact" as const, head: true };
  const [coachRequests, escalated, athletesOnline, coachesOnline] = await Promise.all([
    supabase
      .from("review_requests")
      .select("id, coach_id, submitted_at")
      .eq("kind", "coach_account")
      .eq("status", "open")
      .order("submitted_at", { ascending: true }),
    supabase
      .from("review_requests")
      .select("id", head)
      .eq("status", "open")
      .not("escalated_at", "is", null),
    supabase.from("athletes").select("id", head).eq("status", "approved"),
    supabase.from("coaches").select("id", head).eq("status", "approved"),
  ]);
  if (coachRequests.error) throw coachRequests.error;

  const ids = (coachRequests.data ?? []).map((row) => row.coach_id).filter(Boolean) as string[];
  const { data: coaches, error } = ids.length
    ? await supabase
        .from("coaches")
        .select(
          "id, last_name, first_names, disciplines, city, dojo_name, experience_years, bio, photo_path",
        )
        .in("id", ids)
    : { data: [], error: null };
  if (error) throw error;

  const photos = await signPhotos(
    supabase,
    (coaches ?? []).map((coach) => coach.photo_path).filter(Boolean) as string[],
  );
  const byId = new Map((coaches ?? []).map((coach) => [coach.id, coach]));

  const requests: CoachRequest[] = [];
  for (const row of coachRequests.data ?? []) {
    const coach = row.coach_id ? byId.get(row.coach_id) : undefined;
    if (!coach) continue;
    requests.push({
      id: row.id,
      submittedAt: row.submitted_at,
      coach: {
        name: fullName(coach.last_name, coach.first_names),
        disciplines: coach.disciplines,
        city: coach.city,
        dojoName: coach.dojo_name,
        experienceYears: coach.experience_years,
        bio: coach.bio,
        photoUrl: coach.photo_path ? (photos.get(coach.photo_path) ?? null) : null,
      },
    });
  }

  return {
    coachRequests: requests,
    stats: {
      coaches: requests.length,
      escalated: escalated.count ?? 0,
      online: (athletesOnline.count ?? 0) + (coachesOnline.count ?? 0),
    },
  };
}

// ---------------------------------------------------------------------------
// Journal d'audit
// ---------------------------------------------------------------------------
export type AuditEntry = {
  id: number;
  createdAt: string;
  action: string;
  automatic: boolean;
  // qui a agi : nom de la fiche, superviseur sans fiche, compte sans fiche
  // ou console d'administration (modification faite hors du site)
  actor: { kind: "named" | "supervisor" | "someone" | "console"; label: string | null };
  target: string | null;
  details: {
    reason: string | null;
    minor: boolean;
    escalated: boolean;
    setAside: number;
    from: AppRole | null;
    to: AppRole | null;
    title: string | null;
  };
};

function detailsOf(value: Json): AuditEntry["details"] {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, Json>)
      : {};
  const text = (key: string) => (typeof record[key] === "string" ? (record[key] as string) : null);
  const setAside = Array.isArray(record.rejected_entries) ? record.rejected_entries.length : 0;
  return {
    reason: text("reason"),
    minor: record.minor === true,
    escalated: record.escalated === true,
    setAside,
    from: text("from") as AppRole | null,
    to: text("to") as AppRole | null,
    title: text("title"),
  };
}

export async function loadAuditLog(
  supabase: Supabase,
  filters: { q: string | null; category: JournalCategory | null; page: number },
  limit = filters.page * JOURNAL_PAGE_SIZE,
) {
  let query = supabase
    .from("audit_log")
    .select("id, created_at, actor_id, actor_label, automatic, action, target_label, details", {
      count: "exact",
    });
  if (filters.category) query = query.in("action", [...JOURNAL_CATEGORIES[filters.category]]);
  if (filters.q) {
    // cleanName ne laisse passer ni virgule, ni point, ni parenthèse :
    // la valeur ne peut pas sortir du filtre
    const pattern = `*${filters.q}*`;
    query = query.or(`actor_label.ilike.${pattern},target_label.ilike.${pattern}`);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(0, limit - 1);
  if (error) throw error;

  // Acteurs sans nom : le superviseur n'a pas forcément de fiche de coach
  const unnamed = [
    ...new Set(
      (data ?? [])
        .filter((row) => !row.automatic && row.actor_id && !row.actor_label)
        .map((row) => row.actor_id as string),
    ),
  ];
  const roles = new Map<string, AppRole | null>();
  if (unnamed.length) {
    const { data: profiles } = await supabase.from("profiles").select("id, role").in("id", unnamed);
    for (const profile of profiles ?? []) roles.set(profile.id, profile.role);
  }

  const entries: AuditEntry[] = (data ?? []).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    action: row.action,
    automatic: row.automatic,
    actor: row.actor_label
      ? { kind: "named", label: row.actor_label }
      : !row.actor_id
        ? { kind: "console", label: null }
        : roles.get(row.actor_id) === "superviseur"
          ? { kind: "supervisor", label: null }
          : { kind: "someone", label: null },
    target: row.target_label,
    details: detailsOf(row.details),
  }));

  return { entries, total: count ?? entries.length };
}

// ---------------------------------------------------------------------------
// Fiches en ligne (retrait du site)
// ---------------------------------------------------------------------------
export type PublishedProfile = {
  id: string;
  slug: string | null;
  name: string;
  meta: string;
  since: string | null;
  modified: boolean;
};

const DISCIPLINE_LABEL: Record<Discipline, string> = { sambo: "Sambo", mma: "MMA" };

export async function loadPublishedProfiles(
  supabase: Supabase,
  filters: { type: "athletes" | "coaches"; q: string | null; page: number },
) {
  const range = [0, filters.page * PROFILES_PAGE_SIZE - 1] as const;

  if (filters.type === "athletes") {
    const { data, count, error } = await supabase
      .rpc("search_athletes", { p_query: filters.q ?? undefined }, { count: "exact" })
      .select(
        "id, slug, last_name, first_names, discipline, city, published_at, modified_since_review",
      )
      .order("last_name", { ascending: true })
      .order("first_names", { ascending: true })
      .range(...range);
    if (error) throw error;
    return {
      total: count ?? 0,
      items: (data ?? []).map((row): PublishedProfile => ({
        id: row.id,
        slug: row.slug,
        name: fullName(row.last_name, row.first_names),
        meta: [row.discipline ? DISCIPLINE_LABEL[row.discipline] : null, row.city]
          .filter(Boolean)
          .join(" · "),
        since: row.published_at,
        modified: row.modified_since_review,
      })),
    };
  }

  const { data, count, error } = await supabase
    .rpc("search_coaches", { p_query: filters.q ?? undefined }, { count: "exact" })
    .select("id, slug, last_name, first_names, disciplines, city, dojo_name, approved_at")
    .order("last_name", { ascending: true })
    .order("first_names", { ascending: true })
    .range(...range);
  if (error) throw error;
  return {
    total: count ?? 0,
    items: (data ?? []).map((row): PublishedProfile => ({
      id: row.id,
      slug: row.slug,
      name: fullName(row.last_name, row.first_names),
      meta: [...row.disciplines.map((d) => DISCIPLINE_LABEL[d]), row.dojo_name, row.city]
        .filter(Boolean)
        .join(" · "),
      since: row.approved_at,
      modified: false,
    })),
  };
}
