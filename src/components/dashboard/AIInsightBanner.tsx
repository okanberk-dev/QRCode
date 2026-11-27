'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, X } from 'lucide-react';

// Phase 8c+ §38.27 — Tasarım .design-owner-2026/page-dashboard.jsx AI İÇGÖRÜ
// banner paterni. Graphite bg + lime accent. Owner her hafta bir kez görür
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
      // Calm light strip (CLAUDE.md §58): two-line summary + "Detay".
      className="flex items-start gap-3 rounded-[20px] border border-pn-line bg-pn-canvas px-4 py-3 sm:px-5"
    >
      <Sparkles size={15} strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0 text-pn-accent" />
      <p className="min-w-0 flex-1 text-[14px] leading-[1.55] text-[#262626] line-clamp-2">
        <span className="font-medium text-pn-ink">{isTr ? 'AI özeti: ' : 'AI summary: '}</span>
        {insight}
      </p>
      <Link
        href={actionHref}
        className="inline-flex min-h-[44px] shrink-0 items-center gap-1 self-center rounded-full px-1 text-[13px] font-medium text-pn-ink hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent-hover sm:min-h-[32px]"
      >
        {actionLabel ?? (isTr ? 'Detay' : 'Details')}
        <ArrowRight size={12} strokeWidth={2} aria-hidden="true" />
      </Link>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={isTr ? 'Bu haftalık içgörüyü gizle' : "Hide this week's insight"}
        className="-my-2 -mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#737373] hover:text-pn-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent-hover sm:h-8 sm:w-8 sm:self-center sm:m-0"
      >
        <X size={14} strokeWidth={2} aria-hidden="true" />
      </button>
    </section>
  );
}

export default AIInsightBanner;
