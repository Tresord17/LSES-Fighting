import { useFormatter, useLocale, useTranslations } from "next-intl";
import { DEMO_NEWS } from "@/lib/demo-data";
import { SectionTitle } from "@/components/ui/SectionTitle";

export function LatestNews() {
  const t = useTranslations("home.news");
  const format = useFormatter();
  const locale = useLocale();

  return (
    <section className="mx-auto max-w-6xl px-4 pb-7 md:pb-14">
      <div className="flex flex-col gap-3.5">
        <SectionTitle>{t("title")}</SectionTitle>
        <ul className="flex flex-col gap-px bg-line md:grid md:grid-cols-2 md:gap-6 md:bg-transparent">
          {DEMO_NEWS.map((item) => (
            <li key={item.id} className="flex items-start gap-3 bg-background py-3.5">
              <div className="h-16.5 w-22 shrink-0 hatch md:h-24 md:w-32" />
              <div className="flex flex-col gap-1.5">
                <span className="text-sm leading-snug font-semibold md:text-base">
                  {item.title[locale]}
                </span>
                <time
                  dateTime={item.publishedAt}
                  className="font-mono text-[10px] text-subtle uppercase"
                >
                  {format.dateTime(new Date(item.publishedAt), { dateStyle: "medium" })}
                </time>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
