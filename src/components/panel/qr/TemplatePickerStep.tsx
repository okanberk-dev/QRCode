'use client';

/**
 * Wizard step 03 — pick a print/share template before final preview.
 *
 * Layout follows `qaxx/qr-templates-2.jsx` DashboardPicker — left card grid
 * (3-col desktop, 2-col tablet, 1-col mobile) + right thumbnail rail with
 * the active template's meta. Wave A registry only ships `classic`, so the
 * grid renders a single tile but the structure is registry-driven — Wave B
 * templates will appear automatically.
 *
 * The actual rendered template (Classic.tsx etc.) is a print artefact
 * (720×900 inline-styled, CLAUDE.md §23.7 wave decision); the picker
 * chrome around it is Pulse (`bz-*` tokens, `pulse-eyebrow`, lime accent).
 */

import { useMemo } from 'react';
import { Check, Layout } from 'lucide-react';
import { Eyebrow } from '@/components/ui';
import { TEMPLATES, getTemplate, type TemplateEntry } from './templates/registry';
import type { TemplateBusiness } from './templates/types';

interface TemplatePickerStepProps {
  /** Current selection — falls back to `classic` when null. */
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** QR payload + business context shared with the right-side preview. */
  qrPayload: string;
  business: TemplateBusiness;
  locale?: 'tr' | 'en';
}

/** Tiny static QR-like swatch for the picker thumb (no real render). */
function PreviewSwatch({ entry }: { entry: TemplateEntry }) {
  const { preview } = entry.meta;
  return (
    <div
      aria-hidden="true"
      style={{
        background: preview.surface,
        borderRadius: 12,
        height: 116,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid #EDEDED',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          background: preview.bg,
          borderRadius: 10,
          padding: 10,
          boxShadow: '0 6px 18px -8px rgba(10,10,10,0.18)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 2,
            width: 56,
          }}
        >
          {[
            1, 1, 1, 0, 1, 1, 1,
            1, 0, 1, 0, 1, 0, 1,
            1, 1, 1, 0, 1, 1, 1,
            0, 0, 1, 0, 1, 0, 0,
            1, 1, 0, 1, 1, 0, 1,
            0, 1, 1, 0, 0, 1, 0,
            1, 0, 1, 1, 1, 0, 1,
          ].map((on, i) => (
            <span
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius:
                  preview.module === 'dot' ? '50%' : preview.module === 'rounded' ? 1.5 : 0,
                background: on ? preview.fg : 'transparent',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TemplatePickerStep({
  selectedId,
  onSelect,
  qrPayload: _qrPayload,
  business: _business,
  locale = 'tr',
}: TemplatePickerStepProps) {
  const isTr = locale === 'tr';
  const active = useMemo(() => getTemplate(selectedId), [selectedId]);

  // Acknowledge live render hooks — Wave B replaces the right-side
  // <PreviewSwatch> with a real <Component qrPayload business /> render
  // via lazy import. These props stay in the contract now so the wizard
  // doesn't need a breaking change when Wave B lands.
  void _qrPayload;
  void _business;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
      {/* Left — template grid */}
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <Eyebrow>{isTr ? 'BASKI ŞABLONU' : 'PRINT TEMPLATE'}</Eyebrow>
          <span className="bz-mono text-[10.5px] text-[#737373]">
            {TEMPLATES.length} {isTr ? 'şablon' : 'templates'}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((entry) => {
            const isActive = entry.meta.id === active.meta.id;
            return (
              <button
                key={entry.meta.id}
                type="button"
                onClick={() => onSelect(entry.meta.id)}
                aria-pressed={isActive}
                className="group flex flex-col gap-2 rounded-2xl p-2.5 text-left transition-colors"
                style={{
                  border: `1px solid ${isActive ? '#0A0A0A' : '#EDEDED'}`,
                  background: isActive ? '#FAFAFA' : '#FFFFFF',
                }}
              >
                <PreviewSwatch entry={entry} />
                <div className="flex items-center justify-between gap-2">
                  <span className="bz-h-tight truncate text-[13px] text-[#0A0A0A]">
                    {entry.meta.name}
                  </span>
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{ background: '#C6F24E' }}
                    >
                      <Check size={11} strokeWidth={2.6} className="text-[#0A0A0A]" />
                    </span>
                  )}
                </div>
                <span className="text-[10.5px] uppercase tracking-[0.16em] text-[#737373]">
                  {entry.meta.tag}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[11.5px] leading-[1.5] text-[#737373]">
          {isTr
            ? 'Yeni şablonlar yakında — bültenden duyuracağız.'
            : 'New templates coming soon — we will announce via newsletter.'}
        </p>
      </div>

      {/* Right — meta panel */}
      <div className="flex shrink-0 flex-col gap-3 rounded-2xl border border-[#EDEDED] bg-white p-4 lg:w-[260px] lg:sticky lg:top-0">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: '#EAF9B8' }}
          >
            <Layout size={14} className="text-[#0A0A0A]" />
          </span>
          <div>
            <Eyebrow>{isTr ? 'SEÇİLİ' : 'SELECTED'}</Eyebrow>
            <div className="bz-h-tight text-[14px] text-[#0A0A0A]">{active.meta.name}</div>
          </div>
        </div>
        <p className="text-[11.5px] leading-[1.55] text-[#525252]">
          {(isTr ? active.meta.descriptionTr : active.meta.descriptionEn) || active.meta.tag}
        </p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Meta label={isTr ? 'En' : 'Width'} value={`${active.meta.print.widthMm} mm`} />
          <Meta label={isTr ? 'Boy' : 'Height'} value={`${active.meta.print.heightMm} mm`} />
          <Meta
            label={isTr ? 'Modül' : 'Module'}
            value={active.meta.preview.module}
            className="capitalize"
          />
          <Meta
            label={isTr ? 'Kategori' : 'Category'}
            value={active.meta.category}
            className="capitalize"
          />
        </div>
        <p className="rounded-lg bg-[#FAFAFA] px-2.5 py-2 text-[11px] leading-[1.5] text-[#737373]">
          {isTr
            ? 'Önizleme oluştur adımında seçili şablonla baskıya hazır PDF üretilir.'
            : 'The preview step produces a print-ready PDF with the selected template.'}
        </p>
      </div>
    </div>
  );
}

function Meta({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <div className={`bz-mono mt-1 text-[12px] text-[#0A0A0A] ${className ?? ''}`}>{value}</div>
    </div>
  );
}

export default TemplatePickerStep;
