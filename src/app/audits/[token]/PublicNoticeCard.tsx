// Herkese açık denetim sayfasının "tarafsız" kartı (spec §3.8): kapalı / bilinmeyen /
// duraklatılmış / arşivlenmiş / iptal edilmiş link ve kullanılmış tek seferlik link.
//
// Sunucu ya da istemci bileşeninden kullanılabilir (hook yok). Kapalı bir linkin
// neden kapalı olduğunu ele vermez (CLAUDE.md §13.5): var olmayan ve duraklatılmış
// token'lar aynı kartı görür.

import type { ReactNode } from 'react';
import { Link2Off } from 'lucide-react';

export type PublicLocale = 'tr' | 'en';

export function notOpenCopy(locale: PublicLocale): { title: string; body: string } {
  return locale === 'tr'
    ? {
        title: 'Bu denetim şu an açık değil',
        body: 'Link kapatılmış veya denetim duraklatılmış olabilir. İşletmeyle iletişime geç.',
      }
    : {
        title: "This audit isn't open",
        body: 'The link may have been closed or the audit paused. Contact the business.',
      };
}

export function usedUpCopy(locale: PublicLocale): { title: string; body: string } {
  return locale === 'tr'
    ? {
        title: 'Bu link tek seferlikti ve kullanıldı.',
        body: 'Yeni bir link için işletmeyle iletişime geç.',
      }
    : {
        title: 'This was a one-time link and has been used.',
        body: 'Contact the business for a new link.',
      };
}

export default function PublicNoticeCard({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#0A0A0A] px-4 py-10 text-white">
      <div className="w-full max-w-[420px] rounded-3xl bg-white p-8 text-center text-[#0A0A0A] shadow-[0_24px_64px_-20px_rgba(0,0,0,0.45)]">
        <div
          aria-hidden="true"
          className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#F5F5F5] text-[#525252]"
        >
          <Link2Off size={24} strokeWidth={2} />
        </div>
        <h1 className="bz-h-tight-2 text-[22px] leading-tight">{title}</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[#525252]">{body}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
      <p className="bz-mono mt-8 text-center text-[11px] text-white/40">POWERED BY BUAZE</p>
    </main>
  );
}
