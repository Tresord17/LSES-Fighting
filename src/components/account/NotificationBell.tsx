"use client";

import { useEffect, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NOTIFICATIONS_REFRESH } from "@/lib/notifications/events";
import type { NotificationItem, Notifications } from "@/lib/notifications/data";
import { BellIcon, CheckIcon } from "@/components/ui/icons";
import { useSignedIn } from "./useSignedIn";

type Payload = { enabled: false } | ({ enabled: true; userId: string } & Notifications);

const PANEL_ID = "panneau-notifications";
// Nouvelle lecture au plus toutes les 20 s (changement de page, retour sur
// l'onglet), toutes les 90 s tant que l'onglet est visible, et aussitôt à
// l'ouverture du panneau ou après une décision.
const MIN_INTERVAL = 20_000;
const POLL_INTERVAL = 90_000;
const DATE = { day: "numeric", month: "short" } as const;

async function fetchNotifications(): Promise<Payload | null> {
  try {
    const response = await fetch("/api/notifications", { cache: "no-store" });
    return response.ok ? ((await response.json()) as Payload) : null;
  } catch {
    // hors ligne : on garde le dernier compteur connu
    return null;
  }
}

// Cloche des coachs référencés et du superviseur général : compteur des
// demandes à trancher et des fiches modifiées, panneau de détail natif
// (attribut popover : Échap et clic extérieur le referment sans script).
export function NotificationBell() {
  const t = useTranslations("notifications");
  const format = useFormatter();
  const pathname = usePathname();
  const signedIn = useSignedIn();
  const [data, setData] = useState<Payload | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const forcedKey = useRef(0);

  const lastFetch = useRef(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // Lecture à la connexion, à chaque changement de page et sur demande
  // (refreshKey), au plus toutes les 20 s sauf demande explicite
  useEffect(() => {
    if (!signedIn) return;
    const forced = refreshKey !== forcedKey.current;
    forcedKey.current = refreshKey;
    if (!forced && Date.now() - lastFetch.current < MIN_INTERVAL) return;
    lastFetch.current = Date.now();
    let active = true;
    fetchNotifications().then((payload) => {
      if (active && payload) setData(payload);
    });
    return () => {
      active = false;
    };
  }, [signedIn, pathname, refreshKey]);

  useEffect(() => {
    if (!signedIn) return;
    const force = () => setRefreshKey((key) => key + 1);
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastFetch.current > MIN_INTERVAL) {
        force();
      }
    };
    const timer = setInterval(onVisible, POLL_INTERVAL);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(NOTIFICATIONS_REFRESH, force);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(NOTIFICATIONS_REFRESH, force);
    };
  }, [signedIn]);

  if (!signedIn || !data?.enabled) return null;

  const close = () => panel.current?.hidePopover();
  const day = (iso: string) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? "" : format.dateTime(date, DATE);
  };
  const meta = (item: NotificationItem) => {
    switch (item.meta.kind) {
      case "due":
        return t("meta.due", { days: item.meta.days });
      case "escalated":
        return t("meta.escalated");
      case "since":
        return t("meta.since", { date: day(item.meta.date) });
      case "modified":
        return item.meta.date && day(item.meta.date)
          ? t("meta.modified", { date: day(item.meta.date) })
          : t("meta.modifiedShort");
    }
  };
  const count = data.total;

  return (
    <>
      <button
        type="button"
        popoverTarget={PANEL_ID}
        aria-label={t("button", { count })}
        title={t("label")}
        className="relative flex h-11 w-11 items-center justify-center text-foreground transition-colors hover:text-gold-ink lg:h-9 lg:w-9 lg:border lg:border-line lg:bg-surface lg:text-muted lg:hover:text-foreground"
      >
        <BellIcon
          key={count}
          className={`h-5 w-5 origin-top lg:h-4.5 lg:w-4.5 ${count > 0 ? "animate-ring" : ""}`}
        />
        {count > 0 && (
          <span
            key={`badge-${count}`}
            aria-hidden="true"
            className="absolute top-1 right-0.5 flex h-4.5 min-w-4.5 animate-pop items-center justify-center bg-gold px-1 font-mono text-[10px] leading-none font-medium text-on-gold lg:-top-1.5 lg:-right-1.5"
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      <div
        id={PANEL_ID}
        ref={panel}
        popover="auto"
        onToggle={(event) => {
          if (event.newState === "open") setRefreshKey((key) => key + 1);
        }}
        className="fixed top-16 right-[max(1rem,calc((100vw-72rem)/2+1rem))] bottom-auto left-auto m-0 w-[min(22rem,calc(100vw-2rem))] popover-anim border border-t-2 border-line border-t-gold bg-surface p-0 text-foreground shadow-2xl shadow-black/30"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="eyebrow text-gold-ink">{t("title")}</p>
          <span className="font-mono text-[11px] text-subtle">{count}</span>
        </div>

        {data.groups.length === 0 ? (
          <p className="flex items-center gap-2.5 px-4 py-6 text-sm text-muted">
            <CheckIcon className="h-4 w-4 shrink-0 text-success" />
            {t("empty")}
          </p>
        ) : (
          <ul className="max-h-[min(65vh,28rem)] overflow-y-auto">
            {data.groups.map((group) => (
              <li key={group.key} className="border-b border-line px-4 py-3">
                <Link
                  href={group.href}
                  onClick={close}
                  className="flex items-center justify-between gap-3 text-[13px] font-semibold transition-colors hover:text-gold-ink"
                >
                  {t(`groups.${group.key}`)}
                  <span
                    className={`flex h-5 min-w-5 items-center justify-center px-1.5 font-mono text-[11px] ${
                      group.key === "escalated" ? "bg-blood text-white" : "bg-gold text-on-gold"
                    }`}
                  >
                    {group.count}
                  </span>
                </Link>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={group.href}
                        onClick={close}
                        className="flex items-baseline justify-between gap-3 text-[13px] text-muted transition-colors hover:text-foreground"
                      >
                        <span className="truncate">{item.name}</span>
                        <span className="shrink-0 font-mono text-[10px] text-subtle uppercase">
                          {meta(item)}
                        </span>
                      </Link>
                    </li>
                  ))}
                  {group.count > group.items.length && (
                    <li className="text-[11px] text-subtle">
                      {t("more", { count: group.count - group.items.length })}
                    </li>
                  )}
                </ul>
              </li>
            ))}
          </ul>
        )}

        <Link
          href={data.href}
          onClick={close}
          className="block px-4 py-3 text-center text-xs font-semibold text-gold-ink transition-colors hover:text-gold-ink-hover"
        >
          {t("all")}
        </Link>
      </div>
    </>
  );
}
