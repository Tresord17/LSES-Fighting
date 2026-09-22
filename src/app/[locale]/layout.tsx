import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import localFont from "next/font/local";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import "../globals.css";

// Polices des maquettes, auto-hébergées dans src/fonts (licence OFL) :
// Saira Condensed (titres), IBM Plex Sans (texte), IBM Plex Mono (sur-titres).
// Aucune requête vers Google Fonts, ni au build ni chez le visiteur.
const saira = localFont({
  src: [
    { path: "../../fonts/saira-condensed-latin-600-normal.woff2", weight: "600" },
    { path: "../../fonts/saira-condensed-latin-700-normal.woff2", weight: "700" },
    { path: "../../fonts/saira-condensed-latin-800-normal.woff2", weight: "800" },
  ],
  variable: "--font-saira",
  display: "swap",
});
const plexSans = localFont({
  src: [
    { path: "../../fonts/ibm-plex-sans-latin-400-normal.woff2", weight: "400" },
    { path: "../../fonts/ibm-plex-sans-latin-500-normal.woff2", weight: "500" },
    { path: "../../fonts/ibm-plex-sans-latin-600-normal.woff2", weight: "600" },
  ],
  variable: "--font-plex-sans",
  display: "swap",
});
const plexMono = localFont({
  src: [
    { path: "../../fonts/ibm-plex-mono-latin-400-normal.woff2", weight: "400" },
    { path: "../../fonts/ibm-plex-mono-latin-500-normal.woff2", weight: "500" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: { default: t("title"), template: "%s · LSES Fighting" },
    description: t("description"),
    icons: { icon: "/brand/logo-or.png" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0c0e" },
  ],
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations("a11y");

  return (
    // suppressHydrationWarning : le script de thème modifie <html> avant React.
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${saira.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <NextIntlClientProvider>
          <a
            href="#contenu"
            className="sr-only z-60 bg-gold px-4 py-2 font-semibold text-on-gold focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
          >
            {t("skipToContent")}
          </a>
          <SiteHeader />
          <main id="contenu" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
