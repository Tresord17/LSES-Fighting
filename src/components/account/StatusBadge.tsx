import type { Database } from "@/lib/supabase/database.types";

type Status = Database["public"]["Enums"]["review_status"];

// Couleurs : doré pour l'attente, vert pour « en ligne », rouge sang pour un refus.
const STYLES: Record<Status, string> = {
  draft: "border-line-strong text-muted",
  pending: "border-gold text-gold-ink",
  approved: "border-success text-success",
  rejected: "border-blood text-blood-ink",
};

export function StatusBadge({ status, label }: { status: Status; label: string }) {
  return (
    <span
      className={`inline-flex items-center border px-2 py-1 font-mono text-[10px] tracking-[0.14em] uppercase ${STYLES[status]}`}
    >
      {label}
    </span>
  );
}
