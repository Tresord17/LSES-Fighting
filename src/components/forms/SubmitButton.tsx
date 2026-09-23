"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type Props = {
  children: ReactNode;
  variant?: "primary" | "outline";
  className?: string;
};

const VARIANTS = {
  primary: "bg-gold text-on-gold hover:brightness-110",
  outline: "border border-line-strong text-foreground hover:border-gold",
};

// Bouton d'envoi désactivé pendant le traitement, pour éviter les doubles envois.
export function SubmitButton({ children, variant = "primary", className = "" }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex h-13.5 w-full items-center justify-center gap-2.75 text-[15px] font-semibold transition disabled:cursor-wait disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
