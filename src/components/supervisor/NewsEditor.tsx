"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { deleteNewsAction, saveNewsAction, type NewsFormState } from "@/lib/news/actions";
import type { NewsDraft } from "@/lib/news/data";
import { IMAGE_MAX_INPUT_BYTES, IMAGE_TYPES, publicMediaUrl } from "@/lib/media/options";
import { uploadImage } from "@/lib/media/upload";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { Field } from "@/components/forms/Field";
import { FormAlert } from "@/components/forms/FormAlert";
import { TextAreaField } from "@/components/forms/TextAreaField";
import { useErrorText } from "@/components/forms/useErrorText";
import { useManualAction } from "@/components/profile/useManualAction";
import { ReviewSection } from "@/components/review/ReviewParts";

const FORM_ID = "actualite";
const initialState: NewsFormState = { status: "idle" };
const DONE = ["saved", "published", "unpublished"] as const;

// Rédaction d'une actualité : textes en français (obligatoire) et en
// anglais (facultatif), image de couverture, publication.
export function NewsEditor({
  draft,
  initialNotice = null,
}: {
  draft: NewsDraft;
  initialNotice?: string | null;
}) {
  const t = useTranslations("supervisor.news");
  const locale = useLocale();
  const errorText = useErrorText();
  const { state, pending, onSubmit } = useManualAction(saveNewsAction, initialState);
  const fields = state.fields ?? {};
  const fileRef = useRef<HTMLInputElement>(null);
  const [coverPath, setCoverPath] = useState(draft.coverPath);
  const [coverUrl, setCoverUrl] = useState(draft.coverUrl);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const published = draft.status === "published";
  const message = state.status !== "idle" ? state.message : initialNotice;
  const doneKey = DONE.find((key) => key === message);

  async function onCover(file: File | undefined) {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    setCoverError(null);
    if (!IMAGE_TYPES.includes(file.type)) return setCoverError("media_type");
    if (file.size > IMAGE_MAX_INPUT_BYTES) return setCoverError("media_size_image");
    setCoverBusy(true);
    try {
      const { path } = await uploadImage(file, "actualites");
      const env = getSupabaseEnv();
      setCoverPath(path);
      setCoverUrl(env ? publicMediaUrl(env.url, path) : null);
    } catch {
      setCoverError("upload_failed");
    } finally {
      setCoverBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-1.5">
        <Link
          href="/mon-espace/superviseur/actualites"
          className="text-xs font-semibold text-subtle hover:text-foreground"
        >
          ← {t("back")}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-extrabold tracking-[0.04em] uppercase">
            {draft.id ? t("editorEdit") : t("editorNew")}
          </h2>
          <span
            className={`border px-2 py-1 font-mono text-[10px] tracking-[0.1em] uppercase ${
              published ? "border-success text-success" : "border-line-strong text-muted"
            }`}
          >
            {t(`status.${draft.status}`)}
          </span>
        </div>
      </div>

      <form id={FORM_ID} onSubmit={onSubmit} noValidate className="flex flex-col gap-7">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="id" value={draft.id ?? ""} />
        <input type="hidden" name="cover_path" value={coverPath ?? ""} />

        <ReviewSection title={t("sections.fr")}>
          <Field
            name="title_fr"
            label={t("fields.title")}
            defaultValue={draft.titleFr}
            maxLength={200}
            error={errorText(fields.title_fr)}
          />
          <TextAreaField
            name="excerpt_fr"
            label={t("fields.excerpt")}
            defaultValue={draft.excerptFr}
            maxLength={400}
            rows={3}
            error={errorText(fields.excerpt_fr)}
          />
          <p className="-mt-2 text-[11px] text-subtle">{t("fields.excerptHint")}</p>
          <TextAreaField
            name="body_fr"
            label={t("fields.body")}
            defaultValue={draft.bodyFr}
            maxLength={20000}
            rows={12}
            error={errorText(fields.body_fr)}
          />
          <p className="-mt-2 text-[11px] text-subtle">{t("fields.bodyHint")}</p>
        </ReviewSection>

        <ReviewSection title={t("sections.en")}>
          <p className="-mt-1 text-[11.5px] text-subtle">{t("enHint")}</p>
          <Field
            name="title_en"
            label={t("fields.title")}
            defaultValue={draft.titleEn}
            maxLength={200}
            lang="en"
            error={errorText(fields.title_en)}
          />
          <TextAreaField
            name="excerpt_en"
            label={t("fields.excerpt")}
            defaultValue={draft.excerptEn}
            maxLength={400}
            rows={3}
            lang="en"
            error={errorText(fields.excerpt_en)}
          />
          <TextAreaField
            name="body_en"
            label={t("fields.body")}
            defaultValue={draft.bodyEn}
            maxLength={20000}
            rows={10}
            lang="en"
            error={errorText(fields.body_en)}
          />
        </ReviewSection>
      </form>

      <ReviewSection title={t("sections.cover")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt={t("cover.alt")}
              className="aspect-video w-full object-cover sm:w-64"
            />
          ) : (
            <span aria-hidden="true" className="block aspect-video w-full hatch sm:w-64" />
          )}
          <div className="flex flex-col gap-2.5">
            <label className="inline-flex h-10 cursor-pointer items-center justify-center border border-line-strong px-4 text-sm font-semibold transition focus-within:border-admin-fill hover:border-admin-fill">
              {coverBusy ? t("saving") : coverPath ? t("cover.replace") : t("cover.choose")}
              <input
                ref={fileRef}
                type="file"
                accept={IMAGE_TYPES.join(",")}
                disabled={coverBusy}
                onChange={(event) => void onCover(event.target.files?.[0])}
                className="sr-only"
              />
            </label>
            {coverPath && (
              <button
                type="button"
                onClick={() => {
                  setCoverPath(null);
                  setCoverUrl(null);
                }}
                className="text-left text-xs font-semibold text-blood-ink hover:underline"
              >
                {t("cover.remove")}
              </button>
            )}
            <p className="text-[11px] text-subtle">{t("cover.hint")}</p>
            {coverError && <p className="text-xs text-blood-ink">{errorText(coverError)}</p>}
          </div>
        </div>
      </ReviewSection>

      <ReviewSection title={t("sections.publication")}>
        {draft.slug && (
          <p className="font-mono text-[11px] break-all text-muted">
            {t("address", { path: `/${locale}/actualites/${draft.slug}` })}
          </p>
        )}
        {!draft.publishedAt && <p className="-mt-1 text-[11px] text-subtle">{t("addressDraft")}</p>}

        {state.status === "error" && <FormAlert tone="error">{errorText(state.message)}</FormAlert>}
        {doneKey && <FormAlert tone="success">{t(`done.${doneKey}`)}</FormAlert>}

        <div className="flex flex-col gap-2.5 sm:flex-row">
          {published ? (
            <>
              <button
                type="submit"
                form={FORM_ID}
                name="intent"
                value="save"
                disabled={pending || coverBusy}
                className="inline-flex h-12 grow items-center justify-center bg-admin-fill px-5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {pending ? t("saving") : t("saveChanges")}
              </button>
              <button
                type="submit"
                form={FORM_ID}
                name="intent"
                value="unpublish"
                disabled={pending || coverBusy}
                className="inline-flex h-12 items-center justify-center border border-line-strong px-5 text-sm font-semibold transition hover:border-blood disabled:opacity-60"
              >
                {t("unpublish")}
              </button>
            </>
          ) : (
            <>
              <button
                type="submit"
                form={FORM_ID}
                name="intent"
                value="publish"
                disabled={pending || coverBusy}
                className="inline-flex h-12 grow items-center justify-center bg-admin-fill px-5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {pending ? t("saving") : t("publish")}
              </button>
              <button
                type="submit"
                form={FORM_ID}
                name="intent"
                value="save"
                disabled={pending || coverBusy}
                className="inline-flex h-12 items-center justify-center border border-line-strong px-5 text-sm font-semibold transition hover:border-admin-fill disabled:opacity-60"
              >
                {t("save")}
              </button>
            </>
          )}
        </div>

        {draft.id && (
          <div className="mt-2 flex flex-col gap-2.5 border-t border-line pt-4">
            {confirmDelete ? (
              <form action={deleteNewsAction} className="flex flex-col gap-2.5">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={draft.id} />
                <p className="text-xs text-blood-ink">{t("deleteWarning")}</p>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="inline-flex h-11 grow items-center justify-center bg-blood text-sm font-semibold text-white transition hover:brightness-110"
                  >
                    {t("confirmDelete")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="inline-flex h-11 w-28 items-center justify-center border border-line-strong text-sm font-semibold"
                  >
                    {t("cancel")}
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="self-start text-xs font-semibold text-blood-ink hover:underline"
              >
                {t("delete")}
              </button>
            )}
          </div>
        )}
      </ReviewSection>
    </div>
  );
}
