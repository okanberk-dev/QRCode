'use client';

// Denetim Merkezi — "Hazır şablonlar" sekmesi (spec §3.1). Eski ayrı
// `/audits/catalog` sayfasının yerini alır: katalog sunucudan bir kez gelir,
// süzme tarayıcıda yapılır (iskelet / ek istek yok).
//
// Üç parça (liste sayfası tek araç çubuğu kurabilsin diye):
//   • `useReadyTemplatesFilter` — süzgeç durumu + süzülmüş liste.
//   • `ReadyTemplatesFilters` — araç çubuğuna giden seçiciler (Tür / Sektör /
//     Dil). Tek seçeneği kalan seçici gösterilmez.
//   • varsayılan dışa aktarım — şablon kartları + boş durumlar.
//
// Kart: başlık, 2 satır açıklama, madde sayısı, tür, "Kullanılıyor (n)".
// "Önizle" (herkes) + "Kullan" (yazma yetkisi olanlar; tek tık).

import { useMemo, useState } from 'react';
import { Eye, Loader2, Sparkles } from 'lucide-react';
import { Badge, EmptyState, PulseSelect } from '@/components/ui';
import { getTranslations, type Locale } from '@/lib/translations';
import { AUDIT_SECTORS, type AuditSector } from '@/lib/audits/types';
import type { AuditKind } from '@/lib/audits/kind';
import type { CatalogTemplateRow } from '@/lib/audits/queries';
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

// ─── Süzgeç durumu ──────────────────────────────────────────────────────

export interface ReadyTemplatesFilter {
  /** Katalogda hiç şablon yok (süzgeçler gizlenir, kendi boş durumu çıkar). */
  catalogEmpty: boolean;
  kind: KindFilter;
  setKind: (v: KindFilter) => void;
  /** Seçili dilde iki tür de varsa. */
  showKind: boolean;
  sectorMode: SectorMode;
  setSectorMode: (v: SectorMode) => void;
  /** İşletmenin sektöründe de başka sektörde de şablon varsa. */
  showSector: boolean;
  sectorLabel: string;
  /** Katalogda birden çok dil varsa seçili dil; yoksa null. */
  lang: string | null;
  setLang: (v: string) => void;
  langs: string[];
  /** Katalog yalnız Türkçe (EN arayüzde not düşülür). */
  turkishOnly: boolean;
  /** `sectorMode === 'mine'` iken düz liste. */
  flat: CatalogTemplateRow[];
  /** `sectorMode === 'all'` iken sektöre göre gruplar. */
  groups: Array<{ sector: AuditSector; rows: CatalogTemplateRow[] }>;
  /** Süzgeç değiştirilmiş mi (boş durumda "temizle" için). */
  filtered: boolean;
  reset: () => void;
}

