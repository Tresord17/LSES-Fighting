import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { loadMedia } from "@/lib/media/data";
import { STORAGE_QUOTA_BYTES, formatBytes } from "@/lib/media/options";
import { DISCIPLINES, type Discipline } from "@/lib/profile/options";
import { Link } from "@/i18n/navigation";
import { MediaManager } from "@/components/supervisor/MediaManager";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("supervisor.media");
  return { title: t("title"), robots: { index: false } };
}

export default async function MediaPage({
  searchParams,
}: PageProps<"/[locale]/mon-espace/superviseur/medias">) {
  const user = await getSessionUser();
  if (user?.role !== "superviseur") return null;

  const requested = (await searchParams).discipline;
  const discipline: Discipline = requested === "mma" ? "mma" : "sambo";
  const t = await getTranslations("supervisor.media");
  const locale = await getLocale();
  const { items, usedBytes } = await loadMedia(await createClient(), discipline);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-extrabold tracking-[0.04em] uppercase">
          {t("title")}
        </h2>
        <p className="font-mono text-[10px] text-subtle uppercase" title={t("usageLabel")}>
          <span className="sr-only">{t("usageLabel")} : </span>
          {t("usage", {
            used: formatBytes(usedBytes, locale),
            quota: formatBytes(STORAGE_QUOTA_BYTES, locale),
          })}
        </p>
      </div>

      <nav aria-label={t("disciplines")} className="flex gap-2.25">
        {DISCIPLINES.map((value) => {
          const active = value === discipline;
          return (
            <Link
              key={value}
              href={{
                pathname: "/mon-espace/superviseur/medias",
                query: value === "mma" ? { discipline: "mma" } : {},
              }}
              aria-current={active ? "page" : undefined}
              scroll={false}
              className={`flex h-11.5 grow items-center justify-center font-display text-lg font-bold tracking-[0.04em] uppercase transition-colors ${
                active
                  ? "bg-gold text-on-gold"
                  : "border border-line-strong text-muted hover:text-foreground"
              }`}
            >
              {value === "mma" ? "MMA" : "Sambo"}
            </Link>
          );
        })}
      </nav>

      <MediaManager key={discipline} discipline={discipline} items={items} />
    </div>
  );
}
