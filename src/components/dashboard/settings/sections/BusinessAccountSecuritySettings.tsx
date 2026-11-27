"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, Key, Loader2, Monitor, Smartphone, Globe, X } from "lucide-react";
import { AlertBanner, Field, Modal } from "@/components/ui";
import { SkBox } from "@/components/ui/skeletons/PageSkeleton";
import type { Locale } from "@/lib/translations";
import { SettingsCard } from "../SettingsCard";

interface BusinessAccountSecuritySettingsProps {
  locale?: Locale;
}

interface SessionRow {
  id: string;
  isCurrent: boolean;
  userAgent: string | null;
  ipAddress: string | null;
  lastSeenAt: string;
  createdAt: string;
}

interface SessionsResponse {
  currentTokenHash: string;
  sessions: SessionRow[];
}

/**
 * §38.51 — User-Agent → friendly label parser. Tasarım Kaynağı:
 * page-account.jsx "3 cihaz · macOS, iOS, Chrome" özet pattern. Pragmatik
 * heuristic — UA-Parser-JS gibi bir lib eklenmedi (CLAUDE.md §7).
 */
function parseUserAgentLabel(ua: string | null, isTr = true): { device: string; browser: string } {
  if (!ua) return { device: isTr ? 'Bilinmiyor' : 'Unknown', browser: '—' };
  // OS
  let device = 'Web';
  if (/iPhone|iPad/i.test(ua)) device = 'iOS';
  else if (/Android/i.test(ua)) device = 'Android';
  else if (/Mac OS|Macintosh/i.test(ua)) device = 'macOS';
  else if (/Windows/i.test(ua)) device = 'Windows';
  else if (/Linux/i.test(ua)) device = 'Linux';
  // Browser (Chrome before Safari — iOS Safari has both)
  let browser = 'Web';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua)) browser = 'Safari';
  return { device, browser };
}

function relativeTime(iso: string, isTr: boolean): string {
  const now = Date.now();
  const ms = now - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return isTr ? 'şimdi' : 'just now';
  if (min < 60) return isTr ? `${min} dk önce` : `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return isTr ? `${hr} sa önce` : `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return isTr ? `${day} gün önce` : `${day}d ago`;
  const month = Math.floor(day / 30);
  return isTr ? `${month} ay önce` : `${month}mo ago`;
}

