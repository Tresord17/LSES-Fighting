import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/session";
import { pickLocale } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";
import { AthleteProfileForm } from "@/components/profile/AthleteProfileForm";
import { CoachProfileForm } from "@/components/profile/CoachProfileForm";
import { FormAlert } from "@/components/forms/FormAlert";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile");
  return { title: t("title"), robots: { index: false } };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

// URL signée d'une heure : les photos sont dans un bucket privé
async function signedPhotoUrl(supabase: Supabase, path: string | null) {
  if (!path) return null;
  const { data } = await supabase.storage.from("profile-photos").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

// Motif du dernier refus, s'il y en a un
async function lastRejectionReason(
  supabase: Supabase,
  column: "athlete_id" | "coach_id",
  id: string,
) {
  const { data } = await supabase
    .from("review_requests")
    .select("status, decision_reason")
    .eq(column, id)
    .in("kind", column === "athlete_id" ? ["athlete_profile"] : ["coach_account"])
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.status === "rejected" ? data.decision_reason : null;
}

export default async function ProfilePage({ params }: PageProps<"/[locale]/mon-espace/profil">) {
  const locale = pickLocale((await params).locale);
  const user = await requireUser(locale, `/${locale}/mon-espace/profil`);
  if (!user.role) redirect(`/${locale}/bienvenue`);

  const t = await getTranslations("profile");
  const supabase = await createClient();
  const shell = "mx-auto flex max-w-2xl flex-col px-4 pt-7 pb-14 md:pt-12";

  if (user.role === "athlete") {
    const [{ data: athlete }, { data: privateData }, { data: entries }, { data: coaches }] =
      await Promise.all([
        supabase.from("athletes").select("*").eq("id", user.id).single(),
        supabase
          .from("athlete_private")
          .select("birth_date")
          .eq("athlete_id", user.id)
          .maybeSingle(),
        supabase
          .from("palmares_entries")
          .select("id, competition, year, location, weight_class, result, status, rejection_reason")
          .eq("athlete_id", user.id)
          .order("year", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("coaches")
          .select("id, first_names, last_name, city, dojo_name")
          .eq("status", "approved")
          .order("last_name"),
      ]);
    if (!athlete) redirect(`/${locale}/mon-espace`);

    const [photoUrl, rejectionReason] = await Promise.all([
      signedPhotoUrl(supabase, athlete.photo_path),
      athlete.status === "rejected" ? lastRejectionReason(supabase, "athlete_id", user.id) : null,
    ]);

    return (
      <section className={shell}>
        <AthleteProfileForm
          userId={user.id}
          photoUrl={photoUrl}
          data={{
            status: athlete.status,
            lastName: athlete.last_name,
            firstNames: athlete.first_names,
            birthDate: privateData?.birth_date ?? null,
            sex: athlete.sex,
            discipline: athlete.discipline,
            weightClass: athlete.weight_class,
            city: athlete.city,
            coachId: athlete.coach_id,
            bio: athlete.bio,
            practiceSince: athlete.practice_since,
            fightsCount: athlete.fights_count,
            consent: athlete.publication_consent_at !== null,
            rejectionReason,
          }}
          coaches={(coaches ?? []).map((coach) => ({
            id: coach.id,
            label: [
              [coach.first_names, coach.last_name?.toUpperCase()].filter(Boolean).join(" "),
              coach.dojo_name,
              coach.city,
            ]
              .filter(Boolean)
              .join(" · "),
          }))}
          entries={(entries ?? []).map((entry) => ({
            id: entry.id,
            competition: entry.competition,
            year: entry.year,
            location: entry.location,
            weightClass: entry.weight_class,
            result: entry.result,
            status: entry.status,
            rejectionReason: entry.rejection_reason,
          }))}
        />
      </section>
    );
  }

  // Coach, ou superviseur général disposant d'une fiche de coach
  const { data: coach } = await supabase
    .from("coaches")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!coach) {
    return (
      <section className={shell}>
        <FormAlert tone="info">{t("noCoachRecord")}</FormAlert>
      </section>
    );
  }

  const [photoUrl, rejectionReason] = await Promise.all([
    signedPhotoUrl(supabase, coach.photo_path),
    coach.status === "rejected" ? lastRejectionReason(supabase, "coach_id", user.id) : null,
  ]);

  return (
    <section className={shell}>
      <CoachProfileForm
        userId={user.id}
        photoUrl={photoUrl}
        data={{
          status: coach.status,
          lastName: coach.last_name,
          firstNames: coach.first_names,
          disciplines: coach.disciplines,
          city: coach.city,
          dojoName: coach.dojo_name,
          experienceYears: coach.experience_years,
          bio: coach.bio,
          consent: coach.publication_consent_at !== null,
          rejectionReason,
        }}
      />
    </section>
  );
}
