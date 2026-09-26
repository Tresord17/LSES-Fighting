"use client";

import * as tus from "tus-js-client";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { resizeImage, uniqueName } from "@/lib/images/resize";
import {
  IMAGE_MAX_SIDE,
  MEDIA_BUCKET,
  THUMB_MAX_SIDE,
  thumbPath,
  type MediaFolder,
} from "./options";

// Dépôts dans le bucket public « media », depuis le navigateur du
// superviseur. La base n'accepte ces écritures que de sa part.

function storeFile(path: string, blob: Blob) {
  return createClient()
    .storage.from(MEDIA_BUCKET)
    .upload(path, blob, { contentType: blob.type, cacheControl: "31536000", upsert: false });
}

// Vignette d'un fichier déjà déposé. Son échec n'empêche pas l'ajout : les
// pages publiques se rabattent alors sur le fichier complet.
export async function uploadThumb(path: string, blob: Blob | null) {
  if (!blob) return 0;
  const { error } = await storeFile(thumbPath(path), blob);
  return error ? 0 : blob.size;
}

// Image : réduite et réencodée (quelques centaines de Ko), plus sa vignette.
// La taille rendue couvre les deux fichiers, pour le compteur d'espace.
export async function uploadImage(file: File, folder: MediaFolder) {
  const [{ blob, ext }, thumb] = await Promise.all([
    resizeImage(file, IMAGE_MAX_SIDE, 0.82),
    resizeImage(file, THUMB_MAX_SIDE, 0.75).then(
      (result) => result.blob,
      () => null,
    ),
  ]);
  const path = `${folder}/${uniqueName(ext)}`;
  const { error } = await storeFile(path, blob);
  if (error) throw error;
  return { path, size: blob.size + (await uploadThumb(path, thumb)) };
}

// Image extraite d'une vidéo (vers la première seconde), qui sert d'affiche
// au lecteur public tant que le visiteur n'a pas lancé la lecture
export function videoPoster(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    let settled = false;
    const done = (blob: Blob | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(blob);
    };
    const timer = setTimeout(() => done(null), 15000);
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, Number.isFinite(video.duration) ? video.duration / 2 : 0);
    };
    video.onseeked = () => {
      if (!video.videoWidth || !video.videoHeight) return done(null);
      const scale = Math.min(1, THUMB_MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => done(blob), "image/webp", 0.75);
    };
    video.onerror = () => done(null);
    video.src = url;
  });
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
