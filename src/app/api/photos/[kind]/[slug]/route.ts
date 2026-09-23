import type { NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";

// Photo d'une fiche en ligne, à une adresse stable (partage sur WhatsApp et
// Facebook, aperçus de liens). Le bucket reste privé : la photo est lue
// avec les droits du visiteur, que la base n'accorde que pour la photo
// déclarée d'une fiche en ligne. Tout autre cas répond 404.

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const IMAGE_TYPES = ["image/webp", "image/jpeg", "image/png"];

const notFound = () => new Response(null, { status: 404 });

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/photos/[kind]/[slug]">) {
  const { kind, slug } = await ctx.params;
  if ((kind !== "athletes" && kind !== "coaches") || slug.length > 100 || !SLUG.test(slug)) {
    return notFound();
  }

  const supabase = createPublicClient();
  if (!supabase) return notFound();

  const { data: row } =
    kind === "athletes"
      ? await supabase
          .from("athletes")
          .select("photo_path")
          .eq("slug", slug)
          .eq("status", "approved")
          .maybeSingle()
      : await supabase
          .from("coaches")
          .select("photo_path")
          .eq("slug", slug)
          .eq("status", "approved")
          .maybeSingle();
  if (!row?.photo_path) return notFound();

  const { data: file, error } = await supabase.storage
    .from("profile-photos")
    .download(row.photo_path);
  if (error || !file || !IMAGE_TYPES.includes(file.type)) return notFound();

  return new Response(file, {
    headers: {
      "Content-Type": file.type,
      "Content-Length": String(file.size),
      // une heure : une fiche retirée du site disparaît vite des caches
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Content-Disposition": "inline",
    },
  });
}
