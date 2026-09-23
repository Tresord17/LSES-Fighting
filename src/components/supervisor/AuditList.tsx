import type { ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import type { AuditEntry } from "@/lib/supervisor/data";
import { de } from "@/lib/french";

// Couleur du repère : vert pour ce qui publie, rouge sang pour un refus ou
// un retrait, doré pour ce qui attend une action ou la signale.
function tone(action: string) {
  if (/\.(approved|created|published)$/.test(action)) return "bg-success";
  if (/\.(rejected|withdrawn|deleted)$/.test(action)) return "bg-blood";
  if (/escalated|submitted|consent_withdrawn|changes_reviewed/.test(action)) return "bg-gold";
  return "bg-line-strong";
}

const KNOWN = new Set([
  "athlete_submitted",
  "athlete_approved",
  "athlete_rejected",
  "athlete_changes_reviewed",
  "athlete_consent_withdrawn",
  "athlete_withdrawn",
  "coach_submitted",
  "coach_approved",
  "coach_rejected",
  "coach_consent_withdrawn",
  "coach_withdrawn",
  "palmares_submitted",
  "palmares_approved",
  "palmares_rejected",
  "request_escalated",
  "profile_role_changed",
  "media_created",
  "media_deleted",
  "news_published",
]);

// Lignes du journal d'audit, rédigées en phrases
export function AuditList({ entries }: { entries: AuditEntry[] }) {
  const t = useTranslations("supervisor.journal");
  const format = useFormatter();

  return (
    <ol className="flex flex-col gap-px bg-line">
      {entries.map((entry) => {
        const actor =
          entry.actor.kind === "named"
            ? entry.actor.label!
            : entry.actor.kind === "supervisor"
              ? t("supervisor")
              : entry.actor.kind === "console"
                ? t("console")
                : t("someone");
        const role = (value: string | null) =>
          t(`roles.${(value ?? "none") as "athlete" | "coach" | "superviseur" | "none"}`);
        const key = entry.action.replace(".", "_");
        const values = {
          actor,
          target: entry.target ?? t("someoneTarget"),
          de: de(entry.target ?? t("someoneTarget")),
          from: role(entry.details.from),
          to: role(entry.details.to),
          title: entry.details.title ?? "",
          action: entry.action,
          b: (chunks: ReactNode) => <strong className="font-semibold">{chunks}</strong>,
        };
        const sentence = KNOWN.has(key)
          ? t.rich(`actions.${key}` as "actions.athlete_submitted", values)
          : t.rich("actions.unknown", values);

        const meta = [
          format.dateTime(new Date(entry.createdAt), {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }) +
            " · " +
            format.dateTime(new Date(entry.createdAt), { hour: "2-digit", minute: "2-digit" }),
          entry.automatic ? t("automatic") : null,
          entry.details.minor ? t("minor") : null,
          entry.details.escalated ? t("afterEscalation") : null,
          entry.details.setAside ? t("entriesSetAside", { count: entry.details.setAside }) : null,
        ].filter(Boolean);

        return (
          <li key={entry.id} className="flex items-start gap-2.75 bg-surface px-3.25 py-2.75">
            <span
              aria-hidden="true"
              className={`mt-1.25 h-1.75 w-1.75 shrink-0 ${tone(entry.action)}`}
            />
            <div className="flex min-w-0 grow flex-col gap-0.75">
              <p className="text-[12.5px] leading-snug">{sentence}</p>
              <p className="font-mono text-[9.5px] text-subtle uppercase">{meta.join(" · ")}</p>
              {entry.details.reason && (
                <p className="text-xs text-muted">
                  {t("reason", { reason: entry.details.reason })}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
