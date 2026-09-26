import { getFormatter } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { PublicNews } from "@/lib/news/data";
import { Thumb } from "@/components/ui/Thumb";

// Date de publication en capitales mono : « 12 SEPT. 2026 »
export async function NewsDate({ iso, gold = false }: { iso: string; gold?: boolean }) {
  const format = await getFormatter();
  return (
    <time
      dateTime={iso}
      className={`font-mono text-[10px] uppercase ${gold ? "text-gold-ink" : "text-subtle"}`}
    >
      {format.dateTime(new Date(iso), { dateStyle: "medium" })}
    </time>
  );
}

// Ligne d'actualité : vignette, titre et date (accueil, liste, « À lire aussi »)
export function NewsRow({ item, excerpt = false }: { item: PublicNews; excerpt?: boolean }) {
  return (
    <li className="bg-background">
      <Link href={`/actualites/${item.slug}`} className="group flex items-start gap-3 py-3.5">
        <span className="relative h-16.5 w-22 shrink-0 overflow-hidden hatch md:h-24 md:w-32">
          {item.coverThumbUrl && (
            <Thumb
              src={item.coverThumbUrl}
              fallback={item.coverUrl}
              className="h-full w-full object-cover"
            />
          )}
        </span>
        <span className="flex min-w-0 flex-col gap-1.5">
          <span
            lang={item.fallback ? "fr" : undefined}
            className="text-sm leading-snug font-semibold group-hover:text-gold-ink md:text-base"
          >
            {item.title}
          </span>
          {excerpt && item.excerpt && (
            <span
              lang={item.fallback ? "fr" : undefined}
              className="line-clamp-2 text-[13px] leading-normal text-muted"
            >
              {item.excerpt}
            </span>
          )}
          <NewsDate iso={item.publishedAt} />
        </span>
      </Link>
    </li>
  );
}

// Article à la une de la liste : grande couverture, chapeau
export function FeaturedNews({ item }: { item: PublicNews }) {
  return (
    <Link
      href={`/actualites/${item.slug}`}
      className="group flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:items-center md:gap-10"
    >
      <span className="relative block aspect-video overflow-hidden border-b-2 border-gold hatch">
        {item.coverThumbUrl && item.coverUrl && (
          <Thumb
            src={item.coverThumbUrl}
            srcSet={`${item.coverThumbUrl} 640w, ${item.coverUrl} 1600w`}
            sizes="(min-width: 768px) 60vw, 100vw"
            fallback={item.coverUrl}
            loading="eager"
            className="h-full w-full object-cover"
          />
        )}
      </span>
      <span className="flex flex-col gap-2.5">
        <NewsDate iso={item.publishedAt} gold />
        <span
          lang={item.fallback ? "fr" : undefined}
          className="font-display text-[28px] leading-[1.05] font-bold uppercase group-hover:text-gold-ink md:text-4xl"
        >
          {item.title}
        </span>
        {item.excerpt && (
          <span
            lang={item.fallback ? "fr" : undefined}
            className="text-sm leading-relaxed text-muted md:text-base"
          >
            {item.excerpt}
          </span>
        )}
      </span>
    </Link>
  );
}
