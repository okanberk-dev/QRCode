'use client';

/**
 * Stage 38 §38.118 — HANDOFF §8 step 5 (Panel kartları) APAIDraftCard.
 *
 * AI reply draft card — graphite header + lime accent + tone segmented
 * + edit/approve actions. HANDOFF admin-panel.jsx:799-847 spec birebir;
 * eklenen değer:
 *  - Pulse §11 styling (Tailwind utility + inline hex pattern)
 *  - A11y: button aria-label + tone segmented `role="tablist"` (Buaze
 *    `<Tabs>` primitive reuse) + lucide icon ReactNode children (HANDOFF
 *    `name` string yerine — Buaze paterni daha esnek)
 *  - Mevcut Buaze AI Co-Pilot draft akışı (Stage 31 §38.34/§38.42)
 *    intact — APAIDraftCard standalone primitive, gelecek panel
 *    callsite'larında reuse edilir (admin Inbox + owner feedback inbox).
 *
 * HANDOFF spec:
 *  - Header: graphite (#0A0A0A) + Sparkles icon (lime tint chip) + "AI
 *    YANIT" mono uppercase + "PULSE AI · 0.8s" timestamp
 *  - Tone segmented: warm / pro / witty (3-option pill segmented)
 *  - Body: "YANITLANIYOR · Müşteri adı · ★★☆☆☆" mono uppercase + reply
 *    paragraph
 *  - Footer: 2 chip (empathetic + solution-focused) + 3 action button
 *    (refresh icon + edit + approve)
 */

import { Sparkles, Check, Pencil, RefreshCw } from 'lucide-react';
import { Tabs, type TabItem } from './Tabs';
import { Badge } from './Badge';

export type APAIDraftTone = 'warm' | 'pro' | 'witty';

export interface APAIDraftCardProps {
  /** Reply taslağı (HTML değil, plain text — line break preserve) */
  reply: string;
  /** Aktif tone selection */
  tone: APAIDraftTone;
  /** Tone değişiminde tetiklenir (otomatik regenerate caller responsibility) */
  onToneChange: (tone: APAIDraftTone) => void;
  /** Yanıtlanan müşteri adı (mono uppercase context line) */
  customerName: string;
  /** Müşterinin verdiği yıldız puanı (1-5) — context line'da görünür */
  customerStars: number;
  /** AI üretim süresi (saniye, opsiyonel — default 0.8) */
  generationSeconds?: number;
  /** Özet etiketler (chip olarak gösterilir, Badge primitive reuse) */
  tags?: { label: string; tone?: 'lime' | 'info' | 'warn' }[];
  /** "Yeniden öner" — caller AI regenerate çağrısı */
  onRegenerate: () => void;
  /** "Düzenle" — caller compose modal'ı açar */
  onEdit: () => void;
  /** "Onayla & Gönder" — caller AI draft submit */
  onApprove: () => void;
  /** Loading state — refresh button spinner döner, edit/approve disable */
  loading?: boolean;
  /** TR/EN i18n switch — default 'tr' */
  locale?: 'tr' | 'en';
}

const COPY = {
  tr: {
    eyebrow: 'AI YANIT',
    timestamp: 'PULSE AI',
    toneLabel: 'TON',
    toneOptions: { warm: 'SICAK', pro: 'PROFESYONEL', witty: 'NÜKTELİ' },
    contextPrefix: 'YANITLANIYOR',
    regenerate: 'Yeniden öner',
    edit: 'Düzenle',
    approve: 'Onayla & Gönder',
  },
  en: {
    eyebrow: 'AI REPLY',
    timestamp: 'PULSE AI',
    toneLabel: 'TONE',
    toneOptions: { warm: 'WARM', pro: 'PROFESSIONAL', witty: 'WITTY' },
    contextPrefix: 'REPLYING TO',
    regenerate: 'Regenerate',
    edit: 'Edit',
    approve: 'Approve & Send',
  },
} as const;

const STAR_FILLED = '★';
const STAR_EMPTY = '☆';

