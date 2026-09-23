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

export const EyeIcon = (p: IconProps) => (
  <Base strokeWidth={1.7} {...p}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Base>
);

export const EyeOffIcon = (p: IconProps) => (
  <Base strokeWidth={1.7} {...p}>
    <path d="M3 3l18 18M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a10.5 10.5 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </Base>
);

export const MailIcon = (p: IconProps) => (
  <Base strokeWidth={1.7} {...p}>
    <rect x="3" y="5" width="18" height="14" />
    <path d="M3 7l9 6 9-6" />
  </Base>
);

export const SearchIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4-4" />
  </Base>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Base strokeWidth={2} {...p}>
    <path d="M9 5l7 7-7 7" />
  </Base>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Base strokeWidth={2.2} {...p}>
    <path d="M6 9l6 6 6-6" />
  </Base>
);

export const CheckIcon = (p: IconProps) => (
  <Base strokeWidth={2.6} {...p}>
    <path d="M5 12l5 5 9-10" />
  </Base>
);

export const CopyIcon = (p: IconProps) => (
  <Base strokeWidth={1.7} {...p}>
    <rect x="9" y="9" width="12" height="12" />
    <path d="M15 9V5H3v12h4" />
  </Base>
);

export const InfoIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8h.01M11 12h1v5h1" />
  </Base>
);
