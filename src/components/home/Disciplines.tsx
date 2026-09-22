import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SectionTitle } from "@/components/ui/SectionTitle";

const DISCIPLINES = ["sambo", "mma"] as const;

export function Disciplines() {
  const t = useTranslations("home.disciplines");

  return (
    <section
      id="disciplines"
      className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-7.5 pb-6.5 md:pt-14"
    >
      <div className="flex flex-col gap-3.5">
        <SectionTitle>{t("title")}</SectionTitle>
        <ul className="grid gap-2.5 md:grid-cols-2">
          {DISCIPLINES.map((slug) => (
            <li key={slug}>
              <Link
                href={`/disciplines/${slug}`}
                className="group relative flex h-33 items-end border-l-3 border-gold hatch md:h-48"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-linear-to-r from-[rgb(var(--hero-fade)/0.9)] from-10% to-[rgb(var(--hero-fade)/0.15)]"
                />
                <span className="relative flex flex-col gap-0.5 p-4">
                  <span className="font-display text-3xl leading-none font-bold uppercase transition-colors group-hover:text-gold-ink md:text-4xl">
                    {slug === "mma" ? "MMA" : "Sambo"}
                  </span>
                  <span className="text-xs text-muted md:text-sm">{t(slug)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
