'use client';

// CLAUDE.md §42 — Audit seed result modal.
//
// Tek satır AlertBanner notice'ten daha zengin görsel feedback. 3 stat
// tile (kategori / şablon / soru) + duration mono pill + 2 CTA
// ("Şablonları gör" / "İstatistiklere git"). Pulse §23.3 Modal primitive
// reuse — focus trap + ESC + body scroll lock built-in.

import Link from 'next/link';
import { ArrowRight, BarChart3, CheckCircle2, ClipboardCheck } from 'lucide-react';
import { Modal } from '@/components/ui';

export interface SeedResult {
  categories: number;
  templates: number;
  questions: number;
  durationMs: number;
}

interface Props {
  result: SeedResult;
  onClose: () => void;
}

export default function SeedResultModal({ result, onClose }: Props) {
  return (
    <Modal onClose={onClose} size={520} ariaLabel="Seed yükleme sonucu">
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EAF9B8]"
            aria-hidden="true"
          >
            <CheckCircle2 size={20} strokeWidth={2.25} className="text-[#0A0A0A]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="bz-h-tight text-[18px]">Varsayılan içerik yüklendi</h2>
            <p className="text-[13px] text-[#525252] mt-1">
              Denetim Merkezi kategorileri ve şablonları güncellendi. Owner panelinde aynı şablon
              kataloğu görünür.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bz-card-soft p-3">
            <div className="pulse-eyebrow text-[#525252]">Kategori</div>
            <div className="bz-h-tight text-[24px] mt-1">{result.categories}</div>
          </div>
          <div className="bz-card-soft p-3">
            <div className="pulse-eyebrow text-[#525252]">Şablon</div>
            <div className="bz-h-tight text-[24px] mt-1">{result.templates}</div>
          </div>
          <div className="bz-card-soft p-3">
            <div className="pulse-eyebrow text-[#525252]">Soru</div>
            <div className="bz-h-tight text-[24px] mt-1">{result.questions}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[12px] text-[#737373]">
          <span className="bz-mono">{result.durationMs}ms</span>
          <span>·</span>
          <span>Idempotent — tekrar tıklarsan aynı sayılar, duplicate yok.</span>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
          <button
            type="button"
            className="bz-btn-ghost"
            onClick={onClose}
          >
            Kapat
          </button>
          <div className="flex flex-col sm:flex-row gap-2">
            <Link
              href="/admin/audits/templates"
              className="bz-btn-ghost"
              onClick={onClose}
            >
              <ClipboardCheck size={14} /> Şablonları gör
            </Link>
            <Link
              href="/admin/audits/stats"
              className="bz-btn-primary"
              onClick={onClose}
            >
              <BarChart3 size={14} /> İstatistiklere git
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </Modal>
  );
}
