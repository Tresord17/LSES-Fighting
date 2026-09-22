// Icônes des maquettes, en SVG inline (trait 1,7 à 1,9 px, angles vifs).
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const MonitorIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="5" width="18" height="13" />
    <path d="M8 21h8" />
  </Base>
);

export const SunIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
  </Base>
);

export const MoonIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 14a8 8 0 0 1-10-10 8 8 0 1 0 10 10z" />
  </Base>
);

export const MenuIcon = (p: IconProps) => (
  <Base strokeWidth={1.9} {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Base>
);

export const CloseIcon = (p: IconProps) => (
  <Base strokeWidth={1.9} {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Base>
);

export const WhatsappIcon = (p: IconProps) => (
  <Base strokeWidth={1.7} {...p}>
    <path d="M4 20l1.4-4.2A8 8 0 1 1 8.6 19L4 20z" />
  </Base>
);

export const FacebookIcon = (p: IconProps) => (
  <Base strokeWidth={1.7} {...p}>
    <path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v6h4v-6h3l1-4h-4V8z" />
  </Base>
);

export const InstagramIcon = (p: IconProps) => (
  <Base strokeWidth={1.7} {...p}>
    <rect x="4" y="4" width="16" height="16" />
    <circle cx="12" cy="12" r="4" />
    <path d="M17 7h.01" />
  </Base>
);
