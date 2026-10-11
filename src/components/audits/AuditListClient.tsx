'use client';

// CLAUDE.md §42 Phase 2 — Owner audit list client component.

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck,
  Copy as CopyIcon,
  Loader2,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { getTranslations, type Locale } from '@/lib/translations';
import {
  AlertBanner,
  Badge,
  type BadgeKind,
  CardSkeleton,
  EmptyState,
  PageHeader,
  PulseSelect,
} from '@/components/ui';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import { useActiveBusinessSelection } from './useActiveBusinessSelection';
import { AUDIT_SECTORS, type AuditSector, type AuditScoringMode } from '@/lib/audits/types';
import {
  parseAuditErrorResponse,
  summarizeAuditError,
} from '@/lib/audits/error-humanizer';

interface Restaurant {
  id: string;
  name: string;
}

interface CategoryRef {
  id: string;
  slug: string;
  labelTr: string;
  labelEn: string;
}

interface TemplateRow {
  id: string;
  title: string;
  description: string | null;
  sector: AuditSector;
  scoringMode: AuditScoringMode;
  passingScore: number | null;
  locale: string;
  isPublished: boolean;
  isActive: boolean;
  updatedAt: string;
  category: CategoryRef | null;
  _count: { questions: number; assignments: number; responses: number };
}

interface Props {
  locale: Locale;
  restaurants: Restaurant[];
  initialActiveRestaurantId: string | null;
}

const SECTOR_BADGE: Record<AuditSector, BadgeKind> = {
  food: 'lime',
  hotel: 'info',
  retail: 'warn',
  health: 'ok',
  beauty: 'ghost',
  other: 'ghost',
};

const SCORE_LABEL_KEYS: Record<AuditScoringMode, 'audits_score_mode_percentage' | 'audits_score_mode_weighted' | 'audits_score_mode_pass_fail'> = {
  percentage: 'audits_score_mode_percentage',
  weighted: 'audits_score_mode_weighted',
  pass_fail: 'audits_score_mode_pass_fail',
};

type SectorFilter = 'all' | AuditSector;
type StatusFilter = 'all' | 'published' | 'draft' | 'archived';

// Count unit after a number. Turkish nouns stay singular after a numeral
// ("4 soru", "0 atama"); English pluralises.
function countUnit(locale: Locale, n: number, tr: string, enOne: string, enMany: string) {
  if (locale === 'tr') return tr;
  return n === 1 ? enOne : enMany;
}

