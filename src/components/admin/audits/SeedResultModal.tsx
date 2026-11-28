'use client';

// CLAUDE.md §42 — Audit seed result modal.
//
// Varsayılan içerik yüklendikten sonra ne yüklendiğini gösterir: 3 sayı
// (kategori / şablon / soru) + "Şablonları gör". Modal primitive'inin başlık,
// açıklama, ikon ve alt çubuk yuvalarını kullanır (odak tuzağı + ESC hazır).

import Link from 'next/link';
import { CheckCircle2, ClipboardCheck } from 'lucide-react';
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
  const tiles: Array<{ label: string; value: number }> = [
    { label: 'Kategori', value: result.categories },
    { label: 'Şablon', value: result.templates },
    { label: 'Soru', value: result.questions },
  ];

  return (
    <Modal
      onClose={onClose}
      size={520}
      title="Varsayılan içerik yüklendi"
      description="Kategoriler ve şablonlar güncellendi. İşletmeler bu şablonları Denetim Merkezi'ndeki hazır şablonlar listesinde görür."
      icon={<CheckCircle2 size={18} strokeWidth={2.25} />}
      footer={
        <>
          <button type="button" className="bz-btn-ghost" onClick={onClose}>
            Kapat
          </button>
          <Link href="/admin/audits/templates" className="bz-btn-primary" onClick={onClose}>
            <ClipboardCheck size={14} aria-hidden="true" /> Şablonları gör
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        <dl className="grid grid-cols-3 gap-2">
          {tiles.map((tile) => (
            <div key={tile.label} className="min-w-0 rounded-[16px] bg-pn-canvas p-3">
              <dt className="truncate text-[13px] text-[#737373]">{tile.label}</dt>
              <dd className="mt-1 text-[24px] font-medium leading-none tabular-nums text-pn-ink">{tile.value}</dd>
            </div>
          ))}
        </dl>

        <p className="text-[13px] leading-[1.5] text-[#737373]">
          Yeniden yüklersen aynı içerik güncellenir, kopya oluşmaz.
        </p>
      </div>
    </Modal>
  );
}
