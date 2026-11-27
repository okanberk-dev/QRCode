'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, ShieldAlert } from 'lucide-react';

// Stage A4 §38.96 — admin "Owner gibi gör" sticky banner.
//
// owner shell topbar üstüne mount edilir. Server-side actor.realAdminId
// set ise gösterilir (impersonation aktif). Client-side fetch
// /api/account/actor-context (Stage A1 §38.93 mevcut) ile durumu doğrular.
//
// 30dk countdown timer + "Çıkış" CTA → POST /api/admin/impersonate/end →
// /admin/dashboard'a yönlendirir.

interface ActorContext {
  source: 'admin' | 'user';
  role: string;
  restaurantId: string | null;
  // Stage A4 — yeni alanlar (endpoint'i de güncellenecek):
  realAdminId?: string | null;
  impersonationSessionId?: string | null;
  impersonationEndsAt?: string | null;
  impersonationAdminUsername?: string | null;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function ImpersonationBanner() {
  const router = useRouter();
  const [actor, setActor] = useState<ActorContext | null>(null);
  const [now, setNow] = useState(Date.now());
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/account/actor-context')
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((payload: ActorContext | null) => {
        if (!cancelled && payload) setActor(payload);
      })
      .catch(() => {
        // Silent — banner just won't render.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Tick every second for countdown.
  useEffect(() => {
    if (!actor?.impersonationEndsAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [actor?.impersonationEndsAt]);

  if (!actor || !actor.realAdminId) return null;

  const endsAt = actor.impersonationEndsAt
    ? new Date(actor.impersonationEndsAt).getTime()
    : null;
  const remainingMs = endsAt ? endsAt - now : 0;
  const expired = remainingMs <= 0;

  const handleEnd = async () => {
    setEnding(true);
    try {
      const res = await fetch('/api/admin/impersonate/end', { method: 'POST' });
      if (res.ok) {
        const j = await res.json().catch(() => ({}));
        const target = typeof j.redirectTo === 'string' ? j.redirectTo : '/admin/dashboard';
        // Hard reload — cookie değişikliği server-side gerek.
        window.location.href = target;
      } else {
        setEnding(false);
        // Fail-soft: refresh, server will redirect via middleware.
        router.refresh();
      }
    } catch {
      setEnding(false);
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      // §38.238 — below lg the shell's own topbar is `sticky top-0 z-40`
      // (UserDashboardShell), so two elements competed for the same slot and the
      // banner sat on top of the burger + logo. On mobile it now scrolls away
      // with the page and leaves the topbar its slot; from lg up it is outside
      // the scroll container, so behaviour there is unchanged.
      className="relative z-[60] mx-2 mt-2 rounded-[24px] bg-[#B42318] text-white"
    >
      <div className="flex items-center justify-between gap-3 py-2 pl-5 pr-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <ShieldAlert size={18} className="shrink-0" />
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[14px] leading-tight">
            <span className="font-medium">Destek oturumu</span>
            <span className="opacity-90">
              {actor.impersonationAdminUsername
                ? `${actor.impersonationAdminUsername} olarak görüntülüyorsun`
                : 'Bir yönetici olarak görüntülüyorsun'}
            </span>
            {endsAt && (
              <span className="opacity-90">
                {expired ? (
                  <strong>Süre doldu</strong>
                ) : (
                  <>
                    · <strong className="tabular-nums">{formatRemaining(remainingMs)}</strong> kaldı
                  </>
                )}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleEnd}
          disabled={ending}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-white px-4 text-[14px] font-medium text-[#B42318] transition-colors hover:bg-white/90 disabled:opacity-50"
          aria-label="Admin moddan çık"
        >
          <LogOut size={16} />
          {ending ? 'Çıkılıyor…' : 'Çıkış'}
        </button>
      </div>
    </div>
  );
}
