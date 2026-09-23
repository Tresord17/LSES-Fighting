import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/session";
import { pickLocale } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";
import { loadReviewQueue, type ReviewStats } from "@/lib/review/queue";
import { Link } from "@/i18n/navigation";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { FormAlert } from "@/components/forms/FormAlert";
import { ReviewWorkspace } from "@/components/review/ReviewWorkspace";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("review");
  return { title: t("title"), robots: { index: false } };
}

async function Stats({ stats }: { stats: ReviewStats }) {
  const t = await getTranslations("review.stats");
  const format = await getFormatter();
  const items = [
    { label: t("open"), value: String(stats.open), tone: "text-gold-ink" },
    { label: t("approved"), value: String(stats.approvedByMe), tone: "text-success" },
    {
      label: t("delay"),
      value:
        stats.averageDays === null
          ? t("none")
          : t("days", {
              value: format.number(stats.averageDays, { maximumFractionDigits: 1 }),
            }),
      tone: "text-foreground",
    },
  ];
  return (
    <dl className="grid grid-cols-3 gap-px border-y border-line bg-line">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col-reverse items-center gap-1.25 bg-background px-2.5 py-4"
        >
          <dt className="text-center font-mono text-[9px] tracking-[0.1em] text-subtle uppercase">
            {item.label}
          </dt>
          <dd
            className={`font-display text-[30px] leading-none font-extrabold whitespace-nowrap ${item.tone}`}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default async function ReviewPage({ params }: PageProps<"/[locale]/mon-espace/demandes">) {
  const locale = pickLocale((await params).locale);
  const user = await requireUser(locale, `/${locale}/mon-espace/demandes`);
  if (!user.role) redirect(`/${locale}/bienvenue`);

  const t = await getTranslations("review");
  const supabase = await createClient();
  const isSuperviseur = user.role === "superviseur";

  // Fiche de coach du compte (le superviseur peut aussi en avoir une)
  const { data: coach } =
    user.role === "athlete"
      ? { data: null }
      : await supabase
          .from("coaches")
          .select("first_names, last_name, status")
          .eq("id", user.id)
          .maybeSingle();

  const isApprovedCoach = coach?.status === "approved";
  const shell = "mx-auto flex max-w-3xl flex-col gap-7 px-4 pt-7 pb-14 md:pt-12";

  const header = (
    <div className="flex flex-col gap-1.5">
      <Link href="/mon-espace" className="text-xs font-semibold text-subtle hover:text-foreground">
        ← {t("back")}
      </Link>
      <p className="mt-2 eyebrow tracking-[0.16em] text-admin">
        {isSuperviseur ? t("space.superviseur") : t("space.coach")}
      </p>
      <h1 className="font-display text-3xl font-extrabold tracking-[0.03em] uppercase md:text-4xl">
        {t("title")}
      </h1>
      <p className="font-mono text-[10px] tracking-[0.1em] text-subtle uppercase">
        {[coach?.first_names, coach?.last_name].filter(Boolean).join(" ") || user.email}
      </p>
    </div>
  );

  // Contrôle d'affichage seulement : la base refuse de toute façon les
  // décisions d'un compte qui n'est ni coach référencé ni superviseur.
  if (!isSuperviseur && !isApprovedCoach) {
    return (
      <section className={shell}>
        {header}
        <FormAlert tone="info">
          {t(user.role === "coach" ? "restricted.coachPending" : "restricted.notReviewer")}
        </FormAlert>
        <div>
          <ButtonLink href="/mon-espace" variant="outline">
            {t("back")}
          </ButtonLink>
        </div>
      </section>
    );
  }

  const { queue, stats, roster, otherModified } = await loadReviewQueue(supabase, {
    id: user.id,
    isSuperviseur,
  });

  return (
    <section className={shell}>
      {header}
      <Stats stats={stats} />
      <ReviewWorkspace
        queue={queue}
        roster={roster}
        otherModified={otherModified}
        isSuperviseur={isSuperviseur}
        isCoach={isApprovedCoach}
      />
    </section>
  );
}
