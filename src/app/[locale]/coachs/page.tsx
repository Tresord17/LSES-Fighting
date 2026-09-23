import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { parseCoachFilters, toQuery } from "@/lib/directory/filters";
import { listCoaches } from "@/lib/directory/queries";
import { DISCIPLINES } from "@/lib/profile/options";
import { DirectoryFilters, type FilterField } from "@/components/directory/DirectoryFilters";
import { DirectoryHeader } from "@/components/directory/DirectoryHeader";
import {
  CoachResult,
  EmptyResults,
  ResultGrid,
  disciplineLabel,
} from "@/components/directory/Cards";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("directory.coaches");
  return { title: t("title"), description: t("intro") };
}

export default async function CoachesPage({ searchParams }: PageProps<"/[locale]/coachs">) {
  const filters = parseCoachFilters(await searchParams);
  const t = await getTranslations("directory");
  const { items, total, cities } = await listCoaches(filters);

  const hasFilters = Boolean(filters.q || filters.discipline || filters.city);
  const cityOptions =
    filters.city && !cities.includes(filters.city) ? [...cities, filters.city] : cities;

  const fields: FilterField[] = [
    {
      name: "discipline",
      label: t("filters.discipline"),
      value: filters.discipline,
      options: DISCIPLINES.map((value) => ({ value, label: disciplineLabel(value) ?? value })),
    },
    {
      name: "city",
      label: t("filters.city"),
      value: filters.city,
      options: cityOptions.map((value) => ({ value, label: value })),
    },
  ];

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-8 pb-14 md:pt-14">
      <DirectoryHeader
        eyebrow={t("coaches.eyebrow")}
        title={t("coaches.title")}
        intro={t("coaches.intro")}
      />

      <DirectoryFilters
        basePath="/coachs"
        query={filters.q}
        searchLabel={t("coaches.searchLabel")}
        searchPlaceholder={t("coaches.search")}
        fields={fields}
        total={total}
        hasFilters={hasFilters}
      />

      {items.length === 0 ? (
        <EmptyResults>{hasFilters ? t("coaches.empty") : t("coaches.emptyAll")}</EmptyResults>
      ) : (
        <ResultGrid>
          {items.map((coach) => (
            <CoachResult key={coach.slug} coach={coach} />
          ))}
        </ResultGrid>
      )}

      {items.length < total && (
        <Link
          href={{ pathname: "/coachs", query: toQuery({ ...filters, page: filters.page + 1 }) }}
          scroll={false}
          className="inline-flex h-12 items-center justify-center border border-line-strong text-sm font-semibold transition hover:border-gold md:mx-auto md:w-72"
        >
          {t("more")}
        </Link>
      )}
    </section>
  );
}