function renderStars(n: number): string {
  const safe = Math.max(0, Math.min(5, Math.round(n)));
  return STAR_FILLED.repeat(safe) + STAR_EMPTY.repeat(5 - safe);
}

export function APAIDraftCard({
  reply,
  tone,
  onToneChange,
  customerName,
  customerStars,
  generationSeconds = 0.8,
  tags,
  onRegenerate,
  onEdit,
  onApprove,
  loading = false,
  locale = 'tr',
}: APAIDraftCardProps) {
  const c = COPY[locale];

  const toneTabs: TabItem[] = [
    { id: 'warm', label: c.toneOptions.warm },
    { id: 'pro', label: c.toneOptions.pro },
    { id: 'witty', label: c.toneOptions.witty },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-[#0A0A0A]/[0.06] bg-white shadow-[0_2px_8px_rgba(10,10,10,0.04)]">
      {/* Header — graphite + lime accent */}
      <div className="flex items-center justify-between bg-[#0A0A0A] px-[18px] py-3.5 text-white">
        <div className="flex items-center gap-2.5">
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[13px] bg-[#C6F24E]/15">
            <Sparkles size={13} className="text-[#C6F24E]" strokeWidth={2.2} />
          </span>
          <span
            className="pulse-eyebrow text-[#C6F24E]"
            style={{ fontSize: 10 }}
          >
            {c.eyebrow}
          </span>
        </div>
        <span
          className="pulse-eyebrow text-white/50"
          style={{ fontSize: 9 }}
        >
          {c.timestamp} · {generationSeconds.toFixed(1)}s
        </span>
      </div>

      {/* Tone segmented */}
      <div className="border-b border-[#0A0A0A]/[0.05] px-[18px] pt-3 pb-2">
        <span
          className="pulse-eyebrow mb-2 block text-[#737373]"
          style={{ fontSize: 9 }}
        >
          {c.toneLabel}
        </span>
        <Tabs
          items={toneTabs}
          active={tone}
          onChange={(id) => onToneChange(id as APAIDraftTone)}
          ariaLabel={c.toneLabel}
        />
      </div>

      {/* Body — customer context + reply */}
      <div className="border-b border-[#0A0A0A]/[0.05] px-[18px] pt-3.5 pb-1.5">
        <span
          className="pulse-eyebrow mb-1.5 block text-[#525252]"
          style={{ fontSize: 10 }}
        >
          {c.contextPrefix} · {customerName} · {renderStars(customerStars)}
        </span>
        <p className="m-0 whitespace-pre-line text-[13px] leading-[1.55] text-[#0A0A0A]">
          {reply}
        </p>
      </div>

      {/* Footer — tags + actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-[18px] py-3">
        <div className="flex flex-wrap gap-1.5">
          {tags?.map((tag) => (
            <Badge key={tag.label} kind={tag.tone ?? 'lime'} dot>
              {tag.label}
            </Badge>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={loading}
            aria-label={c.regenerate}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#0A0A0A]/[0.08] bg-[#FAFAFA] text-[#0A0A0A] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
          >
            <RefreshCw
              size={13}
              strokeWidth={2}
              className={loading ? 'animate-spin' : ''}
            />
          </button>
          <button
            type="button"
            onClick={onEdit}
            disabled={loading}
            className="pulse-eyebrow inline-flex h-8 items-center gap-1.5 rounded-full border border-[#0A0A0A]/[0.08] bg-white px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#0A0A0A] transition-colors hover:bg-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
          >
            <Pencil size={11} strokeWidth={2} />
            {c.edit}
          </button>
          <button
            type="button"
            onClick={onApprove}
            disabled={loading}
            className="pulse-eyebrow inline-flex h-8 items-center gap-1.5 rounded-full border-none bg-[#C6F24E] px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#0A0A0A] shadow-[0_4px_12px_-4px_rgba(198,242,78,0.55)] transition-colors hover:bg-[#A8D62E] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
          >
            <Check size={11} strokeWidth={2.5} />
            {c.approve}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Saf helper — yıldız sayısını "★★☆☆☆" string'e çevirir. Test edilebilir. */
export { renderStars };
