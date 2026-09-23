import type { InputHTMLAttributes, ReactNode } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  trailing?: ReactNode;
};

// Champ de saisie des maquettes : libellé mono, fond de surface, erreur en rouge sang.
export function Field({ name, label, error, hint, trailing, id, className = "", ...input }: Props) {
  const inputId = id ?? `champ-${name}`;
  const describedBy = error ? `${inputId}-erreur` : hint ? `${inputId}-aide` : undefined;

  return (
    <div className="flex flex-col gap-1.75">
      <label htmlFor={inputId} className="eyebrow tracking-[0.14em] text-subtle">
        {label}
      </label>
      <div
        className={`flex h-13 items-center border bg-surface focus-within:border-gold ${
          error ? "border-blood" : "border-line-strong/60"
        }`}
      >
        <input
          id={inputId}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`h-full min-w-0 flex-1 bg-transparent px-3.25 text-sm text-foreground outline-none placeholder:text-subtle ${className}`}
          {...input}
        />
        {trailing}
      </div>
      {error ? (
        <p id={`${inputId}-erreur`} className="text-xs text-blood-ink">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-aide`} className="text-xs text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
