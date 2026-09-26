"use client";

import { useEffect, useRef, useState } from "react";
import { refreshNotifications } from "@/lib/notifications/events";
import { FormAlert } from "./FormAlert";

type Notice = { tone: "success" | "error"; text: string; at: number };

// Message de confirmation ou d'erreur affiché en haut d'une liste dont
// l'élément traité disparaît : il reçoit le focus une fois affiché, pour
// que le lecteur d'écran l'annonce et que le clavier ne se perde pas.
export function useNotice() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (notice) ref.current?.focus();
  }, [notice]);

  function announce(tone: Notice["tone"], text: string) {
    setNotice({ tone, text, at: Date.now() });
    // une demande tranchée ou une fiche revue change le compteur de la cloche
    if (tone === "success") refreshNotifications();
  }

  const region = (
    <div ref={ref} tabIndex={-1} className="outline-none empty:hidden">
      {notice && <FormAlert tone={notice.tone}>{notice.text}</FormAlert>}
    </div>
  );

  return { announce, region };
}
