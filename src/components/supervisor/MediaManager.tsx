"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  addMediaFileAction,
  addMediaLinkAction,
  deleteMediaAction,
  reorderMediaAction,
  updateMediaTitlesAction,
} from "@/lib/media/actions";
import type { MediaItem } from "@/lib/media/data";
import {
  IMAGE_MAX_INPUT_BYTES,
  IMAGE_TYPES,
  VIDEO_MAX_BYTES,
  VIDEO_TYPES,
  formatBytes,
  formatDuration,
} from "@/lib/media/options";
import { uploadImage, uploadVideo, videoDuration } from "@/lib/media/upload";
import type { Discipline } from "@/lib/profile/options";
import { Field } from "@/components/forms/Field";
import { useErrorText } from "@/components/forms/useErrorText";
import { useNotice } from "@/components/forms/useNotice";
import { Note } from "@/components/profile/ProfileParts";
import { ReviewSection } from "@/components/review/ReviewParts";

const DONE = [
  "linkAdded",
  "imageAdded",
  "videoAdded",
  "titlesSaved",
  "orderSaved",
  "mediaDeleted",
] as const;

type Progress = { name: string; sent: number; total: number; abort?: () => Promise<void> };

function Arrow({ up }: { up?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d={up ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
    </svg>
  );
}

// Une ligne de la galerie : miniature, titre, ordre, modification, suppression
function MediaRow({
  item,
  index,
  count,
  busy,
  onMove,
  onResult,
}: {
  item: MediaItem;
  index: number;
  count: number;
  busy: boolean;
  onMove: (from: number, to: number) => void;
  onResult: (outcome: { status: string; message: string }) => void;
}) {
  const t = useTranslations("supervisor.media.gallery");
  const tMedia = useTranslations("supervisor.media");
  const locale = useLocale();
  const errorText = useErrorText();
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const kind =
    item.kind === "video_link" ? t(`kinds.${item.provider ?? "youtube"}`) : t(`kinds.${item.kind}`);
  const meta = [
    kind,
    item.sizeBytes ? formatBytes(item.sizeBytes, locale) : null,
    item.kind === "image" ? (item.url.endsWith(".jpg") ? "JPEG" : "WebP") : null,
    formatDuration(item.durationSeconds),
  ]
    .filter(Boolean)
    .join(" · ");

  function submit(action: (data: FormData) => Promise<{ status: string; message: string }>) {
    return (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      startTransition(async () => {
        const outcome = await action(data);
        startTransition(() => {
          if (outcome.status === "success") {
            setMode("view");
            setError(null);
            onResult(outcome);
          } else setError(outcome.message);
        });
      });
    };
  }

  return (
    <li className="flex flex-col gap-3 bg-surface p-2.75">
      <div className="flex items-center gap-3">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${t("open")} : ${item.titleFr}`}
          className="relative flex h-12.5 w-17 shrink-0 items-center justify-center overflow-hidden hatch"
        >
          {item.thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnailUrl}
              alt=""
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
              className="h-full w-full object-cover"
            />
          )}
          {item.kind !== "image" && (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="absolute h-5 w-5 text-white drop-shadow"
              fill="currentColor"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </a>
        <div className="flex min-w-0 grow flex-col gap-0.75">
          <span className="truncate text-[13px] font-medium">{item.titleFr}</span>
          <span className="font-mono text-[9.5px] text-subtle uppercase">{meta}</span>
        </div>
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            disabled={busy || index === 0}
            onClick={() => onMove(index, index - 1)}
            aria-label={t("up", { title: item.titleFr })}
            className="flex h-9 w-9 items-center justify-center text-muted hover:text-foreground disabled:opacity-30"
          >
            <Arrow up />
          </button>
          <button
            type="button"
            disabled={busy || index === count - 1}
            onClick={() => onMove(index, index + 1)}
            aria-label={t("down", { title: item.titleFr })}
            className="flex h-9 w-9 items-center justify-center text-muted hover:text-foreground disabled:opacity-30"
          >
            <Arrow />
          </button>
        </div>
      </div>

      {mode === "view" && (
        <div className="flex gap-4 pl-20">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className="text-xs font-semibold text-admin hover:underline"
          >
            {t("edit")}
          </button>
          <button
            type="button"
            onClick={() => setMode("delete")}
            className="text-xs font-semibold text-blood-ink hover:underline"
          >
            {t("delete")}
          </button>
        </div>
      )}

      {mode === "edit" && (
        <form
          onSubmit={submit(updateMediaTitlesAction)}
          noValidate
          className="flex flex-col gap-2.5 border-t border-line pt-3"
        >
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={item.id} />
          <Field
            id={`titre-fr-${item.id}`}
            name="title_fr"
            label={tMedia("titleFr")}
            defaultValue={item.titleFr}
            maxLength={160}
          />
          <Field
            id={`titre-en-${item.id}`}
            name="title_en"
            label={tMedia("titleEn")}
            defaultValue={item.titleEn ?? ""}
            maxLength={160}
          />
          {error && <p className="text-xs text-blood-ink">{errorText(error)}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-10 grow items-center justify-center bg-admin-fill text-sm font-semibold text-white disabled:opacity-60"
            >
              {t("save")}
            </button>
            <button
              type="button"
              onClick={() => setMode("view")}
              className="inline-flex h-10 w-28 items-center justify-center border border-line-strong text-sm font-semibold"
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      )}

      {mode === "delete" && (
        <form onSubmit={submit(deleteMediaAction)} className="flex gap-2 border-t border-line pt-3">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={item.id} />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-10 grow items-center justify-center bg-blood text-sm font-semibold text-white disabled:opacity-60"
          >
            {t("confirmDelete")}
          </button>
          <button
            type="button"
            onClick={() => setMode("view")}
            className="inline-flex h-10 w-28 items-center justify-center border border-line-strong text-sm font-semibold"
          >
            {t("cancel")}
          </button>
          {error && <p className="text-xs text-blood-ink">{errorText(error)}</p>}
        </form>
      )}
    </li>
  );
}

export function MediaManager({
  discipline,
  items: initialItems,
}: {
  discipline: Discipline;
  items: MediaItem[];
}) {
  const t = useTranslations("supervisor.media");
  const locale = useLocale();
  const errorText = useErrorText();
  const { announce, region } = useNotice();
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [progress, setProgress] = useState<Progress | null>(null);
  const [preparing, setPreparing] = useState(false);

  // Ordre local, remis à jour quand la page serveur renvoie la galerie
  const [items, setItems] = useState(initialItems);
  const [source, setSource] = useState(initialItems);
  if (source !== initialItems) {
    setSource(initialItems);
    setItems(initialItems);
  }

  const disciplineLabel = discipline === "mma" ? "MMA" : "Sambo";

  // Résultat d'un ajout : le formulaire se vide seulement en cas de succès
  function done(
    outcome: { status: string; message: string; fields?: Record<string, string | undefined> },
    resetForm = true,
  ) {
    if (outcome.status === "success") {
      const key = DONE.find((candidate) => candidate === outcome.message);
      if (key) announce("success", t(`done.${key}`));
      if (resetForm) {
        setFieldErrors({});
        formRef.current?.reset();
      }
    } else {
      setFieldErrors(outcome.fields ?? {});
      announce(
        "error",
        errorText(outcome.fields?.url ?? outcome.fields?.title_fr ?? outcome.message) ?? "",
      );
    }
  }

  function titles() {
    const data = new FormData(formRef.current ?? undefined);
    return {
      title_fr: String(data.get("title_fr") ?? "").trim(),
      title_en: String(data.get("title_en") ?? "").trim(),
    };
  }

  function addLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const outcome = await addMediaLinkAction(data);
      startTransition(() => done(outcome));
    });
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (fileRef.current) fileRef.current.value = "";
    const { title_fr, title_en } = titles();
    if (!title_fr) {
      setFieldErrors({ title_fr: "title_required" });
      return announce("error", t("upload.titleFirst"));
    }
    const isImage = IMAGE_TYPES.includes(file.type);
    const isVideo = VIDEO_TYPES.includes(file.type);
    if (!isImage && !isVideo) return announce("error", errorText("media_type") ?? "");
    if (isImage && file.size > IMAGE_MAX_INPUT_BYTES)
      return announce("error", errorText("media_size_image") ?? "");
    if (isVideo && file.size > VIDEO_MAX_BYTES)
      return announce("error", errorText("media_size_video") ?? "");

    try {
      let path: string;
      let size: number;
      let duration: number | null = null;
      if (isImage) {
        setPreparing(true);
        ({ path, size } = await uploadImage(file, discipline));
        setPreparing(false);
      } else {
        duration = await videoDuration(file);
        setProgress({ name: file.name, sent: 0, total: file.size });
        const upload = await uploadVideo(file, discipline, (sent, total) =>
          setProgress((current) => current && { ...current, sent, total }),
        );
        setProgress((current) => ({
          ...(current ?? { name: file.name, sent: 0, total: file.size }),
          abort: upload.abort,
        }));
        await upload.promise;
        path = upload.path;
        size = file.size;
      }
      const outcome = await addMediaFileAction({
        locale,
        discipline,
        kind: isImage ? "image" : "video",
        path,
        size,
        duration,
        title_fr,
        title_en,
      });
      startTransition(() => {
        setProgress(null);
        done(outcome);
      });
    } catch (error) {
      setPreparing(false);
      setProgress(null);
      const aborted = error instanceof Error && /abort/i.test(error.message);
      announce("error", aborted ? t("upload.cancelled") : (errorText("upload_failed") ?? ""));
    }
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length) return;
    const previous = items;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
    startTransition(async () => {
      const outcome = await reorderMediaAction({
        locale,
        discipline,
        ids: next.map((item) => item.id),
      });
      startTransition(() => {
        if (outcome.status !== "success") {
          setItems(previous);
          announce("error", errorText(outcome.message) ?? "");
        }
      });
    });
  }

  const busy = pending || preparing || progress !== null;
  const percent = progress ? Math.floor((progress.sent / Math.max(progress.total, 1)) * 100) : 0;

  return (
    <div className="flex flex-col gap-8">
      {region}

      <ReviewSection title={t("add")}>
        <form
          ref={formRef}
          onSubmit={addLink}
          noValidate
          className="flex flex-col gap-3.25 border-l-3 border-admin-fill bg-surface p-3.75"
        >
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="discipline" value={discipline} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              name="title_fr"
              label={t("titleFr")}
              placeholder={t("titlePlaceholder")}
              maxLength={160}
              error={errorText(fieldErrors.title_fr)}
            />
            <Field
              name="title_en"
              label={t("titleEn")}
              maxLength={160}
              error={errorText(fieldErrors.title_en)}
            />
          </div>

          <p className="mt-1 eyebrow tracking-[0.14em] text-subtle">{t("link.heading")}</p>
          <Field
            name="url"
            type="url"
            inputMode="url"
            label={t("link.url")}
            placeholder="https://www.youtube.com/watch?v=…"
            maxLength={500}
            error={errorText(fieldErrors.url)}
          />
          <p className="text-[11.5px] leading-normal text-subtle">{t("link.hint")}</p>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-11.5 items-center justify-center bg-admin-fill text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {t("link.submit")}
          </button>

          <div className="flex items-center gap-3.5 py-1">
            <span aria-hidden="true" className="h-px grow bg-line" />
            <span className="font-mono text-[10px] tracking-[0.16em] text-subtle uppercase">
              {t("or")}
            </span>
            <span aria-hidden="true" className="h-px grow bg-line" />
          </div>

          <label
            className={`flex cursor-pointer flex-col items-center gap-2.75 border border-dashed border-line-strong px-4 py-5.5 text-center transition-colors focus-within:border-admin-fill hover:border-admin-fill ${busy ? "pointer-events-none opacity-60" : ""}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void onFile(event.dataTransfer.files[0]);
            }}
          >
            <span className="text-sm font-semibold">{t("upload.heading")}</span>
            <span className="font-mono text-[10px] leading-relaxed text-subtle uppercase">
              {t("upload.limits")}
              <br />
              {t("upload.limitsVideo")}
            </span>
            <span className="inline-flex h-9 items-center border border-line-strong px-3 text-xs font-semibold">
              {preparing ? t("upload.preparing") : t("upload.choose")}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept={[...IMAGE_TYPES, ...VIDEO_TYPES].join(",")}
              disabled={busy}
              onChange={(event) => void onFile(event.target.files?.[0])}
              className="sr-only"
            />
          </label>

          {progress && (
            <div
              className="flex flex-col gap-2.75 border-l-3 border-gold bg-surface p-3.5"
              aria-live="polite"
            >
              <div className="flex items-center justify-between gap-2.5">
                <span className="truncate text-[13px] font-semibold">{progress.name}</span>
                <span className="font-mono text-[11px] text-gold-ink">{percent} %</span>
              </div>
              <div
                className="flex h-1 bg-line"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                aria-label={progress.name}
              >
                <div className="bg-gold transition-[width]" style={{ width: `${percent}%` }} />
              </div>
              <div className="flex items-center justify-between gap-2.5">
                <span className="font-mono text-[9.5px] text-subtle uppercase">
                  {t("upload.chunks", {
                    sent: formatBytes(progress.sent, locale),
                    total: formatBytes(progress.total, locale),
                  })}
                </span>
                {progress.abort && (
                  <button
                    type="button"
                    onClick={() => void progress.abort?.()}
                    className="text-xs font-semibold text-muted hover:text-foreground"
                  >
                    {t("upload.cancel")}
                  </button>
                )}
              </div>
              <p className="text-[11px] leading-normal text-subtle">{t("upload.resume")}</p>
            </div>
          )}
        </form>
      </ReviewSection>

      <ReviewSection
        title={t("gallery.title", { discipline: disciplineLabel })}
        aside={t("gallery.count", { count: items.length })}
      >
        {items.length === 0 ? (
          <p className="border border-line bg-surface px-4 py-5 text-sm text-muted">
            {t("gallery.empty")}
          </p>
        ) : (
          <>
            <p className="-mt-1 text-[11.5px] leading-normal text-subtle">{t("gallery.hint")}</p>
            <ol className="flex flex-col gap-px bg-line">
              {items.map((item, index) => (
                <MediaRow
                  key={item.id}
                  item={item}
                  index={index}
                  count={items.length}
                  busy={pending}
                  onMove={move}
                  onResult={(outcome) => done(outcome, false)}
                />
              ))}
            </ol>
          </>
        )}
        <Note>{t("note")}</Note>
      </ReviewSection>
    </div>
  );
}
