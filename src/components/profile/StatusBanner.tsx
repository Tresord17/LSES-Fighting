"use client";

import { useTranslations } from "next-intl";
import type { Database } from "@/lib/supabase/database.types";

type Status = Database["public"]["Enums"]["review_status"];

export function StatusBanner({
  status,
  kind,
  reason,
}: {
  status: Status;
  kind: "athlete" | "coach";
  reason?: string | null;
}) {
  const t = useTranslations("profile.banners");
  if (status === "draft") return null;

  const styles = {
    pending: "border-gold",
    approved: "border-success",
    rejected: "border-blood",
  }[status];
  const text = {
    pending: t(kind === "coach" ? "pendingCoach" : "pending"),
    approved: t(kind === "coach" ? "approvedCoach" : "approved"),
    rejected: t("rejected"),
  }[status];

  return (
    <div
      role="status"
      className={`flex flex-col gap-1 border-l-3 bg-surface px-4 py-3 text-sm leading-relaxed ${styles}`}
    >
      <p className="text-foreground">{text}</p>
      {status === "rejected" && reason && (
        <p className="text-blood-ink">{t("reason", { reason })}</p>
      )}
    </div>
  );
}
