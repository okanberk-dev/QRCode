"use client";

import { useEffect, useState } from "react";
import { Check, Key, Loader2 } from "lucide-react";
import { AlertBanner, Field } from "@/components/ui";
import type { Locale } from "@/lib/translations";
import { SettingsCard } from "../SettingsCard";

interface BusinessAccountSecuritySettingsProps {
  locale?: Locale;
}

/**
 * Section — Güvenlik (Faz unified hub).
 *
 * Workspace user-level security: yalnız "Şifre değiştir".
 *
 * 2FA + Aktif Oturumlar kartları kullanıcı talebiyle kaldırıldı (mevcut
 * kullanıcı tabanına yakın değil + Authenticator app modal'ı tıklanmıyordu
 * + Sessions endpoint manager JWT'sinde 401 dönüyordu). Backend endpoint'leri
 * (`/api/account/2fa/*`, `/api/account/sessions`) korundu; component dosyaları
 * silindi — yeniden bağlanmak istenirse git history'sinden çıkarılabilir.
 *
 * Per-restaurant `BusinessSecuritySettings` (KVKK + isActive)
 * `/dashboard/restaurants/[id]/settings` altında — location-scoped.
 */
export function BusinessAccountSecuritySettings({ locale = "tr" }: BusinessAccountSecuritySettingsProps) {
  const isTr = locale === "tr";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!pwSuccess) return;
    const t = setTimeout(() => setPwSuccess(null), 4000);
    return () => clearTimeout(t);
  }, [pwSuccess]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);
    if (newPassword.length < 8) {
      setPwError(isTr ? "Yeni şifre en az 8 karakter olmalıdır." : "New password must be at least 8 chars.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError(isTr ? "Şifreler eşleşmiyor." : "Passwords don't match.");
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPwError(data.error || (isTr ? "Şifre değiştirilemedi." : "Could not change password."));
      } else {
        setPwSuccess(isTr ? "Şifren güncellendi." : "Your password was updated.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setPwError(isTr ? "Bağlantı hatası." : "Connection error.");
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <SettingsCard
        icon={<Key size={18} />}
        title={isTr ? "Şifre değiştir" : "Change password"}
        description={
          isTr
            ? "Mevcut şifren ile yeni şifreni doğrula. Yeni şifre en az 8 karakter olmalı."
            : "Confirm your current password to set a new one (min. 8 characters)."
        }
      >
        {pwError && (
          <AlertBanner kind="danger" onDismiss={() => setPwError(null)}>
            {pwError}
          </AlertBanner>
        )}
        {pwSuccess && (
          <div className="mb-3">
            <AlertBanner kind="success" onDismiss={() => setPwSuccess(null)}>
              {pwSuccess}
            </AlertBanner>
          </div>
        )}
        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          <Field label={isTr ? "Mevcut şifre" : "Current password"}>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="bz-input w-full"
              autoComplete="current-password"
            />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label={isTr ? "Yeni şifre" : "New password"}>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bz-input w-full"
                autoComplete="new-password"
                minLength={8}
              />
            </Field>
            <Field label={isTr ? "Yeni şifre (tekrar)" : "Confirm new password"}>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bz-input w-full"
                autoComplete="new-password"
                minLength={8}
              />
            </Field>
          </div>
          <div className="flex justify-end pt-1">
            <button type="submit" disabled={pwSaving} className="bz-btn-primary disabled:opacity-50">
              {pwSaving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} strokeWidth={2} />
              )}
              {isTr ? "Şifreyi güncelle" : "Update password"}
            </button>
          </div>
        </form>
      </SettingsCard>
    </div>
  );
}

export default BusinessAccountSecuritySettings;