// Inline filter pill — bu sayfada 14 instance (sektör 7 + durum 4 + arşiv +
// extras). 3+ tekrarlı abstraction kaçınma ilkesi (CLAUDE.md §7) ihlal değil
// çünkü tek dosya. Aynı pattern başka audit sayfasında çıkarsa
// `src/components/audits/FilterPill.tsx`'e taşınır.
function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'rounded-full px-3 py-1 text-[12px] font-medium transition-colors',
        'border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6F24E]',
        active
          ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
          : 'bg-white text-[#525252] border-[#EDEDED] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export default function AuditListClient({ locale, restaurants, initialActiveRestaurantId }: Props) {
  const t = getTranslations(locale);
  const restaurantSelectId = useId();
  // Follows the shell's business switcher (topbar / sidebar).
  const business = useActiveBusinessSelection(restaurants, initialActiveRestaurantId);
  const activeRestaurantId = business.activeId ?? '';
  const businessReady = business.ready;
  const selectBusiness = business.select;
  // Guards against a slow response for the previous business overwriting
  // the list after a switch.
  const loadSeqRef = useRef(0);
  const [templates, setTemplates] = useState<TemplateRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // URL-synced filter (CLAUDE.md §36). Defaults 'all' / '' — clean URL'de
  // hiç query param yok. Browser back doğal çalışır, deeplink-friendly.
  const filters = useUrlFilter<{ sector: SectorFilter; status: StatusFilter; q: string }>({
    sector: 'all',
    status: 'all',
    q: '',
  });
  // Search input local state — debounced 300ms ile URL'e yazılır.
  // URL = source of truth (mount'ta initial value oradan gelir).
  const [searchInput, setSearchInput] = useState<string>(filters.values.q);
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput !== filters.values.q) filters.set('q', searchInput);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);
  // URL geri ileri ile değişirse input'u senkronla.
  useEffect(() => {
    setSearchInput(filters.values.q);
  }, [filters.values.q]);

  const load = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    if (!activeRestaurantId) {
      setTemplates([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/restaurants/${activeRestaurantId}/audits/templates?drafts=true`,
      );
      if (seq !== loadSeqRef.current) return;
      if (!res.ok) {
        const parsed = await parseAuditErrorResponse(res, locale);
        if (seq === loadSeqRef.current) setError(summarizeAuditError(parsed));
        return;
      }
      const json = await res.json();
      if (seq === loadSeqRef.current) setTemplates(json.data);
    } catch {
      if (seq === loadSeqRef.current) {
        setError(locale === 'tr' ? 'Bağlantı hatası' : 'Connection error');
      }
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }, [activeRestaurantId, locale]);

  useEffect(() => {
    if (!businessReady) return;
    load();
  }, [load, businessReady]);

  const counts = useMemo(() => {
    if (!templates) return { total: 0, published: 0, draft: 0 };
    const published = templates.filter((tpl) => tpl.isPublished).length;
    return { total: templates.length, published, draft: templates.length - published };
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    if (!templates) return null;
    const q = filters.values.q.trim().toLowerCase();
    return templates.filter((tpl) => {
      if (filters.values.sector !== 'all' && tpl.sector !== filters.values.sector) return false;
      if (filters.values.status === 'published' && !tpl.isPublished) return false;
      if (filters.values.status === 'draft' && (tpl.isPublished || !tpl.isActive)) return false;
      if (filters.values.status === 'archived' && tpl.isActive) return false;
      if (q) {
        const hay = `${tpl.title} ${tpl.description ?? ''} ${tpl.category?.labelTr ?? ''} ${tpl.category?.labelEn ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [templates, filters.values.sector, filters.values.status, filters.values.q]);

  // Carry the active business into the catalog / create pages.
  const businessQuery = activeRestaurantId
    ? `?restaurantId=${encodeURIComponent(activeRestaurantId)}`
    : '';
  const catalogHref = `/${locale}/dashboard/audits/catalog${businessQuery}`;
  const newAuditHref = `/${locale}/dashboard/audits/new${businessQuery}`;

  const hasFilters =
    filters.values.sector !== 'all' || filters.values.status !== 'all' || filters.values.q.trim() !== '';

  async function handleDuplicate(tplId: string) {
    if (!activeRestaurantId) return;
    setBusyId(tplId);
    setError(null);
    try {
      const res = await fetch(
        `/api/restaurants/${activeRestaurantId}/audits/templates/${tplId}/duplicate`,
        { method: 'POST' },
      );
      if (!res.ok) {
        const parsed = await parseAuditErrorResponse(res, locale);
        setError(summarizeAuditError(parsed));
        return;
      }
      setNotice(locale === 'tr' ? 'Şablon kopyalandı' : 'Template duplicated');
      await load();
      setTimeout(() => setNotice(null), 3500);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow={locale === 'tr' ? 'DENETİM MERKEZİ' : 'AUDIT CENTER'}
        title={t.audits_title}
        description={t.audits_subtitle}
        actions={
          <div className="flex gap-2">
            <Link href={catalogHref} className="bz-btn-ghost">
              <Sparkles size={14} /> {t.audits_my_list_cta_catalog}
            </Link>
            <Link href={newAuditHref} className="bz-btn-primary">
              <Plus size={14} /> {t.audits_my_list_cta_new}
            </Link>
          </div>
        }
      />

      {restaurants.length > 1 && (
        <div className="bz-card p-3">
          <label htmlFor={restaurantSelectId} className="pulse-eyebrow text-[#525252] block mb-1">
            {locale === 'tr' ? 'Aktif işletme' : 'Active business'}
          </label>
          <PulseSelect
            id={restaurantSelectId}
            className="w-full"
            value={activeRestaurantId}
            onChange={selectBusiness}
            options={restaurants.map((r) => ({ value: r.id, label: r.name }))}
          />
        </div>
      )}

      {error && <AlertBanner kind="danger" onDismiss={() => setError(null)}>{error}</AlertBanner>}
      {notice && <AlertBanner kind="success" onDismiss={() => setNotice(null)}>{notice}</AlertBanner>}

      <div className="grid grid-cols-3 gap-3">
        <div className="bz-card p-3">
          <div className="pulse-eyebrow text-[#525252]">{locale === 'tr' ? 'Toplam' : 'Total'}</div>
          <div className="bz-h-tight text-[22px] mt-1">{counts.total}</div>
        </div>
        <div className="bz-card p-3">
          <div className="pulse-eyebrow text-[#525252]">{t.audits_published}</div>
          <div className="bz-h-tight text-[22px] mt-1 text-[#166534]">{counts.published}</div>
        </div>
        <div className="bz-card p-3">
          <div className="pulse-eyebrow text-[#525252]">{t.audits_draft}</div>
          <div className="bz-h-tight text-[22px] mt-1 text-[#525252]">{counts.draft}</div>
        </div>
      </div>

      {/* Filter rail — sector + status pill tabs + debounced search */}
      {templates && templates.length > 0 && (
        <div className="bz-card p-3 space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-[320px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737373] pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                className="bz-input pl-9 pr-9"
                placeholder={t.audits_search_placeholder}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label={t.audits_search_placeholder}
                enterKeyHint="search"
              />
              {searchInput && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-[#737373] hover:text-[#0A0A0A] focus-visible:outline-2 focus-visible:outline-[#C6F24E]"
                  onClick={() => setSearchInput('')}
                  aria-label={t.audits_clear_filters}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {hasFilters && (
              <button
                type="button"
                className="bz-btn-ghost self-start lg:self-auto"
                onClick={() => {
                  filters.setMany({ sector: 'all', status: 'all', q: '' });
                  setSearchInput('');
                }}
              >
                <X size={12} /> {t.audits_clear_filters}
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <span className="pulse-eyebrow text-[#525252] shrink-0">
              {t.audits_filter_sector}
            </span>
            <div className="flex flex-wrap gap-1.5">
              <FilterPill
                active={filters.values.sector === 'all'}
                onClick={() => filters.set('sector', 'all')}
              >
                {t.audits_filter_all}
              </FilterPill>
              {AUDIT_SECTORS.map((s) => (
                <FilterPill
                  key={s}
                  active={filters.values.sector === s}
                  onClick={() => filters.set('sector', s)}
                >
                  {t[`audits_sector_${s}` as 'audits_sector_food']}
                </FilterPill>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <span className="pulse-eyebrow text-[#525252] shrink-0">
              {t.audits_filter_status}
            </span>
            <div className="flex flex-wrap gap-1.5">
              <FilterPill
                active={filters.values.status === 'all'}
                onClick={() => filters.set('status', 'all')}
              >
                {t.audits_filter_all}
              </FilterPill>
              <FilterPill
                active={filters.values.status === 'published'}
                onClick={() => filters.set('status', 'published')}
              >
                {t.audits_published}
              </FilterPill>
              <FilterPill
                active={filters.values.status === 'draft'}
                onClick={() => filters.set('status', 'draft')}
              >
                {t.audits_draft}
              </FilterPill>
              <FilterPill
                active={filters.values.status === 'archived'}
                onClick={() => filters.set('status', 'archived')}
              >
                {t.audits_archived}
              </FilterPill>
            </div>
          </div>
        </div>
      )}

      {loading && !templates ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : !templates || templates.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck size={20} />}
          title={t.audits_my_list_empty}
          body={t.audits_empty_cta}
          action={
            <div className="flex gap-2">
              <Link href={catalogHref} className="bz-btn-ghost">
                {t.audits_my_list_cta_catalog}
              </Link>
              <Link href={newAuditHref} className="bz-btn-primary">
                <Plus size={14} /> {t.audits_my_list_cta_new}
              </Link>
            </div>
          }
        />
      ) : !filteredTemplates || filteredTemplates.length === 0 ? (
        <EmptyState
          icon={<Search size={20} />}
          title={t.audits_no_results_title}
          body={t.audits_no_results_body}
          action={
            <button
              type="button"
              className="bz-btn-ghost"
              onClick={() => {
                filters.setMany({ sector: 'all', status: 'all', q: '' });
                setSearchInput('');
              }}
            >
              <X size={12} /> {t.audits_clear_filters}
            </button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((tpl) => (
            <article key={tpl.id} className="bz-card p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/${locale}/dashboard/audits/${tpl.id}`}
                  className="bz-h-tight text-[16px] truncate hover:underline"
                >
                  {tpl.title}
                </Link>
                {tpl.isPublished ? (
                  <Badge kind="ok">{t.audits_published}</Badge>
                ) : tpl.isActive ? (
                  <Badge kind="ghost">{t.audits_draft}</Badge>
                ) : (
                  <Badge kind="warn">{t.audits_archived}</Badge>
                )}
              </div>
              {tpl.description && (
                <p className="text-[13px] text-[#525252] line-clamp-2">{tpl.description}</p>
              )}
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <Badge kind={SECTOR_BADGE[tpl.sector]}>{t[`audits_sector_${tpl.sector}` as 'audits_sector_food']}</Badge>
                <Badge kind="ghost">{t[SCORE_LABEL_KEYS[tpl.scoringMode]]}</Badge>
                {tpl.passingScore != null && (
                  <Badge kind="info">≥{tpl.passingScore}</Badge>
                )}
              </div>
              <div className="flex items-center justify-between text-[12px] text-[#737373] pt-1 mt-auto border-t border-[#EDEDED]">
                <span>
                  <span className="bz-mono">{tpl._count.questions}</span>{' '}
                  {countUnit(locale, tpl._count.questions, 'soru', 'question', 'questions')} ·{' '}
                  <span className="bz-mono">{tpl._count.assignments}</span>{' '}
                  {countUnit(locale, tpl._count.assignments, 'atama', 'assignment', 'assignments')} ·{' '}
                  <span className="bz-mono">{tpl._count.responses}</span>{' '}
                  {countUnit(locale, tpl._count.responses, 'yanıt', 'response', 'responses')}
                </span>
                <button
                  type="button"
                  className="bz-btn-icon"
                  onClick={() => handleDuplicate(tpl.id)}
                  disabled={busyId === tpl.id}
                  aria-label={locale === 'tr' ? 'Kopyala' : 'Duplicate'}
                >
                  {busyId === tpl.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CopyIcon size={14} />
                  )}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
