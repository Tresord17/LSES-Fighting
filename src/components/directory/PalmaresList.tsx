"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { formatWeightClass, type CompetitionResult } from "@/lib/profile/options";
import type { PalmaresItem } from "@/lib/directory/queries";

const VISIBLE = 3;

// L'or porte le doré de la marque ; l'argent et le bronze restent neutres
const RESULT_TONES: Record<CompetitionResult, string> = {
  gold: "text-gold-ink",
  silver: "text-muted",
  bronze: "text-subtle",
  participation: "text-subtle",
};

export function PalmaresList({ items }: { items: PalmaresItem[] }) {
  const t = useTranslations("directory.profile");
  const tResults = useTranslations("profile.palmares.results");
  const listId = useId();
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, VISIBLE);
  const hidden = items.length - VISIBLE;

  return (
    <div className="flex flex-col gap-px bg-line">
      <ol id={listId} className="flex flex-col gap-px">
        {shown.map((item) => (
          <li
            key={item.id}
            className={`flex items-center gap-3.25 border-l-3 bg-surface p-3.5 ${
              item.result === "gold" ? "border-gold" : "border-line-strong"
            }`}
          >
            <span className="shrink-0 font-mono text-[13px] text-muted">{item.year}</span>
            <span className="flex min-w-0 grow flex-col gap-0.75">
              <span className="text-sm font-semibold">{item.competition}</span>
              <span className="font-mono text-[10px] text-subtle uppercase">
                {[item.location, item.weightClass ? formatWeightClass(item.weightClass) : null]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            <span
              className={`shrink-0 font-display text-[15px] font-bold tracking-[0.06em] uppercase ${RESULT_TONES[item.result]}`}
            >
              {tResults(item.result)}
            </span>
          </li>
        ))}
      </ol>
      {hidden > 0 && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((value) => !value)}
          className="bg-surface p-3.25 text-[13px] font-semibold text-muted transition-colors hover:text-foreground"
        >
          {expanded ? t("showLess") : t("showMore", { count: hidden })}
        </button>
      )}
    </div>
  );
}