export function useReadyTemplatesFilter(
  catalog: CatalogTemplateRow[],
  locale: Locale,
  businessSector: AuditSector,
): ReadyTemplatesFilter {
  const t = getTranslations(locale);
  const [kind, setKind] = useState<KindFilter>('all');
  const [sectorMode, setSectorMode] = useState<SectorMode>('mine');
  const [lang, setLang] = useState<string>(locale);

  const langs = useMemo(() => Array.from(new Set(catalog.map((c) => c.locale))).sort(), [catalog]);
  const multiLocale = langs.length > 1;
  const turkishOnly = !multiLocale && langs[0] === 'tr';

  // Dil seçici yalnız katalogda >1 dil varsa; varsayılan arayüz dili (yoksa ilk dil).
  const effectiveLang = multiLocale
    ? langs.includes(lang)
      ? lang
      : langs.includes(locale)
        ? locale
        : langs[0]
    : null;

  const inLang = useMemo(
    () => (effectiveLang ? catalog.filter((c) => c.locale === effectiveLang) : catalog),
    [catalog, effectiveLang],
  );
  // Seçili dilde yalnız tek tür varsa tür seçicisi gizli ve süzme yapılmaz.
  const showKind = useMemo(() => new Set(inLang.map((c) => c.kind)).size > 1, [inLang]);
  const effectiveKind: KindFilter = showKind ? kind : 'all';
  const inKind = useMemo(
    () => (effectiveKind === 'all' ? inLang : inLang.filter((c) => c.kind === effectiveKind)),
    [inLang, effectiveKind],
  );

  const mineCount = useMemo(
    () => inKind.filter((c) => c.sector === businessSector).length,
    [inKind, businessSector],
  );
  const otherCount = inKind.length - mineCount;
  // İşletmenin sektöründe şablon yoksa kendiliğinden tümü; başka sektör yoksa
  // gruplamaya gerek yok (düz liste).
  const effectiveSectorMode: SectorMode = mineCount === 0 ? 'all' : otherCount === 0 ? 'mine' : sectorMode;
  const showSector = mineCount > 0 && otherCount > 0;

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

  return {
    catalogEmpty: catalog.length === 0,
    kind: effectiveKind,
    setKind,
    showKind,
    sectorMode: effectiveSectorMode,
    setSectorMode,
    showSector,
    sectorLabel: t[`audits_sector_${businessSector}` as 'audits_sector_food'],
    lang: effectiveLang,
    setLang,
    langs,
    turkishOnly,
    flat,
    groups,
    filtered: kind !== 'all' || sectorMode !== 'mine',
    reset: () => {
      setKind('all');
      setSectorMode('mine');
    },
  };
}

// ─── Araç çubuğu seçicileri ─────────────────────────────────────────────

/**
 * Liste sayfasının araç çubuğuna giden seçiciler. Gösterilecek seçici yoksa
 * `null` döner (katalog boş ya da her süzgeçte tek seçenek var).
 */
export function ReadyTemplatesFilters({
  filter,
  locale,
}: {
  filter: ReadyTemplatesFilter;
  locale: Locale;
}) {
  const isTr = locale === 'tr';
  if (filter.catalogEmpty) return null;
  const showLang = filter.lang !== null;
  if (!filter.showKind && !filter.showSector && !showLang) return null;

  // Mobilde: tek seçici tam genişlik, iki seçici yan yana, üçüncü seçici alt satırı
  // tam genişlik doldurur (yarım genişlikte yalnız kalan seçici kırık görünüyordu).
  const visible = [filter.showKind, filter.showSector, showLang].filter(Boolean).length;
  const cell = 'w-full min-w-0 sm:w-auto';
  const lastCell = visible === 3 ? `${cell} col-span-2 sm:col-span-1` : cell;
  return (
    <div
      className={`grid ${visible === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2 sm:flex sm:shrink-0 sm:flex-wrap sm:items-center`}
    >
      {filter.showKind && (
        <PulseSelect
          ariaLabel={isTr ? 'Tür' : 'Type'}
          className={`${cell} sm:min-w-[150px]`}
          value={filter.kind}
          onChange={(v) => filter.setKind(v as KindFilter)}
          options={[
            { value: 'all', label: isTr ? 'Tüm türler' : 'All types' },
            { value: 'checklist', label: kindLabel('checklist', locale) },
            { value: 'quiz', label: kindLabel('quiz', locale) },
          ]}
        />
      )}
      {filter.showSector && (
        <PulseSelect
          ariaLabel={isTr ? 'Sektör' : 'Sector'}
          className={`${cell} sm:min-w-[170px]`}
          value={filter.sectorMode}
          onChange={(v) => filter.setSectorMode(v === 'all' ? 'all' : 'mine')}
          options={[
            { value: 'mine', label: isTr ? `Sektörün: ${filter.sectorLabel}` : `Your sector: ${filter.sectorLabel}` },
            { value: 'all', label: isTr ? 'Tüm sektörler' : 'All sectors' },
          ]}
        />
      )}
      {showLang && filter.lang && (
        <PulseSelect
          ariaLabel={isTr ? 'Dil' : 'Language'}
          className={`${lastCell} sm:min-w-[120px]`}
          value={filter.lang}
          onChange={filter.setLang}
          options={filter.langs.map((l) => ({
            value: l,
            label: l === 'tr' ? 'Türkçe' : l === 'en' ? 'English' : l,
          }))}
        />
      )}
    </div>
  );
}

