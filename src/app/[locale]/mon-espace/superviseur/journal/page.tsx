import type { Metadata } from "next";
import Form from "next/form";
import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/auth/session";
import { pickLocale } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";
import { JOURNAL_CATEGORIES, parseJournalFilters } from "@/lib/supervisor/schemas";
import { loadAuditLog } from "@/lib/supervisor/data";
import { toQuery } from "@/lib/directory/filters";
import { Link } from "@/i18n/navigation";
import { ReviewSection } from "@/components/review/ReviewParts";
import { AuditList } from "@/components/supervisor/AuditList";
import { Note } from "@/components/profile/ProfileParts";
import { SearchIcon } from "@/components/ui/icons";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("supervisor.journal");
  return { title: t("title"), robots: { index: false } };
}

export default async function JournalPage({
  params,
  searchParams,
}: PageProps<"/[locale]/mon-espace/superviseur/journal">) {
  const user = await getSessionUser();
  if (user?.role !== "superviseur") return null;

  const locale = pickLocale((await params).locale);
  const filters = parseJournalFilters(await searchParams);
  const t = await getTranslations("supervisor.journal");
  const { entries, total } = await loadAuditLog(await createClient(), filters);
  const categories = Object.keys(JOURNAL_CATEGORIES) as (keyof typeof JOURNAL_CATEGORIES)[];

  return (
    <ReviewSection title={t("title")} aside={t("count", { count: total })}>
      <Form
        action={`/${locale}/mon-espace/superviseur/journal`}
        replace
        scroll={false}
        className="flex flex-col gap-2.5 sm:flex-row"
      >
        <label className="flex h-11 grow items-center gap-2.5 border border-line-strong/60 bg-surface px-3 focus-within:border-admin-fill">
          <SearchIcon className="h-4 w-4 shrink-0 text-subtle" />
          <span className="sr-only">{t("searchLabel")}</span>
          <input
            type="search"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder={t("search")}
            maxLength={60}
            className="h-full min-w-0 grow bg-transparent text-sm outline-none placeholder:text-subtle"
          />
        </label>
        <label className="flex h-11 items-center border border-line-strong/60 bg-surface focus-within:border-admin-fill">
          <span className="sr-only">{t("category")}</span>
          <select
            name="categorie"
            defaultValue={filters.category ?? ""}
            className="h-full cursor-pointer bg-surface px-3 text-sm outline-none"
          >
            <option value="">{t("categories.all")}</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {t(`categories.${category}`)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center bg-admin-fill px-5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          {t("filter")}
        </button>
      </Form>

      {entries.length ? (
        <AuditList entries={entries} />
      ) : (
        <p className="border border-line bg-surface px-4 py-5 text-sm text-muted">{t("empty")}</p>
      )}

      {entries.length < total && (
        <Link
          href={{
            pathname: "/mon-espace/superviseur/journal",
            query: toQuery({
              q: filters.q,
              categorie: filters.category,
              page: filters.page + 1,
            }),
          }}
          scroll={false}
          className="inline-flex h-11 items-center justify-center border border-line-strong text-sm font-semibold transition hover:border-admin-fill"
        >
          {t("more")}
        </Link>
      )}

      <Note>{t("locked")}</Note>
    </ReviewSection>
  );
}