/**
 * Section — Güvenlik (Faz unified hub).
 *
 * §38.51 — 2-row pattern (tasarım .design-owner-2026/page-account.jsx birebir):
 *   - Şifre (her zaman)
 *   - Aktif oturumlar (yeni, /api/account/sessions UI restore)
 *
 * 2FA SKIP (kullanıcı kararı, CLAUDE.md §38.51) — backend `/api/account/2fa/*`
 * korundu, UI yok. Per-restaurant `BusinessSecuritySettings` (KVKK + isActive)
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

  // §38.51 — Sessions state
  const [sessionsModalOpen, setSessionsModalOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionsSummary, setSessionsSummary] = useState<{ count: number; devices: string[] } | null>(null);
  const [revoking, setRevoking] = useState<string | 'others' | null>(null);

  useEffect(() => {
    if (!pwSuccess) return;
    const t = setTimeout(() => setPwSuccess(null), 4000);
    return () => clearTimeout(t);
  }, [pwSuccess]);

  // §38.51 — Initial summary fetch (badge için "X cihaz · macOS, iOS").
  const loadSessionsSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/account/sessions");
      if (!res.ok) return;
      const data = (await res.json()) as SessionsResponse;
      const devices = Array.from(
        new Set(data.sessions.map((s) => parseUserAgentLabel(s.userAgent, isTr).device)),
      ).slice(0, 3);
      setSessionsSummary({ count: data.sessions.length, devices });
      setSessions(data.sessions);
    } catch {
      // Silent fail — summary opsiyonel görsel
    }
  }, [isTr]);

  useEffect(() => {
    loadSessionsSummary();
  }, [loadSessionsSummary]);

  const openSessionsModal = async () => {
    setSessionsModalOpen(true);
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const res = await fetch("/api/account/sessions");
      if (!res.ok) {
        setSessionsError(isTr ? "Oturumlar yüklenemedi." : "Could not load sessions.");
        return;
      }
      const data = (await res.json()) as SessionsResponse;
      setSessions(data.sessions);
    } catch {
      setSessionsError(isTr ? "Bağlantı hatası." : "Connection error.");
    } finally {
      setSessionsLoading(false);
    }
  };

  const revokeSession = async (id: string) => {
    setRevoking(id);
    setSessionsError(null);
    try {
      const res = await fetch(`/api/account/sessions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setSessionsError(isTr ? "Oturum sonlandırılamadı." : "Could not revoke session.");
        return;
      }
      const next = sessions.filter((s) => s.id !== id);
      setSessions(next);
      const devices = Array.from(
        new Set(next.map((s) => parseUserAgentLabel(s.userAgent, isTr).device)),
      ).slice(0, 3);
      setSessionsSummary({ count: next.length, devices });
    } catch {
      setSessionsError(isTr ? "Bağlantı hatası." : "Connection error.");
    } finally {
      setRevoking(null);
    }
  };

  const revokeOthers = async () => {
    setRevoking('others');
    setSessionsError(null);
    try {
      const res = await fetch(`/api/account/sessions/revoke-others`, { method: "POST" });
      if (!res.ok) {
        setSessionsError(isTr ? "Diğer oturumlar sonlandırılamadı." : "Could not revoke others.");
        return;
      }
      // Reload — sadece current kalır
      const refresh = await fetch("/api/account/sessions");
      if (refresh.ok) {
        const data = (await refresh.json()) as SessionsResponse;
        setSessions(data.sessions);
        const devices = Array.from(
          new Set(data.sessions.map((s) => parseUserAgentLabel(s.userAgent, isTr).device)),
        ).slice(0, 3);
        setSessionsSummary({ count: data.sessions.length, devices });
      }
    } catch {
      setSessionsError(isTr ? "Bağlantı hatası." : "Connection error.");
    } finally {
      setRevoking(null);
    }
  };

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
        // The API revokes EVERY UserSession on a password change (§37.2.A) —
        // including the one this tab is using. Leaving the owner on the page
        // meant every later request 401'd with no explanation, so the app
        // looked broken right after a successful password change. Say what is
        // about to happen, then send them to login (same pattern as the
        // account-deletion flow).
        setPwSuccess(
          isTr
            ? "Şifren güncellendi. Güvenlik için tüm oturumlar kapatıldı — girişe yönlendiriliyorsun."
            : "Your password was updated. All sessions were signed out for security — redirecting you to sign in.",
        );
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        window.setTimeout(() => {
          window.location.href = `/${locale}/auth/login`;
        }, 2500);
        return;
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

      {/* §38.51 — Aktif oturumlar (tasarım birebir 2-row pattern: Şifre + Sessions, 2FA skip) */}
      <SettingsCard
        icon={<Monitor size={18} />}
        title={isTr ? "Aktif oturumlar" : "Active sessions"}
        description={
          sessionsSummary && sessionsSummary.count > 0
            ? isTr
              ? `${sessionsSummary.count} cihaz · ${sessionsSummary.devices.join(", ")}`
              : `${sessionsSummary.count} devices · ${sessionsSummary.devices.join(", ")}`
            : isTr
              ? "Hesabına bağlı tüm oturumları görüntüle ve gerekirse sonlandır."
              : "View all sessions linked to your account, revoke if needed."
        }
      >
        <div className="flex justify-end">
          <button
            type="button"
            onClick={openSessionsModal}
            className="bz-btn"
          >
            {isTr ? "Görüntüle" : "View"}
          </button>
        </div>
      </SettingsCard>

      {/* Sessions modal */}
      {sessionsModalOpen && (
        <Modal
          title={isTr ? "Aktif oturumlar" : "Active sessions"}
          onClose={() => setSessionsModalOpen(false)}
          size={560}
          ariaLabel={isTr ? "Aktif oturumlar listesi" : "Active sessions list"}
        >
          {sessionsError && (
            <div className="mb-3">
              <AlertBanner kind="danger" onDismiss={() => setSessionsError(null)}>
                {sessionsError}
              </AlertBanner>
            </div>
          )}

          {sessionsLoading ? (
            // Placeholder rows shaped like the session list below.
            <div role="status" aria-busy="true" className="flex flex-col divide-y divide-pn-line">
              <span className="sr-only">{isTr ? "Oturumlar yükleniyor" : "Loading sessions"}</span>
              {[0, 1].map((i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <SkBox className="h-9 w-9 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <SkBox className="h-3.5 w-40 max-w-full" />
                    <SkBox className="h-3 w-28" />
                  </div>
                </div>
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-center text-[13px] text-[#737373] p-6">
              {isTr ? "Aktif oturum yok." : "No active sessions."}
            </p>
          ) : (
            <ol className="flex flex-col divide-y divide-pn-line">
              {sessions.map((s) => {
                const ua = parseUserAgentLabel(s.userAgent, isTr);
                const Icon = ua.device === 'iOS' || ua.device === 'Android' ? Smartphone : ua.device === 'Web' ? Globe : Monitor;
                return (
                  <li key={s.id} className="flex items-center gap-3 py-3">
                    <span
                      aria-hidden="true"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-pn-canvas border border-pn-line"
                    >
                      <Icon size={15} className="text-[#525252]" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-pn-ink">
                          {ua.device} · {ua.browser}
                        </span>
                        {s.isCurrent && (
                          <span className="text-[13px] font-medium inline-flex items-center gap-1 rounded-full border border-pn-accent bg-pn-accent-soft px-1.5 py-0.5 text-[12px] text-pn-ink">
                            <span aria-hidden="true" className="bz-pulse-dot" style={{ background: '#83AF3B' }} />
                            {isTr ? 'Bu cihaz' : 'This device'}
                          </span>
                        )}
                      </div>
                      <div className="tabular-nums text-[12px] text-[#737373] tabular-nums mt-0.5">
                        {s.ipAddress ?? '—'} · {relativeTime(s.lastSeenAt, isTr)}
                      </div>
                    </div>
                    {!s.isCurrent && (
                      <button
                        type="button"
                        onClick={() => revokeSession(s.id)}
                        disabled={revoking === s.id}
                        className="bz-btn-danger bz-btn-sm text-[12px] disabled:opacity-50"
                        aria-label={isTr ? 'Bu oturumu sonlandır' : 'Revoke this session'}
                      >
                        {revoking === s.id ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <X size={11} strokeWidth={2.5} />
                        )}
                        {isTr ? 'Sonlandır' : 'Revoke'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {!sessionsLoading && sessions.filter((s) => !s.isCurrent).length > 0 && (
            <div className="mt-4 flex justify-end pt-3 border-t border-pn-line">
              <button
                type="button"
                onClick={revokeOthers}
                disabled={revoking === 'others'}
                className="bz-btn disabled:opacity-50"
              >
                {revoking === 'others' ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : null}
                {isTr ? 'Diğer cihazlardan çıkış' : 'Sign out other devices'}
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

export default BusinessAccountSecuritySettings;
