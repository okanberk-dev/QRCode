'use client';

// Denetim Merkezi — hazır şablon önizlemesi (spec §3.1).
//
// Sunucudan gelen katalog payload'ından çizilir (ek istek / iskelet yok):
// madde metinleri + insan okunur tür + zorunluluk. Payload `correctAnswer` ya da
// seçenek taşımaz; bu yüzden burada da gösterilmez.

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Badge, Modal } from '@/components/ui';
import type { CatalogTemplateRow } from '@/lib/audits/queries';
import { humanQuestionType } from '@/lib/audits/kind';
import { getTranslations, type Locale } from '@/lib/translations';
import { itemsCount, itemsHeading, kindBadgeKind, kindLabel } from './audit-ui';

export interface TemplatePreviewModalProps {
  locale: Locale;
  template: CatalogTemplateRow;
  /** Salt-okunur üyelerde "Kullan" / "Kopyala ve düzenle" yok. */
  canWrite: boolean;
  /** "Kullan" çalışıyor (çift tıklamaya karşı kapalı). */
  busy: boolean;
  copyEditHref: string;
  onUse: () => void;
  onClose: () => void;
}

export default function TemplatePreviewModal({
  locale,
  template,
  canWrite,
  busy,
  copyEditHref,
  onUse,
  onClose,
}: TemplatePreviewModalProps) {
  const isTr = locale === 'tr';
  const t = getTranslations(locale);
  const total = template._count.questions;
  const shown = template.questions.length;
  const hidden = Math.max(0, total - shown);

  return (
    <Modal
      title={isTr ? 'Önizleme' : 'Preview'}
      onClose={onClose}
      size={600}
      footer={
        canWrite ? (
          <>
            <Link href={copyEditHref} className="bz-btn-ghost min-h-11 sm:min-h-0">
              {isTr ? 'Kopyala ve düzenle' : 'Copy and edit'}
            </Link>
            <button
              type="button"
              className="bz-btn-primary min-h-11 sm:min-h-0"
              onClick={onUse}
              disabled={busy}
            >
              {busy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              {isTr ? 'Kullan' : 'Use'}
            </button>
          </>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div>
          <h3 className="bz-h-tight break-words text-[18px]">{template.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge kind={kindBadgeKind(template.kind)} dot={false}>
              {kindLabel(template.kind, locale)}
            </Badge>
            <Badge kind="ghost" dot={false}>
              {t[`audits_sector_${template.sector}` as 'audits_sector_food']}
            </Badge>
            <span className="text-[12px] text-[#737373]">{itemsCount(total, locale)}</span>
          </div>
          {template.description && (
            <p className="mt-3 text-[13px] leading-[1.55] text-[#525252]">{template.description}</p>
          )}
        </div>

        <section aria-label={itemsHeading(template.kind, locale)}>
          <h4 className="pulse-eyebrow mb-2 text-[#737373]">
            {itemsHeading(template.kind, locale)}
          </h4>
          <ol className="space-y-1.5">
            {template.questions.map((q, i) => (
              <li
                key={`${q.sortOrder}-${i}`}
                className="flex items-start gap-2.5 rounded-xl border border-[#EDEDED] bg-white px-3 py-2.5"
              >
                <span className="bz-mono mt-0.5 w-5 shrink-0 text-right text-[12px] text-[#737373]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-[13.5px] leading-snug text-[#0A0A0A]">{q.prompt}</p>
                  <p className="mt-1 text-[11.5px] text-[#737373]">
                    {humanQuestionType(q.type, locale)}
                    {!q.isRequired && (isTr ? ' · zorunlu değil' : ' · not required')}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          {hidden > 0 && (
            <p className="mt-2 text-[12px] text-[#737373]">
              {isTr ? `ve ${hidden} madde daha` : `and ${hidden} more`}
            </p>
          )}
        </section>
      </div>
    </Modal>
  );
}
