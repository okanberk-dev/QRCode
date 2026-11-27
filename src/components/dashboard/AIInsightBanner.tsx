'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Sparkles, X } from 'lucide-react';

// Phase 8c+ §38.27 — Haftalık AI içgörü kartı (Pano / Fintora: beyaz kart,
// mor ikon dairesi, gri "Detay" hapı). Owner her hafta bir kez görür
// (haftalık dismiss); ertesi hafta yeni AI insight ile tekrar açılır.
//
// Backend kaynağı: dashboard'da `extractThemes()` zaten çağrılıyor;
// `themes.synthesis` field'ı (1-2 cümle AI çıkarımı) bu banner'a beslenir.
// synthesis boşsa caller banner'ı render etmez (conditional).

export interface AIInsightBannerProps {
  /** AI çıkarımı 1-2 cümle (extractThemes synthesis field). */
  insight: string;
  /** "İncele →" CTA href; default /dashboard/analytics. */
  actionHref?: string;
  /** "İncele" CTA label override; default locale-aware. */
  actionLabel?: string;
  /** localStorage dismiss key. Haftalık reset için ISO week eklenmez —
   *  caller `cacheKey` veya `synthesis` hash'lenmiş ile özelleştirebilir. */
  storageKey?: string;
  isTr?: boolean;
}

function isoWeek(date: Date): string {
  const d = new Date(date.getTime());
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
}

export function AIInsightBanner({
  insight,
  actionHref = '/dashboard/analytics',
  actionLabel,
  storageKey = 'bz_dashboard_ai_insight_dismissed',
  isTr = true,
}: AIInsightBannerProps) {
  // SSR-safe: hidden default; mount sonrası dismiss state oku.
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      const currentWeek = isoWeek(new Date());
      const stored = localStorage.getItem(storageKey);
      // Dismiss key'i bu haftanın ISO week'i ile eşleşiyorsa banner gizli;
      // ertesi hafta otomatik geri gelir.
      setDismissed(stored === currentWeek);
    } catch {
      setDismissed(false); // localStorage erişilemezse banner görünür kalsın
    }
  }, [storageKey]);

  if (dismissed || !insight) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(storageKey, isoWeek(new Date()));
    } catch {
      /* non-blocking */
    }
    setDismissed(true);
  };

  return (
    <section
      role="status"
      aria-label={isTr ? 'AI içgörü' : 'AI insight'}
      // Fintora card: white, borderless, a 40px purple sparkle circle, the
      // weekly summary (two lines) and a grey "Detay ↗" pill + close circle.
      className="bz-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          aria-hidden="true"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pn-accent text-white"
        >
          <Sparkles size={18} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-pn-ink">{isTr ? 'AI özeti' : 'AI summary'}</p>
          <p className="mt-0.5 line-clamp-2 text-[13px] leading-[1.55] text-[#737373]">{insight}</p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={isTr ? 'Bu haftalık içgörüyü gizle' : "Hide this week's insight"}
          className="bz-btn-icon -mr-1 -mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center text-[#737373] hover:text-pn-ink sm:hidden"
        >
          <X size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      <div className="flex shrink-0 items-center gap-2 pl-[52px] sm:pl-0">
        <Link
          href={actionHref}
          className="bz-btn min-h-11 px-4 text-[13px] sm:min-h-10"
        >
          {actionLabel ?? (isTr ? 'Detay' : 'Details')}
          <ArrowUpRight size={15} strokeWidth={2} aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={isTr ? 'Bu haftalık içgörüyü gizle' : "Hide this week's insight"}
          className="bz-btn-icon hidden shrink-0 items-center justify-center text-[#737373] hover:text-pn-ink sm:inline-flex"
        >
          <X size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

export default AIInsightBanner;
