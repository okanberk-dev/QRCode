"use client";

import { useEffect, useState } from "react";
import { Loader2, LogOut, Monitor, Smartphone } from "lucide-react";
import { AlertBanner, Badge, Skeleton, useConfirmDialog } from "@/components/ui";

interface SessionRow {
  id: string;
  isCurrent: boolean;
  userAgent: string | null;
  ipAddress: string | null;
  lastSeenAt: string;
  createdAt: string;
}

/**
 * Section 8 — Aktif oturumlar tablosu (Faz 3).
 *
 * Her UserSession satırı: cihaz/UA + IP + son aktiflik + "Bu cihaz" badge +
 * "Çıkış yap" buton. Bulk: "Diğer oturumlardan çıkış yap".
 */
export function ActiveSessionsTable() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);
  const [confirmEl, askConfirm] = useConfirmDialog();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/sessions");
      if (!res.ok) throw new Error("Yüklenemedi");
      const data = await res.json();
      // Defensive: a 200 with an unexpected body shape ({}, error envelope,
      // etc.) would slip through `?? []` and crash the .map below. Force an
      // array regardless of what the endpoint hands back.
      setSessions(Array.isArray(data?.sessions) ? data.sessions : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const revokeOne = (id: string) => {
    askConfirm({
      title: "Bu oturumdan çıkış yap?",
      body: "Bu cihazda artık otomatik giriş yapılamaz.",
      confirmLabel: "Çıkış yap",
      variant: "danger",
      onConfirm: async () => {
        setBusyId(id);
        try {
          const res = await fetch(`/api/account/sessions/${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Revoke başarısız");
          setSessions((prev) => prev.filter((s) => s.id !== id));
        } catch (err) {
          setError(err instanceof Error ? err.message : "Hata");
        } finally {
          setBusyId(null);
        }
      },
    });
  };

  const revokeOthers = () => {
    askConfirm({
      title: "Diğer tüm oturumlardan çıkış yap?",
      body:
        "Bu cihaz hariç tüm oturumlar sonlandırılır. Diğer cihazlarda yeniden giriş yapman gerekir.",
      confirmLabel: "Tümünden çıkış yap",
      variant: "danger",
      onConfirm: async () => {
        setRevokingOthers(true);
        try {
          const res = await fetch("/api/account/sessions/revoke-others", { method: "POST" });
          if (!res.ok) throw new Error("Revoke başarısız");
          await load();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Hata");
        } finally {
          setRevokingOthers(false);
        }
      },
    });
  };

  const parseDeviceLabel = (ua: string | null): { label: string; icon: typeof Monitor } => {
    if (!ua) return { label: "Bilinmeyen cihaz", icon: Monitor };
    const isMobile = /Android|iPhone|iPad|Mobile/i.test(ua);
    const browser = /Chrome/i.test(ua)
      ? "Chrome"
      : /Safari/i.test(ua)
        ? "Safari"
        : /Firefox/i.test(ua)
          ? "Firefox"
          : "Tarayıcı";
    const os = /Windows/i.test(ua)
      ? "Windows"
      : /Mac OS/i.test(ua)
        ? "macOS"
        : /Linux/i.test(ua)
          ? "Linux"
          : /iPhone|iPad|iOS/i.test(ua)
            ? "iOS"
            : /Android/i.test(ua)
              ? "Android"
              : "—";
    return { label: `${browser} · ${os}`, icon: isMobile ? Smartphone : Monitor };
  };

  const formatRelative = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return "az önce";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} dakika önce`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} saat önce`;
    const day = Math.floor(hr / 24);
    return `${day} gün önce`;
  };

  if (loading) {
    return <Skeleton className="w-full h-32" />;
  }

  return (
    <div className="space-y-3">
      {confirmEl}
      {error && (
        <AlertBanner kind="danger" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      )}
      {sessions.length === 0 ? (
        <p className="text-[13px] text-[#737373]">
          Aktif oturum kaydı yok. Yeni cihazda giriş yaptığında burada görünür.
        </p>
      ) : (
        <>
          <div className="space-y-2">
            {sessions.map((s) => {
              const { label, icon: Icon } = parseDeviceLabel(s.userAgent);
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-3"
                  style={{
                    background: s.isCurrent ? "#EAF9B8" : "#FAFAFA",
                    border: `1px solid ${s.isCurrent ? "#A8D62E" : "#EDEDED"}`,
                    borderRadius: 10,
                  }}
                >
                  <div
                    className="shrink-0 flex items-center justify-center"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "#0A0A0A",
                      color: "#C6F24E",
                    }}
                  >
                    <Icon size={16} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bz-h-tight text-[13px]">{label}</span>
                      {s.isCurrent && <Badge kind="lime" dot={false}>Bu cihaz</Badge>}
                    </div>
                    <div className="text-[11.5px] text-[#737373] bz-mono mt-0.5">
                      {s.ipAddress ?? "—"} · son aktiflik {formatRelative(s.lastSeenAt)}
                    </div>
                  </div>
                  {!s.isCurrent && (
                    <button
                      type="button"
                      onClick={() => revokeOne(s.id)}
                      disabled={busyId === s.id}
                      className="bz-btn-ghost inline-flex items-center gap-1 text-[12px]"
                      style={{ height: 28, padding: "0 10px", borderRadius: 999 }}
                    >
                      {busyId === s.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <LogOut size={12} />
                      )}
                      Çıkış yap
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {sessions.filter((s) => !s.isCurrent).length > 0 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={revokeOthers}
                disabled={revokingOthers}
                className="bz-btn-ghost inline-flex items-center gap-1 text-[12px]"
                style={{ height: 28, padding: "0 10px", borderRadius: 999 }}
              >
                {revokingOthers && <Loader2 size={12} className="animate-spin" />}
                Tüm diğer oturumlardan çıkış yap
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ActiveSessionsTable;
