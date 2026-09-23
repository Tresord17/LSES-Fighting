import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { loadReviewQueue } from "@/lib/review/queue";
import { loadAuditLog, loadSupervisorOverview } from "@/lib/supervisor/data";
import { Link } from "@/i18n/navigation";
import { ReviewSection } from "@/components/review/ReviewParts";
import { AuditList } from "@/components/supervisor/AuditList";
import { SupervisorRequests } from "@/components/supervisor/SupervisorRequests";
import { Note } from "@/components/profile/ProfileParts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("supervisor");
  return { title: t("title"), robots: { index: false } };
}

export default async function SupervisorPage() {
  const user = await getSessionUser();
  if (user?.role !== "superviseur") return null;

  const t = await getTranslations("supervisor");
  const supabase = await createClient();
  const [{ coachRequests, stats }, { queue }, { entries }] = await Promise.all([
    loadSupervisorOverview(supabase),
    loadReviewQueue(supabase, { id: user.id, isSuperviseur: true }, { escalatedOnly: true }),
    loadAuditLog(supabase, { q: null, category: null, page: 1 }, 5),
  ]);

  const items = [
    { label: t("stats.coaches"), value: stats.coaches, tone: "text-admin" },
    { label: t("stats.escalated"), value: stats.escalated, tone: "text-blood-ink" },
    { label: t("stats.online"), value: stats.online, tone: "text-success" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <dl className="grid grid-cols-3 gap-px border-y border-line bg-line">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex flex-col-reverse items-center gap-1.25 bg-background px-2.5 py-4"
          >
            <dt className="text-center font-mono text-[9px] tracking-[0.1em] text-subtle uppercase">
              {item.label}
            </dt>
            <dd className={`font-display text-[30px] leading-none font-extrabold ${item.tone}`}>
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      <SupervisorRequests escalated={queue} coachRequests={coachRequests} />

      <ReviewSection
        title={t("journal.latest")}
        aside={
          <Link
            href="/mon-espace/superviseur/journal"
            className="font-sans text-xs font-semibold text-admin hover:underline"
          >
            {t("journal.seeAll")}
          </Link>
        }
      >
        {entries.length ? (
          <AuditList entries={entries} />
        ) : (
          <p className="border border-line bg-surface px-4 py-5 text-sm text-muted">
            {t("journal.empty")}
          </p>
        )}
        <Note>{t("journal.locked")}</Note>
      </ReviewSection>
    </div>
  );
}
