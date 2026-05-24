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
      className="sticky top-0 z-[60] w-full bg-[#991B1B] text-white border-b-2 border-[#7F1D1D]"
    >
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-2 sm:px-7">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <ShieldAlert size={16} strokeWidth={2.5} className="shrink-0" />
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] font-medium leading-tight">
            <span className="font-bold uppercase tracking-wider text-[10.5px]">
              ADMIN MODE
            </span>
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
                    · <strong className="bz-mono tabular-nums">{formatRemaining(remainingMs)}</strong> kaldı
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
          className="bz-btn-on-dark bz-btn-sm shrink-0 text-[11px] uppercase tracking-wider disabled:opacity-50"
          aria-label="Admin moddan çık"
        >
          <LogOut size={11} strokeWidth={2.5} />
          {ending ? 'Çıkılıyor…' : 'Çıkış'}
        </button>
      </div>
    </div>
  );
}
