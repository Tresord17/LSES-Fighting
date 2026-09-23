// Réduction d'une image dans le navigateur : maxSide pixels au plus sur le
// grand côté, WebP (ou JPEG si le navigateur ne sait pas encoder le WebP).
// Réencoder l'image supprime au passage ses métadonnées EXIF, dont la
// position GPS que les téléphones inscrivent dans les photos.
export async function resizeImage(
  file: File,
  maxSide: number,
  quality = 0.85,
): Promise<{ blob: Blob; ext: "webp" | "jpg"; width: number; height: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const encode = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  const size = { width: canvas.width, height: canvas.height };
  const webp = await encode("image/webp");
  if (webp?.type === "image/webp") return { blob: webp, ext: "webp", ...size };
  const jpeg = await encode("image/jpeg");
  if (!jpeg) throw new Error("encode_failed");
  return { blob: jpeg, ext: "jpg", ...size };
}

// Nom de fichier unique et prévisible : horodatage + suffixe aléatoire
export function uniqueName(ext: string) {
  const random = Array.from(crypto.getRandomValues(new Uint8Array(5)))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `${Date.now()}-${random}.${ext}`;
}
