import type { ReactNode } from "react";

// Colonne étroite et centrée pour les pages de connexion et d'inscription.
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-7 px-4 pt-7 pb-12 md:pt-14 md:pb-20">
      {children}
    </div>
  );
}
