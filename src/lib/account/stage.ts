import type { Database } from "@/lib/supabase/database.types";

type Role = Database["public"]["Enums"]["app_role"];
type Status = Database["public"]["Enums"]["review_status"];

// Où en est le visiteur, pour adapter les boutons « Rejoindre » de l'accueil.
// « member » : connecté, mais la fiche n'a pas pu être lue.
export type AccountStage =
  "guest" | "member" | "chooseRole" | "draft" | "rejected" | "pending" | "approved" | "supervisor";

export function accountStage(role: Role | null, status: Status | null): AccountStage {
  if (!role) return "chooseRole";
  if (!status) return role === "superviseur" ? "supervisor" : "draft";
  return status;
}

// Destination et libellé (clé de « nav ») du bouton, selon l'étape.
// Le libellé des visiteurs reste propre à chaque bouton.
export const ACCOUNT_ACTION: Record<
  Exclude<AccountStage, "guest">,
  { href: string; label: "completeProfile" | "editProfile" | "account" }
> = {
  chooseRole: { href: "/bienvenue", label: "completeProfile" },
  draft: { href: "/mon-espace/profil", label: "completeProfile" },
  rejected: { href: "/mon-espace/profil", label: "editProfile" },
  pending: { href: "/mon-espace", label: "account" },
  approved: { href: "/mon-espace", label: "account" },
  supervisor: { href: "/mon-espace", label: "account" },
  member: { href: "/mon-espace", label: "account" },
};
