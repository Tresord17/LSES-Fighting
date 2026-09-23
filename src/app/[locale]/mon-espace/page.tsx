import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/session";
import { pickLocale } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { FormAlert } from "@/components/forms/FormAlert";
import { SignOutButton } from "@/components/account/SignOutButton";
import { StatusBadge } from "@/components/account/StatusBadge";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("title"), robots: { index: false } };
}

export default async function AccountPage({
  params,
  searchParams,
}: PageProps<"/[locale]/mon-espace">) {
  const locale = pickLocale((await params).locale);
  const query = await searchParams;
  const user = await requireUser(locale, `/${locale}/mon-espace`);
  if (!user.role) redirect(`/${locale}/bienvenue`);

  const t = await getTranslations("account");
  const format = await getFormatter();
  const supabase = await createClient();
  const isAthlete = user.role === "athlete";

  // Fiche et dernière demande de vérification du compte
  const { data: card } = isAthlete
    ? await supabase
        .from("athletes")
        .select("first_names, status, modified_since_review")
        .eq("id", user.id)
        .maybeSingle()
    : await supabase.from("coaches").select("first_names, status").eq("id", user.id).maybeSingle();

  const { data: request } = await supabase
    .from("review_requests")
    .select("status, due_at, decision_reason")
    .or(`athlete_id.eq.${user.id},coach_id.eq.${user.id}`)
    .in("kind", isAthlete ? ["athlete_profile"] : ["coach_account"])
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const status = card?.status ?? "draft";
  const modified = Boolean(card && "modified_since_review" in card && card.modified_since_review);
  const canReview = user.role === "superviseur" || (!isAthlete && status === "approved");

  let statusText: string;
  if (status === "pending") {
    statusText = isAthlete
      ? t("statusText.pendingAthlete", {
          date: request?.due_at
            ? format.dateTime(new Date(request.due_at), { dateStyle: "long" })
            : "—",
        })
      : t("statusText.pendingCoach");
  } else if (status === "approved") {
    statusText = t(isAthlete ? "statusText.approvedAthlete" : "statusText.approvedCoach");
  } else {
    statusText = t(`statusText.${status}`);
  }

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pt-8 pb-14 md:pt-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="eyebrow tracking-[0.16em] text-gold-ink">{t(`roles.${user.role}`)}</p>
          <h1 className="font-display text-4xl leading-none font-extrabold uppercase md:text-5xl">
            {t("hello")}
            {card?.first_names ? ` ${card.first_names}` : ""}
          </h1>
          {user.email && <p className="text-sm text-muted">{user.email}</p>}
        </div>
        <SignOutButton locale={locale} />
      </div>

      {query.bienvenue === "1" && <FormAlert tone="success">{t("confirmed")}</FormAlert>}
      {query["mot-de-passe"] === "modifie" && (
        <FormAlert tone="success">{t("passwordChanged")}</FormAlert>
      )}

      <article className="flex flex-col gap-4 border-l-3 border-gold bg-surface p-5 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-bold uppercase">{t("profileCard")}</h2>
          <StatusBadge status={status} label={t(`status.${status}`)} />
        </div>
        <p className="text-sm leading-relaxed text-muted">{statusText}</p>
        {status === "rejected" && request?.decision_reason && (
          <p className="text-sm text-blood-ink">
            {t("statusText.reason", { reason: request.decision_reason })}
          </p>
        )}
        {modified && <p className="text-sm text-gold-ink">{t("statusText.modified")}</p>}
        <div className="flex flex-wrap gap-2.5">
          <ButtonLink href="/mon-espace/profil">
            {status === "draft" || status === "rejected" ? t("editProfile") : t("viewProfile")}
          </ButtonLink>
          {canReview && (
            <ButtonLink href="/mon-espace/demandes" variant="outline">
              {t("reviews")}
            </ButtonLink>
          )}
          {user.role === "superviseur" && (
            <ButtonLink href="/mon-espace/superviseur" variant="outline">
              {t("admin")}
            </ButtonLink>
          )}
        </div>
      </article>
    </section>
  );
}
