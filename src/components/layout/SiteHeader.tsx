import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AccountNav } from "@/components/account/AccountNav";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MainNavLinks } from "./MainNavLinks";
import { MobileMenu } from "./MobileMenu";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { Wordmark } from "./Wordmark";

export function SiteHeader() {
  const t = useTranslations();

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-background">
      <div className="mx-auto flex h-15 max-w-6xl items-center justify-between gap-6 px-4">
        <Link href="/" aria-label={t("a11y.home")}>
          <Wordmark />
        </Link>

        {/* Bureau */}
        <nav aria-label={t("a11y.mainNav")} className="hidden lg:block">
          <MainNavLinks />
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeSwitcher variant="compact" className="hidden lg:flex" />
          <div className="hidden items-center gap-3 lg:flex">
            <AccountNav variant="header" />
          </div>
          <div className="lg:hidden">
            <MobileMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
