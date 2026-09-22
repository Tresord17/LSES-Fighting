import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { NAV_ITEMS, SOCIAL_LINKS } from "@/lib/site";
import { FacebookIcon, InstagramIcon, WhatsappIcon } from "@/components/ui/icons";
import { ThemeSwitcher } from "./ThemeSwitcher";

const SOCIALS = [
  { key: "whatsapp", label: "WhatsApp", Icon: WhatsappIcon },
  { key: "facebook", label: "Facebook", Icon: FacebookIcon },
  { key: "instagram", label: "Instagram", Icon: InstagramIcon },
] as const;

export function SiteFooter() {
  const t = useTranslations();
  const socials = SOCIALS.filter((s) => SOCIAL_LINKS[s.key]);

  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-6 pb-8 md:grid-cols-[1fr_auto] md:gap-12 md:py-10">
        <div className="flex flex-col gap-4">
          <span className="font-display text-[17px] font-extrabold tracking-[0.08em] text-subtle">
            LSES FIGHTING
          </span>
          <ul className="flex flex-wrap gap-x-5 gap-y-2.5 text-xs text-muted">
            {[...NAV_ITEMS, { href: "/contact", key: "contact" } as const].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-foreground">
                  {t(`nav.${item.key}`)}
                </Link>
              </li>
            ))}
          </ul>

          {socials.length > 0 && (
            <ul className="flex gap-2">
              {socials.map(({ key, label, Icon }) => (
                <li key={key}>
                  <a
                    href={SOCIAL_LINKS[key]!}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-11 w-11 items-center justify-center border border-line text-muted hover:text-foreground"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                </li>
              ))}
            </ul>
          )}

          <p className="text-xs text-subtle">{t("footer.dojos")}</p>
        </div>

        <div className="flex flex-col gap-3 md:w-80">
          <span className="eyebrow text-muted">{t("theme.label")}</span>
          <ThemeSwitcher />
        </div>

        <p className="eyebrow text-subtle md:col-span-2">
          <Link href="/mentions-legales" className="hover:text-foreground">
            {t("footer.legal")}
          </Link>
          {" · "}
          <Link href="/confidentialite" className="hover:text-foreground">
            {t("footer.privacy")}
          </Link>
          {" · © "}
          {new Date().getFullYear()} LSES Fighting
        </p>
      </div>
    </footer>
  );
}
