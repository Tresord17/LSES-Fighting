import type { ReactNode, SelectHTMLAttributes } from "react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
};

export function SelectField({
  name,
  label,
  error,
  hint,
  id,
  children,
  className = "",
  ...select
}: Props) {
  const selectId = id ?? `champ-${name}`;
  const describedBy = error ? `${selectId}-erreur` : hint ? `${selectId}-aide` : undefined;
  return (
    <div className="flex flex-col gap-1.75">
      <label htmlFor={selectId} className="eyebrow tracking-[0.12em] text-subtle">
        {label}
      </label>
      <div
        className={`relative flex h-12.5 items-center border bg-surface focus-within:border-gold ${
          error ? "border-blood" : "border-line-strong/60"
        } ${select.disabled ? "opacity-60" : ""}`}
      >
        <select
          id={selectId}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`h-full w-full cursor-pointer appearance-none bg-surface pr-9 pl-3 text-sm text-foreground outline-none disabled:cursor-not-allowed ${className}`}
          {...select}
        >
          {children}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="pointer-events-none absolute right-3 h-4 w-4 text-subtle"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      {error ? (
        <p id={`${selectId}-erreur`} className="text-xs text-blood-ink">
          {error}
        </p>
      ) : hint ? (
        <p id={`${selectId}-aide`} className="text-[11px] leading-normal text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
