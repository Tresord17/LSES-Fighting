import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";

type Props = ComponentProps<typeof Link> & {
  variant?: "primary" | "outline";
  size?: "md" | "sm";
};

// Bouton doré : libellé toujours presque noir (le blanc sur doré ne tient pas l'AA).
const VARIANTS = {
  primary: "bg-gold text-on-gold hover:brightness-110",
  outline: "border border-line-strong text-foreground hover:border-gold",
};

const SIZES = { md: "h-12 px-5", sm: "h-10 px-4" };

export function ButtonLink({ variant = "primary", size = "md", className = "", ...props }: Props) {
  return (
    <Link
      className={`inline-flex items-center justify-center text-sm font-semibold transition ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
