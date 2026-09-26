"use client";

import type { ImgHTMLAttributes } from "react";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> & {
  src: string;
  // image de secours si la vignette manque (fichier déposé avant les vignettes)
  fallback?: string | null;
};

function recover(img: HTMLImageElement, fallback?: string | null) {
  if (fallback && img.dataset.fallback !== "1") {
    img.dataset.fallback = "1";
    img.removeAttribute("srcset");
    img.src = fallback;
  } else {
    // plus rien à afficher : le fond hachuré du conteneur reste visible
    img.style.visibility = "hidden";
  }
}

// Vignette avec repli. Une image déjà en échec avant l'hydratation ne
// déclenche plus onError : le ref vérifie donc aussi son état au montage.
export function Thumb({ src, fallback, alt = "", loading = "lazy", ...props }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      ref={(img) => {
        if (img && img.complete && img.naturalWidth === 0 && img.currentSrc) recover(img, fallback);
      }}
      onError={(event) => recover(event.currentTarget, fallback)}
    />
  );
}
