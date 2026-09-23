import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { parseAthleteFilters, toQuery } from "@/lib/directory/filters";
import { listAthletes } from "@/lib/directory/queries";
import { DISCIPLINES, SEXES, formatWeightClass, weightClassesFor } from "@/lib/profile/options";
import { DirectoryFilters, type FilterField } from "@/components/directory/DirectoryFilters";
import { DirectoryHeader } from "@/components/directory/DirectoryHeader";
import {
  AthleteResult,
  EmptyResults,
  ResultGrid,
  disciplineLabel,
} from "@/components/directory/Cards";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("directory.athletes");
  return { title: t("title"), description: t("intro") };
}

export default async function AthletesPage({ searchParams }: PageProps<"/[locale]/athletes">) {
  const filters = parseAthleteFilters(await searchParams);
  const t = await getTranslations("directory");
  const tFields = await getTranslations("profile.fields");
  const { items, total, cities } = await listAthletes(filters);

  const hasFilters = Boolean(
    filters.q || filters.discipline || filters.sex || filters.weight || filters.city,
  );
  const withCurrent = (values: string[], current: string | null) =>
    current && !values.includes(current) ? [...values, current] : values;

  const fields: FilterField[] = [
    {
      name: "discipline",
      label: t("filters.discipline"),
      value: filters.discipline,
      options: DISCIPLINES.map((value) => ({ value, label: disciplineLabel(value) ?? value })),
      resets: ["weight"],
    },
    {
      name: "sex",
      label: t("filters.sex"),
      value: filters.sex,
      options: SEXES.map((value) => ({ value, label: tFields(`sexOptions.${value}`) })),
      resets: ["weight"],
    },
    // la catégorie dépend de la discipline : proposée une fois celle-ci choisie
    ...(filters.discipline
      ? [
          {
            name: "weight",
            label: t("filters.weight"),
            value: filters.weight,
            options: weightClassesFor(filters.discipline, filters.sex, filters.weight).map(
              (value) => ({ value, label: formatWeightClass(value) }),
            ),
          },
        ]
      : []),
    {
      name: "city",
      label: t("filters.city"),
      value: filters.city,
      options: withCurrent(cities, filters.city).map((value) => ({ value, label: value })),
    },
  ];

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-8 pb-14 md:pt-14">
      <DirectoryHeader
        eyebrow={t("athletes.eyebrow")}
        title={t("athletes.title")}
        intro={t("athletes.intro")}
      />

      <DirectoryFilters
        basePath="/athletes"
        query={filters.q}
        searchLabel={t("athletes.searchLabel")}
        searchPlaceholder={t("athletes.search")}
        fields={fields}
        total={total}
        hasFilters={hasFilters}
      />

      {items.length === 0 ? (
        <EmptyResults>{hasFilters ? t("athletes.empty") : t("athletes.emptyAll")}</EmptyResults>
      ) : (
        <ResultGrid>
          {items.map((athlete) => (
            <AthleteResult key={athlete.slug} athlete={athlete} />
          ))}
        </ResultGrid>
      )}

      {items.length < total && (
        <Link
          href={{
            pathname: "/athletes",
            query: toQuery({ ...filters, page: filters.page + 1 }),
          }}
          scroll={false}
          className="inline-flex h-12 items-center justify-center border border-line-strong text-sm font-semibold transition hover:border-gold md:mx-auto md:w-72"
        >
          {t("more")}
        </Link>
      )}
    </section>
  );
}
