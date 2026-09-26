import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { loadDisciplineCovers } from "@/lib/media/data";
import { DISCIPLINES } from "@/lib/profile/options";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Thumb } from "@/components/ui/Thumb";
import { ChevronRightIcon } from "@/components/ui/icons";

// Cartes des deux disciplines, illustrées par la première image de leur
// galerie (sa vignette seulement), sinon par le motif hachuré
export async function Disciplines() {
  const t = await getTranslations("home.disciplines");
  const covers = await loadDisciplineCovers();

  return (
    <section
      id="disciplines"
      className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-7.5 pb-6.5 md:pt-14"
    >
      <div className="flex flex-col gap-3.5">
        <SectionTitle>{t("title")}</SectionTitle>
        <ul className="grid gap-2.5 md:grid-cols-2">
          {DISCIPLINES.map((slug) => {
            const cover = covers[slug];
            return (
              <li key={slug} className="reveal">
                <Link
                  href={`/disciplines/${slug}`}
                  className="group relative flex h-33 items-end overflow-hidden border-l-3 border-gold hatch md:h-48"
                >
                  {cover?.thumbnailUrl && (
                    <Thumb
                      src={cover.thumbnailUrl}
                      fallback={cover.fallbackUrl}
                      className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  )}
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
                  {/* Au survol : flèche qui glisse et filet doré qui se trace */}
                  <ChevronRightIcon className="absolute right-4 bottom-4 h-5 w-5 -translate-x-2 text-gold-ink opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-gold transition-transform duration-500 group-hover:scale-x-100"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
