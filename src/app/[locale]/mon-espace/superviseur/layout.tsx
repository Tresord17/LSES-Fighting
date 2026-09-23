import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/session";
import { pickLocale } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { FormAlert } from "@/components/forms/FormAlert";
import { SupervisorNav } from "@/components/supervisor/SupervisorNav";

// Cadre commun de l'espace superviseur : en-tête et onglets. Le contrôle
// du rôle ne sert qu'à l'affichage : chaque page le refait, et la base
// réserve de toute façon ces données au superviseur général.
export default async function SupervisorLayout({
  children,
  params,
}: LayoutProps<"/[locale]/mon-espace/superviseur">) {
  const locale = pickLocale((await params).locale);
  const user = await requireUser(locale, `/${locale}/mon-espace/superviseur`);
  const t = await getTranslations("supervisor");
  const isSuperviseur = user.role === "superviseur";

  const { data: coach } = isSuperviseur
    ? await (
        await createClient()
      )
        .from("coaches")
        .select("first_names, last_name")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-7 px-4 pt-7 pb-14 md:pt-12">
      <div className="flex flex-col gap-1.5">
        <Link
          href="/mon-espace"
          className="text-xs font-semibold text-subtle hover:text-foreground"
        >
          ← {t("back")}
        </Link>
        <p className="mt-2 eyebrow tracking-[0.16em] text-admin">{t("eyebrow")}</p>
        <h1 className="font-display text-3xl font-extrabold tracking-[0.03em] uppercase md:text-4xl">
          {t("title")}
        </h1>
        <p className="font-mono text-[10px] tracking-[0.1em] text-subtle uppercase">
          {[coach?.first_names, coach?.last_name].filter(Boolean).join(" ") || user.email}
        </p>
      </div>
      {isSuperviseur ? (
        <>
          <SupervisorNav />
          {children}
        </>
      ) : (
        <FormAlert tone="info">{t("restricted")}</FormAlert>
      )}
    </section>
  );
}
