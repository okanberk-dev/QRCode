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
      /* §38.67 — Heavy shadow → bz-elev-3 (Apple-soft tier). Önceki
         0_20px_50px_-30px_0.4 dramatic; banner graphite hero kartı,
         floating modal değil → bz-elev-3 (0_12px_32px_0.10) doğru. */
      className="relative rounded-2xl bg-[#0A0A0A] text-white px-5 py-4 sm:px-6 sm:py-5 bz-elev-3 flex items-start gap-4"
    >
      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-5">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span
            aria-hidden
            className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#C6F24E]/15 border border-[#C6F24E]/30"
          >
            <Sparkles size={14} strokeWidth={2.2} className="text-[#C6F24E]" />
          </span>
          <div className="min-w-0 flex-1">
            <span
              className="pulse-eyebrow"
              style={{ color: '#C6F24E' }}
            >
              {isTr ? 'AI İÇGÖRÜ' : 'AI INSIGHT'}
            </span>
            <p className="mt-1 text-[13px] sm:text-[13.5px] leading-[1.55] text-white/95">
              {insight}
            </p>
          </div>
        </div>
        <Link
          href={actionHref}
          className="self-start sm:self-center mt-2 sm:mt-0 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#C6F24E] hover:bg-[#A8D62E] px-4 py-1.5 text-[12px] font-semibold text-[#0A0A0A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
        >
          {actionLabel ?? (isTr ? 'İncele' : 'Explore')}
          <ArrowRight size={12} strokeWidth={2.2} />
        </Link>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={isTr ? 'Gizle' : 'Dismiss'}
        className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]"
      >
        <X size={14} strokeWidth={2.2} />
      </button>
    </section>
  );
}

export default AIInsightBanner;
