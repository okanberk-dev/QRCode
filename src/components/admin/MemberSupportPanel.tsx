'use client';

import { useEffect, useState } from 'react';
import { resolveDisplayTimeZone } from '@/lib/timezone';

interface Support {
  sessions: Array<{ createdAt: string; lastSeenAt: string; device: string | null; ip: string | null; revoked: boolean }>;
  failedMails: Array<{ template: string; status: string; createdAt: string }>;
  brokenLinks: Array<{ restaurant: string; provider: string; checkedAt: string }>;
  google: { connected: boolean; tokenExpiresAt?: string; updatedAt?: string };
  payments: Array<{ status: string; amountMinor: number; billingCycle: string; failureReason: string | null; createdAt: string }>;
}

const fmt = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: resolveDisplayTimeZone(),
});

function shortDevice(ua: string | null): string {
  if (!ua) return 'Bilinmeyen cihaz';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Tarayıcı';
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : '';
  return os ? `${browser} · ${os}` : browser;
}

function Block({ title, empty, children, count }: { title: string; empty: string; children: React.ReactNode; count: number }) {
  return (
    <div>
      <p className="mb-1.5 text-[12px] font-medium text-pn-ink">{title}</p>
      {count === 0 ? <p className="text-[12px] text-[#737373]">{empty}</p> : <ul className="space-y-1">{children}</ul>}
    </div>
  );
}

/** Support summary on /admin/members/[id] → Genel. */
export default function MemberSupportPanel({ userId }: { userId: string }) {
  const [data, setData] = useState<Support | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/members/${userId}/support`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (failed) return <p className="text-[12px] text-[#B91C1C]">Destek özeti yüklenemedi.</p>;
  if (!data) return <div className="bz-skeleton h-32 rounded-[20px]" aria-hidden="true" />;

  const lastSeen = data.sessions[0]?.lastSeenAt;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Block title="Son girişler" empty="Kayıtlı oturum yok." count={data.sessions.length}>
        {data.sessions.map((s, i) => (
          <li key={i} className="text-[12px] text-[#525252]">
            {fmt.format(new Date(s.lastSeenAt))} · {shortDevice(s.device)}
            {s.ip ? ` · ${s.ip}` : ''}
            {s.revoked ? ' · kapatıldı' : ''}
          </li>
        ))}
      </Block>
      <Block title="İletilemeyen e-postalar (30 gün)" empty="Sorun yok." count={data.failedMails.length}>
        {data.failedMails.map((m, i) => (
          <li key={i} className="text-[12px] text-[#B91C1C]">
            {fmt.format(new Date(m.createdAt))} · {m.template} · {m.status}
          </li>
        ))}
      </Block>
      <Block title="Sorunlu platform linkleri" empty="Tüm kontroller başarılı." count={data.brokenLinks.length}>
        {data.brokenLinks.map((l, i) => (
          <li key={i} className="text-[12px] text-[#B91C1C]">
            {l.restaurant} · {l.provider} · {fmt.format(new Date(l.checkedAt))}
          </li>
        ))}
      </Block>
      <div>
        <p className="mb-1.5 text-[12px] font-medium text-pn-ink">Google ve ödeme</p>
        <p className="text-[12px] text-[#525252]">
          Google Business: {data.google.connected ? `bağlı (son güncelleme ${fmt.format(new Date(data.google.updatedAt!))})` : 'bağlı değil'}
        </p>
        {data.payments.length === 0 ? (
          <p className="text-[12px] text-[#737373]">Kartla ödeme yok.</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {data.payments.map((p, i) => (
              <li key={i} className={`text-[12px] ${p.status === 'succeeded' ? 'text-[#15803D]' : p.status === 'failed' ? 'text-[#B91C1C]' : 'text-[#525252]'}`}>
                {fmt.format(new Date(p.createdAt))} · ₺{(p.amountMinor / 100).toLocaleString('tr-TR')} ·{' '}
                {p.billingCycle === 'yearly' ? 'yıllık' : 'aylık'} · {p.status}
                {p.failureReason ? ` (${p.failureReason})` : ''}
              </li>
            ))}
          </ul>
        )}
        {lastSeen && <p className="mt-2 text-[12px] text-[#737373]">Son görülme: {fmt.format(new Date(lastSeen))}</p>}
      </div>
    </div>
  );
}
