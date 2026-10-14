'use client';

// Denetim Merkezi — "Hazır şablonlar" sekmesi (spec §3.1). Eski ayrı
// `/audits/catalog` sayfasının yerini alır: katalog sunucudan bir kez gelir,
// süzme tarayıcıda yapılır (iskelet / ek istek yok).
//
//   • Türe göre (Hepsi · Kontrol listesi · Test) ve sektöre göre çipler.
//     İşletmenin sektörü önceden seçili; o sektörde şablon yoksa kendiliğinden
//     "Tüm sektörler".
//   • Kart: başlık, 2 satır açıklama, madde sayısı, tür, "Kullanılıyor (n)".
//     "Önizle" (herkes) + "Kullan" (yazma yetkisi olanlar; tek tık).

import { useId, useMemo, useState } from 'react';
import { Eye, Loader2, Sparkles } from 'lucide-react';
import { Badge, EmptyState } from '@/components/ui';
import { getTranslations, type Locale } from '@/lib/translations';
import { AUDIT_SECTORS, type AuditSector } from '@/lib/audits/types';
import type { AuditKind } from '@/lib/audits/kind';
import type { CatalogTemplateRow } from '@/lib/audits/queries';
import ChipRadioGroup from './ChipRadioGroup';
import TemplatePreviewModal from './TemplatePreviewModal';
import {
  groupCatalogBySector,
  itemsCount,
  kindBadgeKind,
  kindLabel,
  sortCatalogRows,
} from './audit-ui';

type KindFilter = 'all' | AuditKind;
type SectorMode = 'mine' | 'all';

export interface ReadyTemplatesTabProps {
  locale: Locale;
  catalog: CatalogTemplateRow[];
  /** Etkin işletmenin denetim sektörü (`auditSectorForBusiness`). */
  businessSector: AuditSector;
  /** Kaynak şablon id → etkin işletmede kullanılan (arşivlenmemiş) denetim sayısı. */
  inUse: Readonly<Record<string, number>>;
  canWrite: boolean;
  /** "Kullan" çalışıyorsa o şablonun id'si (hepsinin düğmesi kapanır). */
  usingId: string | null;
  onUse: (templateId: string) => void;
  /** "Kopyala ve düzenle" adresi. */
  copyEditHref: (templateId: string) => string;
  /** Görünür işletme yoksa (nadir) "Kullan" kapalı. */
  hasBusiness: boolean;
}

