"use client";

import { useEffect, useState } from "react";
import { Check, Key, Loader2, Lock, ShieldCheck } from "lucide-react";
import {
  AlertBanner,
  Badge,
  Field,
  Modal,
  Toggle,
} from "@/components/ui";
import type { Locale } from "@/lib/translations";
import { SettingsCard } from "../SettingsCard";
import { TwoFactorSetupModal } from "../TwoFactorSetupModal";
import { ActiveSessionsTable } from "../ActiveSessionsTable";

interface BusinessAccountSecuritySettingsProps {
  locale?: Locale;
}

/**
 * Section — Güvenlik (Faz unified hub).
 *
 * Workspace user-level security:
 *   1. Şifre değiştir       (PUT /api/user/profile with currentPassword + newPassword)
 *   2. İki adımlı doğrulama (POST /api/account/2fa/setup, /verify, /disable)
 *   3. Aktif oturumlar      (delegates to <ActiveSessionsTable />)
 *
 * The per-restaurant `BusinessSecuritySettings` (KVKK + isActive + API keys)
 * intentionally lives at /dashboard/restaurants/[id]/settings — that surface
 * is location-scoped, this one is account-scoped.
 */
export function BusinessAccountSecuritySettings({ locale = "tr" }: BusinessAccountSecuritySettingsProps) {
  const isTr = locale === "tr";

  // ─── Password change ───
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

  // ─── 2FA ───
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean | null>(null);
  const [twoFactorLoading, setTwoFactorLoading] = useState(true);
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [twoFaError, setTwoFaError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/user/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setTwoFactorEnabled(Boolean(data?.twoFactorEnabled));
      })
      .catch(() => {
        if (!cancelled) setTwoFactorEnabled(false);
      })
      .finally(() => {
        if (!cancelled) setTwoFactorLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handle2FAToggle = (next: boolean) => {
    setTwoFaError(null);
    if (next) setSetupOpen(true);
    else setDisableOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* 1. Password change */}
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

      {/* 2. 2FA */}
      <SettingsCard
        icon={<ShieldCheck size={18} />}
        title={isTr ? "İki adımlı doğrulama (2FA)" : "Two-factor authentication"}
        description={
          isTr
            ? "Şifrenden sonra ek bir 6 haneli kod ile koruma. Authenticator uygulaması (Google Authenticator, Authy vb.) gerekir."
            : "Adds a 6-digit code after your password. Requires an authenticator app."
        }
        actions={
          twoFactorLoading ? null : (
            <Badge kind={twoFactorEnabled ? "ok" : "off"}>
              {twoFactorEnabled
                ? isTr
                  ? "Aktif"
                  : "On"
                : isTr
                ? "Pasif"
                : "Off"}
            </Badge>
          )
        }
      >
        {twoFaError && (
          <div className="mb-3">
            <AlertBanner kind="danger" onDismiss={() => setTwoFaError(null)}>
              {twoFaError}
            </AlertBanner>
          </div>
        )}
        {twoFactorLoading ? (
          <div className="flex items-center gap-2 text-[13px] text-[#737373]">
            <Loader2 size={14} className="animate-spin" />
            {isTr ? "Yükleniyor…" : "Loading…"}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Toggle
              checked={Boolean(twoFactorEnabled)}
              onChange={handle2FAToggle}
              ariaLabel={isTr ? "2FA aç/kapat" : "Toggle 2FA"}
            />
            <span className="text-[13px] text-[#0A0A0A]">
              {twoFactorEnabled
                ? isTr
                  ? "Doğrulama aktif"
                  : "Verification active"
                : isTr
                ? "Doğrulamayı kur"
                : "Set up verification"}
            </span>
          </div>
        )}
        {backupCodes && (
          <div
            className="mt-4 p-4"
            style={{ background: "#EAF9B8", border: "1px solid #A8D62E", borderRadius: 10 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={14} />
              <strong className="text-[13px]">
                {isTr ? "Yedek kodlar — bunları sakla" : "Backup codes — save these"}
              </strong>
            </div>
            <p className="text-[12px] text-[#525252] mb-3">
              {isTr
                ? "Authenticator uygulamasını kaybedersen aşağıdaki kodlardan biriyle giriş yapabilirsin. Her kod tek seferlik. Bu pencere kapandıktan sonra tekrar gösterilmez."
                : "If you lose your authenticator app, each code below works once for sign-in. They won't be shown again after this dialog closes."}
            </p>
            <div className="grid grid-cols-2 gap-1 bz-mono text-[12px]">
              {backupCodes.map((c) => (
                <code key={c} className="bg-white p-1.5 rounded">
                  {c}
                </code>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setBackupCodes(null)}
              className="bz-btn-primary mt-3 inline-flex items-center gap-1.5 text-[12px]"
              style={{ height: 28, padding: "0 12px", borderRadius: 999 }}
            >
              {isTr ? "Sakladım, kapat" : "I saved them, close"}
            </button>
          </div>
        )}
      </SettingsCard>

      {/* 3. Active sessions */}
      <SettingsCard
        icon={<Lock size={18} />}
        title={isTr ? "Aktif oturumlar" : "Active sessions"}
        description={
          isTr
            ? "Hesabına giriş yapmış cihazlar. Şüpheli bir oturum varsa o cihazdan çıkış yap."
            : "Devices currently signed in. Sign out any session you don't recognize."
        }
      >
        <ActiveSessionsTable />
      </SettingsCard>

      {/* 2FA setup modal */}
      <TwoFactorSetupModal
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        onSuccess={(codes) => {
          setSetupOpen(false);
          setTwoFactorEnabled(true);
          setBackupCodes(codes);
        }}
      />

      {/* 2FA disable modal */}
      {disableOpen && (
        <DisableTwoFactorModal
          isTr={isTr}
          onClose={() => setDisableOpen(false)}
          onDisabled={() => {
            setDisableOpen(false);
            setTwoFactorEnabled(false);
          }}
          onError={(msg) => setTwoFaError(msg)}
        />
      )}
    </div>
  );
}

function DisableTwoFactorModal({
  isTr,
  onClose,
  onDisabled,
  onError,
}: {
  isTr: boolean;
  onClose: () => void;
  onDisabled: () => void;
  onError: (msg: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/account/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, code: code || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || (isTr ? "2FA kapatılamadı." : "Could not disable 2FA."));
      } else {
        onDisabled();
      }
    } catch {
      const msg = isTr ? "Bağlantı hatası." : "Connection error.";
      setError(msg);
      onError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={isTr ? "2FA'yı kapat" : "Disable 2FA"} onClose={onClose} size={460}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-[13px] leading-[1.55] text-[#525252]">
          {isTr
            ? "Güvenliğin için şifrenle doğrula. Authenticator kodun varsa ekleyebilirsin (yoksa boş bırak — backup code da çalışır)."
            : "Confirm with your password. Add an authenticator code if you have one (or leave blank — a backup code works too)."}
        </p>
        {error && (
          <AlertBanner kind="danger" onDismiss={() => setError(null)}>
            {error}
          </AlertBanner>
        )}
        <Field label={isTr ? "Şifre" : "Password"} required>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bz-input w-full"
            autoComplete="current-password"
          />
        </Field>
        <Field
          label={isTr ? "Authenticator / yedek kod (opsiyonel)" : "Authenticator / backup code (optional)"}
        >
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="bz-input w-full bz-mono"
            placeholder="123456"
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="bz-btn-ghost">
            {isTr ? "İptal" : "Cancel"}
          </button>
          <button type="submit" disabled={busy} className="bz-btn-primary disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {isTr ? "Kapat" : "Disable"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default BusinessAccountSecuritySettings;
