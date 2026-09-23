import { getTranslations } from "next-intl/server";
import { signOutAction } from "@/lib/auth/actions";
import type { Locale } from "@/i18n/routing";

export async function SignOutButton({ locale }: { locale: Locale }) {
  const t = await getTranslations("account");
  return (
    <form action={signOutAction}>
      <input type="hidden" name="locale" value={locale} />
      <button
        type="submit"
        className="inline-flex h-11 items-center border border-line-strong px-4 text-sm font-semibold text-muted transition-colors hover:border-gold hover:text-foreground"
      >
        {t("signOut")}
      </button>
    </form>
  );
}
