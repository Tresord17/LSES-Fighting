import type { ReactNode } from "react";

// Message de formulaire. Le rouge sang est réservé aux erreurs, conformément
// aux règles du design system ; les confirmations utilisent le vert.
export function FormAlert({
  tone,
  children,
}: {
  tone: "error" | "success" | "info";
  children: ReactNode;
}) {
  const styles = {
    error: "border-blood text-blood-ink",
    success: "border-success text-success",
    info: "border-gold text-foreground",
  }[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`border-l-3 bg-surface px-4 py-3 text-sm leading-relaxed ${styles}`}
    >
      {children}
    </div>
  );
}
