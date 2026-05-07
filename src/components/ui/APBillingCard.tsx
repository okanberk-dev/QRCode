'use client';

/**
 * Stage 38 §38.118 — HANDOFF §8 step 5 (Panel kartları) APBillingCard.
 *
 * Subscription/billing card — graphite header + lime corner glow + AI
 * quota progress + 2 action button (Manage + Upgrade). HANDOFF
 * admin-panel.jsx:904-938 spec birebir; eklenen değer:
 *  - Pulse §11 styling (Tailwind utility + inline hex pattern)
 *  - A11y: progress bar `role="progressbar"` + aria-valuenow/min/max,
 *    button `aria-label`, lucide icon ReactNode
 *  - Mevcut `<AccountPlanWidget>` (CLAUDE.md §38.51) Buaze Account →
 *    Plan & Faturalama tab'ında — owner-side, billing summary fetch
 *    integrated. APBillingCard standalone primitive — admin-side veya
 *    yeni billing surface'lerde reuse edilir.
 *
 * HANDOFF spec:
 *  - Header: graphite (#0A0A0A) + radial lime glow corner (top-right
 *    -40px, 140px, opacity 0.25)
 *  - "FATURALAMA" mono uppercase eyebrow
 *  - Plan name italic Space Grotesk (synthetic italic — Stage 32
 *    §38.112 paterni reuse) + "AKTİF" lime chip
 *  - Renews date + monthly price subtitle
 *  - Body: AI quota progress (used/total, lime fill)
 *  - Footer: Manage (secondary) + Upgrade (dark + lime sparkle)
 *
 * Pulse §11 değişiklikler:
 *  - HANDOFF Instrument Serif italic → synthetic italic Space Grotesk
 *    (CLAUDE.md §38.112 cookie banner paterni reuse, kullanıcı kararı
 *    "Asla pivot etme" §38.114)
 *  - Inline hex Pulse tokens
 */

import { type ReactNode } from 'react';
import { Zap } from 'lucide-react';
import { Badge } from './Badge';

export interface APBillingCardProps {
  /** Plan adı — italic hero text. Örn: "Pulse Pro" */
  planName: string;
  /** Plan aktif mi. Aktif iken lime "AKTİF" chip görünür. */
  active?: boolean;
  /** Yenileme tarihi (formatlanmış string, örn. "14 Haziran 2026") */
  renewsAt: string;
  /** Aylık fiyat (formatlanmış string, örn. "₺899/ay" — currency caller responsibility) */
  monthlyPrice: string;
  /** Quota kullanılan miktar */
  quotaUsed: number;
  /** Quota toplam limit */
  quotaTotal: number;
  /** Quota label (mono uppercase, örn. "BU AY AI YANIT KOTASI") */
  quotaLabel?: string;
  /** Manage CTA — caller billing portal'a yönlendirir */
  onManage?: () => void;
  /** Upgrade CTA — caller plan upgrade flow'unu başlatır */
  onUpgrade?: () => void;
  /** Custom Manage label (default "Yönet") */
  manageLabel?: string;
  /** Custom Upgrade label (default "Yükselt") */
  upgradeLabel?: string;
  /** TR/EN i18n switch — default 'tr' */
  locale?: 'tr' | 'en';
  /** Fade-in icon next to Upgrade button (default Zap) */
  upgradeIcon?: ReactNode;
}

const COPY = {
  tr: {
    eyebrow: 'FATURALAMA',
    active: 'AKTİF',
    renewsLabel: 'Yenileniyor',
    quotaLabel: 'AI YANIT KOTASI',
    manage: 'Yönet',
    upgrade: 'Yükselt',
  },
  en: {
    eyebrow: 'BILLING',
    active: 'ACTIVE',
    renewsLabel: 'Renews',
    quotaLabel: 'AI REPLY QUOTA',
    manage: 'Manage',
    upgrade: 'Upgrade',
  },
} as const;

export function APBillingCard({
  planName,
  active = true,
  renewsAt,
  monthlyPrice,
  quotaUsed,
  quotaTotal,
  quotaLabel,
  onManage,
  onUpgrade,
  manageLabel,
  upgradeLabel,
  locale = 'tr',
  upgradeIcon,
}: APBillingCardProps) {
  const c = COPY[locale];
  const pct = quotaTotal > 0 ? Math.max(0, Math.min(100, (quotaUsed / quotaTotal) * 100)) : 0;
  const finalQuotaLabel = quotaLabel ?? c.quotaLabel;
  const finalManageLabel = manageLabel ?? c.manage;
  const finalUpgradeLabel = upgradeLabel ?? c.upgrade;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#0A0A0A]/[0.06] bg-white shadow-[0_2px_8px_rgba(10,10,10,0.04)]">
      {/* Header — graphite + lime corner glow */}
      <div className="relative overflow-hidden bg-[#0A0A0A] px-5 pt-[18px] pb-5">
        {/* Lime corner glow — pointer-events: none */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 h-[140px] w-[140px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(198, 242, 78, 0.25), transparent 70%)',
          }}
        />
        <span
          className="pulse-eyebrow mb-2 block text-white/50"
          style={{ fontSize: 9 }}
        >
          {c.eyebrow}
        </span>
        <div className="mb-1 flex items-center gap-2.5">
          <span
            className="text-[28px] leading-[1.1] tracking-[-0.012em] text-white"
            style={{
              fontFamily: 'var(--font-space-grotesk)',
              fontStyle: 'italic',
              fontWeight: 400,
            }}
          >
            {planName}
          </span>
          {active ? (
            <Badge kind="lime" dot>
              {c.active}
            </Badge>
          ) : null}
        </div>
        <p className="m-0 text-[11px] text-white/55">
          {c.renewsLabel}: {renewsAt} · {monthlyPrice}
        </p>
      </div>

      {/* Body — quota progress */}
      <div className="px-5 py-4">
        <div className="mb-2 flex items-center justify-between">
          <span
            className="pulse-eyebrow text-[#737373]"
            style={{ fontSize: 10 }}
          >
            {finalQuotaLabel}
          </span>
          <span
            className="text-[11px] font-bold text-[#0A0A0A]"
            style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
          >
            {quotaUsed.toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US')}/
            {quotaTotal.toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US')}
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={finalQuotaLabel}
          className="mb-3.5 h-1.5 overflow-hidden rounded-full"
          style={{ background: 'rgba(10, 10, 10, 0.06)' }}
        >
          <div
            aria-hidden="true"
            className="h-full rounded-full bg-[#C6F24E] transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Footer — 2 action buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onManage}
            disabled={!onManage}
            className="pulse-eyebrow flex h-9 flex-1 items-center justify-center rounded-lg border border-[#0A0A0A]/[0.12] bg-white text-[10px] font-bold uppercase tracking-[0.12em] text-[#0A0A0A] transition-colors hover:bg-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
          >
            {finalManageLabel}
          </button>
          <button
            type="button"
            onClick={onUpgrade}
            disabled={!onUpgrade}
            className="pulse-eyebrow flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border-none bg-[#0A0A0A] text-[10px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#1A1A1A] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
          >
            {upgradeIcon ?? <Zap size={12} className="text-[#C6F24E]" />}
            {finalUpgradeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Saf helper — quota percentage compute (test edilebilir).
 * `(used / total) * 100` clamped to [0, 100]. total=0 → 0.
 */
export function computeQuotaPct(used: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, (used / total) * 100));
}