export default function ReadyTemplatesTab({
  locale,
  catalog,
  businessSector,
  inUse,
  canWrite,
  usingId,
  onUse,
  copyEditHref,
  hasBusiness,
}: ReadyTemplatesTabProps) {
  const isTr = locale === 'tr';
  const t = getTranslations(locale);
  const baseId = useId();

  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [sectorMode, setSectorMode] = useState<SectorMode>('mine');
  const [lang, setLang] = useState<string>(locale);
  const [preview, setPreview] = useState<CatalogTemplateRow | null>(null);

  const catalogLocales = useMemo(
    () => Array.from(new Set(catalog.map((c) => c.locale))).sort(),
    [catalog],
  );
  const multiLocale = catalogLocales.length > 1;
  const turkishOnly = !multiLocale && catalogLocales[0] === 'tr';

  // Dil çipi yalnız katalogda >1 dil varsa; varsayılan arayüz dili (yoksa ilk dil).
  const effectiveLang = multiLocale
    ? catalogLocales.includes(lang)
      ? lang
      : catalogLocales.includes(locale)
        ? locale
        : catalogLocales[0]
    : null;

  const inLang = useMemo(
    () => (effectiveLang ? catalog.filter((c) => c.locale === effectiveLang) : catalog),
    [catalog, effectiveLang],
  );
  const inKind = useMemo(
    () => (kindFilter === 'all' ? inLang : inLang.filter((c) => c.kind === kindFilter)),
    [inLang, kindFilter],
  );

  const mineCount = useMemo(
    () => inKind.filter((c) => c.sector === businessSector).length,
    [inKind, businessSector],
  );
  // İşletmenin sektöründe (seçili tür için) şablon yoksa kendiliğinden tümü.
  const effectiveSectorMode: SectorMode = mineCount === 0 ? 'all' : sectorMode;
  const sectorLabel = t[`audits_sector_${businessSector}` as 'audits_sector_food'];

  const flat = useMemo(
    () =>
      effectiveSectorMode === 'mine'
        ? sortCatalogRows(
            inKind.filter((c) => c.sector === businessSector),
            businessSector,
          )
        : [],
    [inKind, effectiveSectorMode, businessSector],
  );
  const groups = useMemo(
    () =>
      effectiveSectorMode === 'all'
        ? groupCatalogBySector(inKind, businessSector, AUDIT_SECTORS)
        : [],
    [inKind, effectiveSectorMode, businessSector],
  );

  const kindLabelId = `${baseId}-kind`;
  const sectorLabelId = `${baseId}-sector`;
  const langLabelId = `${baseId}-lang`;

  function card(c: CatalogTemplateRow) {
    const used = inUse[c.id] ?? 0;
    const busyHere = usingId === c.id;
    return (
      <article key={c.id} className="bz-card flex flex-col gap-3 p-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <Badge kind={kindBadgeKind(c.kind)} dot={false}>
              {kindLabel(c.kind, locale)}
            </Badge>
            {used > 0 && (
              <Badge kind="ok" dot={false}>
                {isTr ? `Kullanılıyor (${used})` : `In use (${used})`}
              </Badge>
            )}
          </div>
          <h3 className="bz-h-tight break-words text-[16px] leading-snug">{c.title}</h3>
          {c.description && (
            <p className="mt-1.5 line-clamp-2 text-[13px] leading-[1.5] text-[#525252]">
              {c.description}
            </p>
          )}
        </div>
        <p className="text-[12px] text-[#737373]">{itemsCount(c._count.questions, locale)}</p>
        <div className="mt-auto flex flex-wrap gap-2">
          <button
            type="button"
            className="bz-btn-ghost min-h-11 sm:min-h-9"
            onClick={() => setPreview(c)}
            aria-label={isTr ? `Önizle: ${c.title}` : `Preview: ${c.title}`}
          >
            <Eye size={14} aria-hidden="true" /> {isTr ? 'Önizle' : 'Preview'}
          </button>
          {canWrite && (
            <button
              type="button"
              className="bz-btn-primary min-h-11 sm:min-h-9"
              onClick={() => onUse(c.id)}
              disabled={!hasBusiness || usingId !== null}
              aria-label={isTr ? `Kullan: ${c.title}` : `Use: ${c.title}`}
            >
              {busyHere ? (
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles size={14} aria-hidden="true" />
              )}
              {isTr ? 'Kullan' : 'Use'}
            </button>
          )}
        </div>
      </article>
    );
  }

  const empty = flat.length === 0 && groups.length === 0;

  return (
    <div className="space-y-4">
      <div className="bz-card space-y-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span id={kindLabelId} className="text-[12px] font-semibold text-[#525252]">
            {isTr ? 'Tür' : 'Type'}
          </span>
          <ChipRadioGroup<KindFilter>
            name={`${baseId}-kind`}
            labelledBy={kindLabelId}
            value={kindFilter}
            onChange={setKindFilter}
            options={[
              { value: 'all', label: isTr ? 'Hepsi' : 'All' },
              { value: 'checklist', label: kindLabel('checklist', locale) },
              { value: 'quiz', label: kindLabel('quiz', locale) },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span id={sectorLabelId} className="text-[12px] font-semibold text-[#525252]">
            {isTr ? 'Sektör' : 'Sector'}
          </span>
          <ChipRadioGroup<SectorMode>
            name={`${baseId}-sector`}
            labelledBy={sectorLabelId}
            value={effectiveSectorMode}
            onChange={setSectorMode}
            options={[
              ...(mineCount > 0
                ? [
                    {
                      value: 'mine' as const,
                      label: isTr ? `Sektörün: ${sectorLabel}` : `Your sector: ${sectorLabel}`,
                    },
                  ]
                : []),
              { value: 'all' as const, label: isTr ? 'Tüm sektörler' : 'All sectors' },
            ]}
          />
        </div>
        {multiLocale && effectiveLang && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span id={langLabelId} className="text-[12px] font-semibold text-[#525252]">
              {isTr ? 'Dil' : 'Language'}
            </span>
            <ChipRadioGroup<string>
              name={`${baseId}-lang`}
              labelledBy={langLabelId}
              value={effectiveLang}
              onChange={setLang}
              options={catalogLocales.map((l) => ({
                value: l,
                label: l === 'tr' ? 'Türkçe' : l === 'en' ? 'English' : l,
              }))}
            />
          </div>
        )}
        {turkishOnly && locale === 'en' && (
          <p className="text-[12px] text-[#737373]">
            Ready-made templates are currently Turkish only.
          </p>
        )}
      </div>

      {empty ? (
        <EmptyState
          icon={<Sparkles size={20} />}
          title={isTr ? 'Bu süzgeçle hazır şablon yok' : 'No ready-made templates match'}
          body={
            isTr
              ? 'Türü değiştirmeyi dene ya da sıfırdan oluştur.'
              : 'Try another type, or create one from scratch.'
          }
          action={
            kindFilter !== 'all' ? (
              <button type="button" className="bz-btn-ghost" onClick={() => setKindFilter('all')}>
                {isTr ? 'Tüm türleri göster' : 'Show all types'}
              </button>
            ) : undefined
          }
        />
      ) : effectiveSectorMode === 'mine' ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{flat.map(card)}</div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.sector} aria-labelledby={`${baseId}-g-${g.sector}`}>
              <h2
                id={`${baseId}-g-${g.sector}`}
                className="pulse-eyebrow mb-2 text-[#737373]"
              >
                {t[`audits_sector_${g.sector}` as 'audits_sector_food']}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{g.rows.map(card)}</div>
            </section>
          ))}
        </div>
      )}

      {preview && (
        <TemplatePreviewModal
          locale={locale}
          template={preview}
          canWrite={canWrite && hasBusiness}
          busy={usingId === preview.id}
          copyEditHref={copyEditHref(preview.id)}
          onUse={() => onUse(preview.id)}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
