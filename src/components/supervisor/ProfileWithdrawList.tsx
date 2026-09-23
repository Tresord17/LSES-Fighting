"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { withdrawProfileAction } from "@/lib/supervisor/actions";
import type { PublishedProfile } from "@/lib/supervisor/data";
import { REASON_MAX_LENGTH } from "@/lib/review/schemas";
import { FormAlert } from "@/components/forms/FormAlert";
import { TextAreaField } from "@/components/forms/TextAreaField";
import { useErrorText } from "@/components/forms/useErrorText";
import { useNotice } from "@/components/forms/useNotice";
import { de } from "@/lib/french";

function ProfileRow({
  profile,
  type,
  onDone,
}: {
  profile: PublishedProfile;
  type: "athletes" | "coaches";
  onDone: (name: string) => void;
}) {
  const t = useTranslations("supervisor.profiles");
  const format = useFormatter();
  const locale = useLocale();
  const errorText = useErrorText();
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const outcome = await withdrawProfileAction(data);
      startTransition(() => {
        if (outcome.status === "success") onDone(profile.name);
        else setError({ message: outcome.message, field: outcome.fields?.reason });
      });
    });
  }

  const publicHref = profile.slug
    ? `/${type === "athletes" ? "athletes" : "coachs"}/${profile.slug}`
    : null;

  return (
    <li className="flex flex-col gap-3 bg-surface px-3.25 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-0 grow flex-col gap-0.75">
          <span className="text-sm font-semibold">{profile.name}</span>
          <span className="font-mono text-[10px] text-subtle uppercase">
            {[
              profile.meta,
              profile.since
                ? t("since", {
                    date: format.dateTime(new Date(profile.since), { dateStyle: "medium" }),
                  })
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
          {profile.modified && (
            <span className="font-mono text-[10px] text-gold-ink uppercase">{t("modified")}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {publicHref && (
            <Link
              href={publicHref}
              target="_blank"
              className="text-xs font-semibold text-muted hover:text-foreground"
            >
              {t("view")}
            </Link>
          )}
          {!withdrawing && (
            <button
              type="button"
              onClick={() => setWithdrawing(true)}
              className="inline-flex h-9 items-center border border-line-strong px-3 text-xs font-semibold transition hover:border-blood"
            >
              {t("withdraw")}
            </button>
          )}
        </div>
      </div>

      {withdrawing && (
        <form
          onSubmit={onSubmit}
          noValidate
          className="flex flex-col gap-3 border-t border-line pt-3"
        >
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="profile_id" value={profile.id} />
          {type === "coaches" && (
            <p className="text-xs leading-relaxed text-blood-ink">{t("coachWarning")}</p>
          )}
          <TextAreaField
            id={`motif-retrait-${profile.id}`}
            name="reason"
            label={t("reason")}
            placeholder={t("reasonPlaceholder")}
            maxLength={REASON_MAX_LENGTH}
            rows={2}
            required
            autoFocus
            error={error?.field ? errorText(error.field) : undefined}
          />
          <p className="-mt-2 text-[11px] text-subtle">{t("reasonHint")}</p>
          {error && !error.field && <FormAlert tone="error">{errorText(error.message)}</FormAlert>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-11 grow items-center justify-center bg-blood text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {t("confirmWithdraw")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setWithdrawing(false);
                setError(null);
              }}
              className="inline-flex h-11 w-28 shrink-0 items-center justify-center border border-line-strong text-sm font-semibold transition hover:border-gold"
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      )}
    </li>
  );
}

// Fiches en ligne, avec retrait motivé
// (le message reste affiché même quand la liste devient vide)
export function ProfileWithdrawList({
  profiles,
  type,
}: {
  profiles: PublishedProfile[];
  type: "athletes" | "coaches";
}) {
  const t = useTranslations("supervisor");
  const { announce, region } = useNotice();

  return (
    <div className="flex flex-col gap-3">
      {region}
      {profiles.length ? (
        <ul className="flex flex-col gap-px bg-line">
          {profiles.map((profile) => (
            <ProfileRow
              key={profile.id}
              profile={profile}
              type={type}
              onDone={(name) => announce("success", t("done.withdrawn", { name, de: de(name) }))}
            />
          ))}
        </ul>
      ) : (
        <p className="border border-line bg-surface px-4 py-5 text-sm text-muted">
          {t("profiles.empty")}
        </p>
      )}
    </div>
  );
}
