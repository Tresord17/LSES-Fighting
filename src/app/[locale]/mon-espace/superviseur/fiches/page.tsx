import type { Metadata } from "next";
import Form from "next/form";
import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/auth/session";
import { pickLocale } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";
import { parseProfileFilters } from "@/lib/supervisor/schemas";
import { loadPublishedProfiles } from "@/lib/supervisor/data";
import { toQuery } from "@/lib/directory/filters";
import { Link } from "@/i18n/navigation";
import { ReviewSection } from "@/components/review/ReviewParts";
import { ProfileWithdrawList } from "@/components/supervisor/ProfileWithdrawList";
import { SearchIcon } from "@/components/ui/icons";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("supervisor.profiles");
  return { title: t("title"), robots: { index: false } };
}

export default async function ProfilesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/mon-espace/superviseur/fiches">) {
  const user = await getSessionUser();
  if (user?.role !== "superviseur") return null;

  const locale = pickLocale((await params).locale);
  const filters = parseProfileFilters(await searchParams);
  const t = await getTranslations("supervisor.profiles");
  const { items, total } = await loadPublishedProfiles(await createClient(), filters);
  const typeParam = filters.type === "coaches" ? "coachs" : null;

  return (
    <ReviewSection title={t("title")} aside={t("count", { count: total })}>
      <p className="-mt-1 text-xs leading-relaxed text-muted">{t("intro")}</p>

      <div className="grid grid-cols-2 border border-line-strong/60">
        {(["athletes", "coaches"] as const).map((type) => {
          const active = filters.type === type;
          return (
            <Link
              key={type}
              href={{
                pathname: "/mon-espace/superviseur/fiches",
                query: type === "coaches" ? { type: "coachs" } : {},
              }}
              aria-current={active ? "page" : undefined}
              className={`flex h-11 items-center justify-center text-sm font-semibold transition-colors ${
                active ? "bg-admin-fill text-white" : "text-muted hover:text-foreground"
              }`}
            >
              {t(type)}
            </Link>
          );
        })}
      </div>

      <Form
        action={`/${locale}/mon-espace/superviseur/fiches`}
        replace
        scroll={false}
        className="flex gap-2"
      >
        {typeParam && <input type="hidden" name="type" value={typeParam} />}
        <label className="flex h-11 grow items-center gap-2.5 border border-line-strong/60 bg-surface px-3 focus-within:border-admin-fill">
          <SearchIcon className="h-4 w-4 shrink-0 text-subtle" />
          <span className="sr-only">
            {filters.type === "coaches" ? t("searchCoaches") : t("searchAthletes")}
          </span>
          <input
            type="search"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder={t("search")}
            maxLength={60}
            className="h-full min-w-0 grow bg-transparent text-sm outline-none placeholder:text-subtle"
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center bg-admin-fill px-4 text-sm font-semibold text-white transition hover:brightness-110"
        >
          {t("submit")}
        </button>
      </Form>

      <ProfileWithdrawList key={filters.type} profiles={items} type={filters.type} />

      {items.length < total && (
        <Link
          href={{
            pathname: "/mon-espace/superviseur/fiches",
            query: toQuery({ type: typeParam, q: filters.q, page: filters.page + 1 }),
          }}
          scroll={false}
          className="inline-flex h-11 items-center justify-center border border-line-strong text-sm font-semibold transition hover:border-admin-fill"
        >
          {t("more")}
        </Link>
      )}
    </ReviewSection>
  );
}
