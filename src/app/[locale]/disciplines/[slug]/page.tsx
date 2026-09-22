import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/ui/ComingSoon";

const DISCIPLINES = ["sambo", "mma"] as const;
type DisciplineSlug = (typeof DISCIPLINES)[number];

function isDiscipline(slug: string): slug is DisciplineSlug {
  return DISCIPLINES.includes(slug as DisciplineSlug);
}

// Pages générées au build : /disciplines/sambo et /disciplines/mma.
export function generateStaticParams() {
  return DISCIPLINES.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/disciplines/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  if (!isDiscipline(slug)) return {};
  const t = await getTranslations("nav");
  return { title: t(slug) };
}

export default async function DisciplinePage({
  params,
}: PageProps<"/[locale]/disciplines/[slug]">) {
  const { slug } = await params;
  if (!isDiscipline(slug)) notFound();
  const t = await getTranslations("nav");
  return <ComingSoon title={t(slug)} />;
}
