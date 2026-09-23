"use client";

import { useEffect, useRef, useTransition, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { toQuery } from "@/lib/directory/filters";
import { ChevronDownIcon, CloseIcon, SearchIcon } from "@/components/ui/icons";

export type FilterField = {
  name: string;
  label: string;
  value: string | null;
  options: { value: string; label: string }[];
  // champs à vider quand celui-ci change (ex. la catégorie après la discipline)
  resets?: string[];
};

type Props = {
  basePath: "/athletes" | "/coachs";
  query: string | null;
  searchLabel: string;
  searchPlaceholder: string;
  fields: FilterField[];
  total: number;
  hasFilters: boolean;
};

// Recherche et filtres des répertoires. Sans JavaScript, c'est un simple
// formulaire GET ; avec JavaScript, chaque changement met l'adresse à jour
// sans recharger la page ni remonter en haut.
export function DirectoryFilters({
  basePath,
  query,
  searchLabel,
  searchPlaceholder,
  fields,
  total,
  hasFilters,
}: Props) {
  const t = useTranslations("directory.filters");
  const locale = useLocale();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [pending, startTransition] = useTransition();

  useEffect(() => () => clearTimeout(timer.current), []);

  // Retour arrière ou « Effacer » : le champ reprend la recherche de
  // l'adresse, sauf pendant la saisie.
  useEffect(() => {
    const input = inputRef.current;
    if (input && document.activeElement !== input) input.value = query ?? "";
  }, [query]);

  // Relit le formulaire, applique les changements demandés et navigue.
  // Toute modification ramène à la première page de résultats.
  function navigate(overrides: Record<string, string | null> = {}) {
    clearTimeout(timer.current);
    const form = formRef.current;
    if (!form) return;
    const values: Record<string, string | null> = {};
    for (const [key, value] of new FormData(form).entries()) values[key] = String(value);
    for (const [key, value] of Object.entries(overrides)) {
      values[key] = value;
      for (const reset of fields.find((field) => field.name === key)?.resets ?? []) {
        values[reset] = null;
      }
    }
    startTransition(() => {
      router.replace({ pathname: basePath, query: toQuery(values) }, { scroll: false });
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate();
  }

  return (
    <form
      ref={formRef}
      action={`/${locale}${basePath}`}
      method="get"
      role="search"
      aria-label={searchLabel}
      onSubmit={onSubmit}
      className="flex flex-col gap-3"
    >
      <div className="flex h-12 items-center gap-2.75 border border-line-strong/60 bg-surface px-3.25 focus-within:border-gold">
        <SearchIcon className="h-4.25 w-4.25 shrink-0 text-subtle" />
        <input
          type="search"
          ref={inputRef}
          name="q"
          defaultValue={query ?? ""}
          placeholder={searchPlaceholder}
          aria-label={searchLabel}
          maxLength={60}
          autoComplete="off"
          enterKeyHint="search"
          onChange={() => {
            clearTimeout(timer.current);
            timer.current = setTimeout(() => navigate(), 400);
          }}
          className="h-full min-w-0 grow bg-transparent text-sm text-foreground outline-none placeholder:text-subtle [&::-webkit-search-cancel-button]:hidden"
        />
        <button
          type="submit"
          className="sr-only focus:not-sr-only focus:text-xs focus:font-semibold focus:text-gold-ink"
        >
          {t("submit")}
        </button>
      </div>

      <fieldset className="flex flex-wrap gap-1.75">
        <legend className="sr-only">{t("label")}</legend>
        {fields.map((field) =>
          field.value ? (
            <span key={field.name} className="contents">
              <input type="hidden" name={field.name} value={field.value} />
              <button
                type="button"
                onClick={() => navigate({ [field.name]: null })}
                aria-label={t("remove", {
                  label: field.options.find((o) => o.value === field.value)?.label ?? field.value,
                })}
                className="inline-flex h-11 items-center gap-1.75 bg-gold px-3.25 font-mono text-[11px] tracking-[0.06em] text-on-gold uppercase transition hover:brightness-110"
              >
                {field.options.find((o) => o.value === field.value)?.label ?? field.value}
                <CloseIcon className="h-2.75 w-2.75" strokeWidth={2.6} />
              </button>
            </span>
          ) : (
            <label
              key={field.name}
              className="relative inline-flex h-11 items-center border border-line-strong/70 text-muted focus-within:border-gold hover:text-foreground"
            >
              <span className="sr-only">{field.label}</span>
              <select
                name={field.name}
                defaultValue=""
                onChange={(event) => navigate({ [field.name]: event.target.value || null })}
                className="h-full cursor-pointer appearance-none bg-surface pr-8 pl-3.25 font-mono text-[11px] tracking-[0.06em] uppercase outline-none"
              >
                <option value="">{field.label}</option>
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-3 h-2.75 w-2.75 text-subtle" />
            </label>
          ),
        )}
      </fieldset>

      <div className="flex items-center justify-between gap-3">
        <p aria-live="polite" className="font-mono text-[11px] text-muted uppercase">
          {pending
            ? t("loading")
            : t.rich("results", {
                count: total,
                b: (chunks) => <span className="text-sm text-foreground">{chunks}</span>,
              })}
        </p>
        {hasFilters && (
          <Link
            href={basePath}
            scroll={false}
            className="text-xs font-semibold text-gold-ink hover:text-gold-ink-hover"
          >
            {t("clear")}
          </Link>
        )}
      </div>
    </form>
  );
}
