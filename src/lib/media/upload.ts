"use client";

import * as tus from "tus-js-client";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { resizeImage, uniqueName } from "@/lib/images/resize";
import { IMAGE_MAX_SIDE, MEDIA_BUCKET, type MediaFolder } from "./options";

// Dépôts dans le bucket public « media », depuis le navigateur du
// superviseur. La base n'accepte ces écritures que de sa part.

// Image : réduite et réencodée, puis envoyée en une fois (quelques centaines de Ko)
export async function uploadImage(file: File, folder: MediaFolder) {
  const { blob, ext } = await resizeImage(file, IMAGE_MAX_SIDE, 0.82);
  const path = `${folder}/${uniqueName(ext)}`;
  const { error } = await createClient()
    .storage.from(MEDIA_BUCKET)
    .upload(path, blob, { contentType: blob.type, cacheControl: "31536000", upsert: false });
  if (error) throw error;
  return { path, size: blob.size };
}

// Adresse de l'envoi par morceaux. Supabase conseille le nom d'hôte direct
// du stockage (<projet>.storage.supabase.co) pour les gros fichiers.
function resumableEndpoint(url: string) {
  const hosted = /^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/.exec(url);
  return hosted
    ? `https://${hosted[1]}.storage.supabase.co/storage/v1/upload/resumable`
    : `${url.replace(/\/+$/, "")}/storage/v1/upload/resumable`;
}

// Durée d'une vidéo, lue dans ses métadonnées avant l'envoi
export function videoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    video.preload = "metadata";
    video.onloadedmetadata = () => done(Number.isFinite(video.duration) ? video.duration : null);
    video.onerror = () => done(null);
    video.src = url;
  });
}

export type VideoUpload = {
  path: string;
  promise: Promise<void>;
  abort: () => Promise<void>;
};

// Vidéo : envoi par morceaux de 6 Mo (protocole TUS). Une coupure est
// reprise automatiquement ; un envoi interrompu (onglet fermé) reprend au
// prochain essai avec le même fichier, grâce à l'empreinte gardée par le
// navigateur.
export async function uploadVideo(
  file: File,
  folder: MediaFolder,
  onProgress: (sent: number, total: number) => void,
): Promise<VideoUpload> {
  const env = getSupabaseEnv();
  if (!env) throw new Error("missing_env");
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("not_authenticated");

  let path = `${folder}/${uniqueName("mp4")}`;
  let settle: { resolve: () => void; reject: (error: unknown) => void } | null = null;
  const promise = new Promise<void>((resolve, reject) => (settle = { resolve, reject }));

  const upload = new tus.Upload(file, {
    endpoint: resumableEndpoint(env.url),
    retryDelays: [0, 3000, 5000, 10000, 20000],
    headers: { authorization: `Bearer ${token}`, apikey: env.key, "x-upsert": "false" },
    uploadDataDuringCreation: true,
    removeFingerprintOnSuccess: true,
    // taille imposée par Supabase pour l'envoi par morceaux
    chunkSize: 6 * 1024 * 1024,
    metadata: {
      bucketName: MEDIA_BUCKET,
      objectName: path,
      contentType: "video/mp4",
      cacheControl: "31536000",
    },
    onProgress,
    onSuccess: () => settle?.resolve(),
    onError: (error) => settle?.reject(error),
  });

  const previous = await upload.findPreviousUploads();
  const resumable = previous.find((item) => item.metadata?.objectName?.startsWith(`${folder}/`));
  if (resumable) {
    path = resumable.metadata.objectName;
    upload.resumeFromPreviousUpload(resumable);
  }
  upload.start();

  return {
    path,
    promise,
    // annulation : l'envoi est effacé côté serveur et la promesse rejetée
    abort: async () => {
      await upload.abort(true);
      settle?.reject(new Error("aborted"));
    },
  };
}
