"use client";

import { Lock } from "lucide-react";
import { AlertBanner } from "@/components/ui";

/**
 * Admin-pause guard for owner status controls.
 *
 * When a superadmin pauses a restaurant (`Restaurant.suspendedByAdmin`), an
 * owner PUT `{ isActive: true }` is rejected with 403 `SUSPENDED_BY_ADMIN`.
 * Every owner surface that flips `isActive` locks its control and shows the
 * same notice, so the owner learns why instead of hitting a raw 403.
 */
export const SUSPENDED_BY_ADMIN_CODE = "SUSPENDED_BY_ADMIN";

export function suspendedByAdminMessage(locale: "tr" | "en"): string {
  return locale === "en"
    ? "This business was paused by Buaze. Contact support to reactivate it."
    : "Bu işletme Buaze yönetimi tarafından duraklatıldı. Yeniden etkinleştirmek için destek ekibiyle iletişime geçin.";
}

export function SuspendedByAdminNotice({ locale }: { locale: "tr" | "en" }) {
  return (
    <AlertBanner kind="warn" icon={<Lock size={14} strokeWidth={2} />}>
      {suspendedByAdminMessage(locale)}
    </AlertBanner>
  );
}

/**
 * Human message for a failed restaurant PUT. Maps the admin-pause code to the
 * shared copy; otherwise uses the API's `error` string, then the fallback.
 */
export function restaurantSaveErrorMessage(
  body: unknown,
  locale: "tr" | "en",
  fallback: string,
): string {
  const data = (body ?? {}) as { error?: unknown; code?: unknown };
  if (data.code === SUSPENDED_BY_ADMIN_CODE || data.error === SUSPENDED_BY_ADMIN_CODE) {
    return suspendedByAdminMessage(locale);
  }
  return typeof data.error === "string" && data.error.trim() ? data.error : fallback;
}

/** True when a failed PUT response body carries the admin-pause code. */
export function isSuspendedByAdminError(body: unknown): boolean {
  const data = (body ?? {}) as { error?: unknown; code?: unknown };
  return data.code === SUSPENDED_BY_ADMIN_CODE || data.error === SUSPENDED_BY_ADMIN_CODE;
}