// ─── Kartlar ────────────────────────────────────────────────────────────

export interface ReadyTemplatesTabProps {
  locale: Locale;
  filter: ReadyTemplatesFilter;
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
  filter,
  inUse,
  canWrite,
  usingId,
  onUse,
  copyEditHref,
  hasBusiness,
}: ReadyTemplatesTabProps) {
  const isTr = locale === 'tr';
  const t = getTranslations(locale);
  const [preview, setPreview] = useState<CatalogTemplateRow | null>(null);

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
          {canWrite && (
            <button
              type="button"
              className="bz-btn-primary min-h-11 sm:min-h-9"
              onClick={() => onUse(c.id)}
              disabled={!hasBusiness || usingId !== null}
              aria-busy={busyHere || undefined}
              aria-label={
                busyHere
                  ? isTr
                    ? `Hazırlanıyor: ${c.title}`
                    : `Preparing: ${c.title}`
                  : isTr
                    ? `Kullan: ${c.title}`
                    : `Use: ${c.title}`
              }
            >
              {busyHere ? (
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles size={14} aria-hidden="true" />
              )}
              {busyHere ? (isTr ? 'Hazırlanıyor…' : 'Preparing…') : isTr ? 'Kullan' : 'Use'}
            </button>
          )}
          <button
            type="button"
            className="bz-btn-ghost min-h-11 sm:min-h-9"
            onClick={() => setPreview(c)}
            aria-label={isTr ? `Önizle: ${c.title}` : `Preview: ${c.title}`}
          >
            <Eye size={14} aria-hidden="true" /> {isTr ? 'Önizle' : 'Preview'}
          </button>
        </div>
      </article>
    );
  }

  if (filter.catalogEmpty) {
    return (
      <EmptyState
        icon={<Sparkles size={20} />}
        title={isTr ? 'Henüz hazır şablon yok' : 'No ready-made templates yet'}
        body={
          canWrite
            ? isTr
              ? 'Hazır şablonlar eklendiğinde burada görünür. Şimdilik "Yeni denetim" ile kendi listeni oluşturabilirsin.'
              : 'Ready-made templates appear here once they are added. For now, create your own with "New audit".'
            : isTr
              ? 'Hazır şablonlar eklendiğinde burada görünür.'
              : 'Ready-made templates appear here once they are added.'
        }
      />
    );
  }

  const empty = filter.flat.length === 0 && filter.groups.length === 0;

  return (
    <div className="space-y-4">
      {filter.turkishOnly && locale === 'en' && (
        <p className="text-[12px] text-[#737373]">Ready-made templates are currently Turkish only.</p>
      )}

      {empty ? (
        <EmptyState
          icon={<Sparkles size={20} />}
          title={isTr ? 'Bu süzgeçle hazır şablon yok' : 'No ready-made templates match'}
          body={isTr ? 'Başka bir tür ya da sektör seç.' : 'Pick another type or sector.'}
          action={
            filter.filtered ? (
              <button type="button" className="bz-btn-ghost min-h-11 sm:min-h-9" onClick={filter.reset}>
                {isTr ? 'Süzgeçleri temizle' : 'Clear filters'}
              </button>
            ) : undefined
          }
        />
      ) : filter.sectorMode === 'mine' ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filter.flat.map(card)}</div>
      ) : (
        <div className="space-y-6">
          {filter.groups.map((g) => (
            <section key={g.sector} aria-labelledby={`audit-ready-g-${g.sector}`}>
              <h2 id={`audit-ready-g-${g.sector}`} className="mb-2 text-[13px] font-medium text-[#525252]">
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
