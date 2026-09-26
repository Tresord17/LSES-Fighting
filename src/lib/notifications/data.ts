import "server-only";
import type { createClient } from "@/lib/supabase/server";

// Éléments à traiter pour la cloche de l'en-tête. Tout est lu avec les
// droits du compte connecté : la RLS ne laisse remonter que ce qu'il peut voir.

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type NotificationKey = "coachAccounts" | "escalated" | "athletes" | "palmares" | "modified";

export type NotificationItem = {
  id: string;
  name: string;
  // due : jours avant l'escalade ; since / modified : date ISO
  meta:
    | { kind: "due"; days: number }
    | { kind: "escalated" }
    | { kind: "since"; date: string }
    | { kind: "modified"; date: string };
};

export type NotificationGroup = {
  key: NotificationKey;
  count: number;
  href: string;
  items: NotificationItem[];
};

export type Notifications = { total: number; href: string; groups: NotificationGroup[] };

const SHOWN = 4;
const DAY = 24 * 60 * 60 * 1000;
const fullName = (first: string | null, last: string | null) =>
  [first, last].filter(Boolean).join(" ") || "—";

export async function loadNotifications(
  supabase: Supabase,
  viewer: { id: string; isSuperviseur: boolean },
): Promise<Notifications> {
  const kinds = viewer.isSuperviseur
    ? ["athlete_profile", "palmares", "coach_account"]
    : ["athlete_profile", "palmares"];

  let modifiedQuery = supabase
    .from("athletes")
    .select("id, first_names, last_name, updated_at", { count: "exact" })
    .eq("status", "approved")
    .eq("modified_since_review", true)
    .order("updated_at", { ascending: false })
    .limit(SHOWN);
  // un coach ne suit que les fiches de ses propres athlètes
  if (!viewer.isSuperviseur) modifiedQuery = modifiedQuery.eq("coach_id", viewer.id);

  const [requests, modified] = await Promise.all([
    supabase
      .from("review_requests")
      .select("id, kind, athlete_id, coach_id, submitted_at, due_at, escalated_at")
      .eq("status", "open")
      .in("kind", kinds as ("athlete_profile" | "palmares" | "coach_account")[])
      .order("due_at", { ascending: true })
      .limit(200),
    modifiedQuery,
  ]);
  if (requests.error) throw requests.error;
  if (modified.error) throw modified.error;

  const open = requests.data ?? [];
  const athleteIds = [...new Set(open.map((row) => row.athlete_id).filter(Boolean))] as string[];
  const coachIds = [...new Set(open.map((row) => row.coach_id).filter(Boolean))] as string[];
  const [athletes, coaches] = await Promise.all([
    athleteIds.length
      ? supabase.from("athletes").select("id, first_names, last_name").in("id", athleteIds)
      : Promise.resolve({
          data: [] as { id: string; first_names: string | null; last_name: string | null }[],
        }),
    coachIds.length && viewer.isSuperviseur
      ? supabase.from("coaches").select("id, first_names, last_name").in("id", coachIds)
      : Promise.resolve({
          data: [] as { id: string; first_names: string | null; last_name: string | null }[],
        }),
  ]);
  const names = new Map(
    [...(athletes.data ?? []), ...(coaches.data ?? [])].map((row) => [
      row.id,
      fullName(row.first_names, row.last_name),
    ]),
  );

  const now = Date.now();
  const dueMeta = (row: (typeof open)[number]): NotificationItem["meta"] => ({
    kind: "due",
    days: row.due_at ? Math.max(0, Math.ceil((new Date(row.due_at).getTime() - now) / DAY)) : 0,
  });
  const toItem = (row: (typeof open)[number], meta: NotificationItem["meta"]) => ({
    id: row.id,
    name: names.get((row.kind === "coach_account" ? row.coach_id : row.athlete_id) ?? "") ?? "—",
    meta,
  });

  const groups: NotificationGroup[] = [];
  const add = (key: NotificationKey, href: string, rows: typeof open, meta: typeof dueMeta) => {
    if (rows.length) {
      groups.push({
        key,
        href,
        count: rows.length,
        items: rows.slice(0, SHOWN).map((row) => toItem(row, meta(row))),
      });
    }
  };

  // Un coach ne peut plus trancher une demande escaladée : elle n'apparaît
  // que chez le superviseur, dans son propre groupe.
  const escalated = open.filter((row) => row.kind !== "coach_account" && row.escalated_at);
  const fresh = open.filter((row) => !row.escalated_at);
  if (viewer.isSuperviseur) {
    add(
      "coachAccounts",
      "/mon-espace/superviseur",
      open.filter((row) => row.kind === "coach_account"),
      (row) => ({ kind: "since", date: row.submitted_at }),
    );
    add("escalated", "/mon-espace/superviseur", escalated, () => ({ kind: "escalated" }));
  }
  add(
    "athletes",
    "/mon-espace/demandes",
    fresh.filter((row) => row.kind === "athlete_profile"),
    dueMeta,
  );
  add(
    "palmares",
    "/mon-espace/demandes",
    fresh.filter((row) => row.kind === "palmares"),
    dueMeta,
  );

  const modifiedCount = modified.count ?? modified.data?.length ?? 0;
  if (modifiedCount > 0) {
    groups.push({
      key: "modified",
      href: "/mon-espace/demandes",
      count: modifiedCount,
      items: (modified.data ?? []).map((row) => ({
        id: row.id,
        name: fullName(row.first_names, row.last_name),
        meta: { kind: "modified", date: row.updated_at },
      })),
    });
  }

  return {
    total: groups.reduce((sum, group) => sum + group.count, 0),
    href: viewer.isSuperviseur ? "/mon-espace/superviseur" : "/mon-espace/demandes",
    groups,
  };
}
