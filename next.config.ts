import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Le plugin next-intl pointe par défaut vers src/i18n/request.ts
const withNextIntl = createNextIntlPlugin();

// En-têtes de sécurité appliqués à toutes les réponses.
// La politique CSP sera ajoutée quand les domaines Supabase et médias seront figés.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
