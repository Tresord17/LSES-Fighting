import type { ReactNode } from "react";

// Sur-titre de section : filet doré de 22 px + libellé mono espacé.
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="flex items-center gap-2.5">
        <span aria-hidden="true" className="h-0.5 w-5.5 bg-gold" />
        <span className="eyebrow text-muted">{children}</span>
      </h2>
      {action}
    </div>
  );
}
