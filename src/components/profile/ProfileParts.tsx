import type { ReactNode } from "react";

// Sous-titre de section des formulaires (filet doré + libellé mono)
export function FormSection({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5">
          <span aria-hidden="true" className="h-0.5 w-5.5 bg-gold" />
          <span className="eyebrow text-muted">{title}</span>
        </h2>
        {aside && <span className="font-mono text-[10px] text-subtle uppercase">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.75 border border-line p-3.25">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="mt-0.5 h-4 w-4 shrink-0 text-subtle"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8h.01M11 12h1v5h1" />
      </svg>
      <p className="text-[11.5px] leading-relaxed text-subtle">{children}</p>
    </div>
  );
}

export function ProgressBlock({
  step,
  remaining,
  ratio,
}: {
  step: string;
  remaining: string;
  ratio: number;
}) {
  return (
    <div className="flex flex-col gap-2.5 border-y border-line py-4">
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow tracking-[0.14em] text-muted">{step}</span>
        <span className="font-mono text-[10px] text-muted uppercase" aria-live="polite">
          {remaining}
        </span>
      </div>
      <div
        className="flex h-1 bg-line"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
        aria-label={step}
      >
        <div
          className="bg-gold transition-[width]"
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}
