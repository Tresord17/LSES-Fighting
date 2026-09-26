import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";

type Props = ComponentProps<typeof Link> & {
  variant?: "primary" | "outline";
  size?: "md" | "sm";
};

// Bouton doré : libellé toujours presque noir (le blanc sur doré ne tient pas l'AA).
// Reflet qui le traverse au survol, léger enfoncement au clic.
const VARIANTS = {
  primary: "shine bg-gold text-on-gold hover:brightness-110",
  outline: "border border-line-strong text-foreground hover:border-gold hover:bg-gold/5",
};

const SIZES = { md: "h-12 px-5", sm: "h-10 px-4" };

export function ButtonLink({ variant = "primary", size = "md", className = "", ...props }: Props) {
  return (
    <Link
      className={`inline-flex items-center justify-center text-sm font-semibold transition duration-200 active:scale-[0.98] ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
