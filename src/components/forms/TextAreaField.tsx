import type { TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  name: string;
  label: string;
  error?: string;
};

export function TextAreaField({ name, label, error, id, className = "", ...area }: Props) {
  const areaId = id ?? `champ-${name}`;
  return (
    <div className="flex flex-col gap-1.75">
      <label htmlFor={areaId} className="eyebrow tracking-[0.12em] text-subtle">
        {label}
      </label>
      <textarea
        id={areaId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${areaId}-erreur` : undefined}
        className={`min-h-27 border bg-surface p-3 text-[13px] leading-relaxed text-foreground outline-none placeholder:text-subtle focus:border-gold ${
          error ? "border-blood" : "border-line-strong/60"
        } ${className}`}
        {...area}
      />
      {error && (
        <p id={`${areaId}-erreur`} className="text-xs text-blood-ink">
          {error}
        </p>
      )}
    </div>
  );
}
