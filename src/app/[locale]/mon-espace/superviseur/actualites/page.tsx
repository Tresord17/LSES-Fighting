import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { loadNewsList } from "@/lib/news/data";
import { Link } from "@/i18n/navigation";
import { FormAlert } from "@/components/forms/FormAlert";
import { ReviewSection } from "@/components/review/ReviewParts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("supervisor.news");
  return { title: t("title"), robots: { index: false } };
}

export default async function NewsListPage({
  searchParams,
}: PageProps<"/[locale]/mon-espace/superviseur/actualites">) {
  const user = await getSessionUser();
  if (user?.role !== "superviseur") return null;

  const t = await getTranslations("supervisor.news");
  const format = await getFormatter();
  const state = (await searchParams).etat;
  const news = await loadNewsList(await createClient());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-extrabold tracking-[0.04em] uppercase">
          {t("title")}
        </h2>
        <Link
          href="/mon-espace/superviseur/actualites/nouvelle"
          className="inline-flex h-10 items-center bg-admin-fill px-4 text-sm font-semibold text-white transition hover:brightness-110"
        >
          + {t("new")}
        </Link>
      </div>

      {state === "supprimee" && <FormAlert tone="success">{t("done.supprimee")}</FormAlert>}
      {state === "erreur" && <FormAlert tone="error">{t("done.erreur")}</FormAlert>}

      <ReviewSection title={t("title")} aside={String(news.length)}>
        {news.length === 0 ? (
          <p className="border border-line bg-surface px-4 py-5 text-sm text-muted">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-px bg-line">
            {news.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/mon-espace/superviseur/actualites/${item.id}`}
                  className="flex items-center gap-3 bg-surface p-2.75 transition-colors hover:bg-line/40"
                >
                  {item.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.coverUrl}
                      alt=""
                      loading="lazy"
                      className="h-12.5 w-17 shrink-0 object-cover"
                    />
                  ) : (
                    <span aria-hidden="true" className="block h-12.5 w-17 shrink-0 hatch" />
                  )}
                  <span className="flex min-w-0 grow flex-col gap-1">
                    <span className="text-[13px] font-medium">{item.titleFr}</span>
                    <span className="font-mono text-[9.5px] text-subtle uppercase">
                      {item.status === "published" && item.publishedAt
                        ? t("publishedOn", {
                            date: format.dateTime(new Date(item.publishedAt), {
                              dateStyle: "medium",
                            }),
                          })
                        : t("updatedOn", {
                            date: format.dateTime(new Date(item.updatedAt), {
                              dateStyle: "medium",
                            }),
                          })}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 border px-2 py-1 font-mono text-[10px] tracking-[0.1em] uppercase ${
                      item.status === "published"
                        ? "border-success text-success"
                        : "border-line-strong text-muted"
                    }`}
                  >
                    {t(`status.${item.status}`)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </ReviewSection>
    </div>
  );
}
