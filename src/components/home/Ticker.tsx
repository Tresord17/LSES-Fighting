import { Fragment } from "react";
import { useTranslations } from "next-intl";

// Bandeau défilant sous le bandeau d'accueil : décoratif (masqué aux
// lecteurs d'écran), une seule animation de translation, en pause au survol.
// Les mots alternent plein et contour doré ; la liste est doublée pour que
// la boucle soit invisible.
const WORDS = ["w1", "w2", "w3", "w4", "w5", "w6", "w7"] as const;

export function Ticker() {
  const t = useTranslations("home.ticker");

  return (
    <div
      aria-hidden="true"
      className="overflow-hidden border-b border-line bg-surface py-3 md:py-4"
    >
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center">
            {WORDS.map((word, index) => (
              <Fragment key={word}>
                <span
                  className={`px-5 font-display text-2xl leading-none font-bold whitespace-nowrap uppercase md:px-7 md:text-4xl ${
                    index % 2 ? "text-outline" : "text-foreground/90"
                  }`}
                >
                  {t(word)}
                </span>
                <span className="text-sm text-gold md:text-base">✦</span>
              </Fragment>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
