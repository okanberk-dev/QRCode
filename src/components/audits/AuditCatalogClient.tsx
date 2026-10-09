'use client';

// CLAUDE.md §42 Phase 2 — Global audit template catalog (owner side).

import { useCallback, useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ClipboardCheck,
  Loader2,
  Sparkles,
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

interface CatalogRow {
  id: string;
  title: string;
  description: string | null;
  sector: AuditSector;
  scoringMode: AuditScoringMode;
  passingScore: number | null;
  locale: string;
  category: CategoryRef | null;
  _count: { questions: number };
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

const SECTOR_LABEL_TR: Record<AuditSector, string> = {
  food: 'Yeme & İçme',
  hotel: 'Konaklama',
  retail: 'Perakende',
  health: 'Sağlık',
  beauty: 'Güzellik',
  other: 'Diğer',
};

const SECTOR_LABEL_EN: Record<AuditSector, string> = {
  food: 'Food & Beverage',
  hotel: 'Hospitality',
  retail: 'Retail',
  health: 'Health',
  beauty: 'Beauty',
  other: 'Other',
};

export default function AuditCatalogClient({
  locale,
  restaurants,
  initialActiveRestaurantId,
}: Props) {
  const t = getTranslations(locale);
  const router = useRouter();
  const restaurantSelectId = useId();
  const [activeRestaurantId, setActiveRestaurantId] = useState<string>(
    initialActiveRestaurantId ?? restaurants[0]?.id ?? '',
  );
  const [sectorFilter, setSectorFilter] = useState<AuditSector | 'all'>('all');
  const [rows, setRows] = useState<CatalogRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const sectorLabel = locale === 'tr' ? SECTOR_LABEL_TR : SECTOR_LABEL_EN;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (sectorFilter !== 'all') qs.set('sector', sectorFilter);
      const res = await fetch(`/api/audits/catalog?${qs.toString()}`);
      if (!res.ok) {
        const parsed = await parseAuditErrorResponse(res, locale);
        setError(summarizeAuditError(parsed));
        return;
      }
      const json = await res.json();
      setRows(json.data);
    } catch {
      setError(locale === 'tr' ? 'Bağlantı hatası' : 'Connection error');
    } finally {
      setLoading(false);
    }
  }, [sectorFilter, locale]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleFork(tplId: string) {
    if (!activeRestaurantId) {
      setError(locale === 'tr' ? 'Önce işletme seç' : 'Pick a business first');
      return;
    }
    setBusyId(tplId);
    setError(null);
    try {
      const res = await fetch(
        `/api/restaurants/${activeRestaurantId}/audits/templates/${tplId}/fork`,
        { method: 'POST' },
      );
      if (!res.ok) {
        const parsed = await parseAuditErrorResponse(res, locale);
        setError(summarizeAuditError(parsed));
        return;
      }
      const json = await res.json();
      // Yeni şablon detay sayfasına git
      router.push(`/${locale}/dashboard/audits/${json.data.id}`);
    } catch {
      setError(locale === 'tr' ? 'Bağlantı hatası' : 'Connection error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow={locale === 'tr' ? 'HAZIR ŞABLONLAR' : 'READY-MADE TEMPLATES'}
        eyebrowColor="#C6F24E"
        title={t.audits_catalog_title}
        description={t.audits_catalog_subtitle}
        actions={
          <Link href={`/${locale}/dashboard/audits`} className="bz-btn-ghost">
            {locale === 'tr' ? 'Listeye dön' : 'Back to list'}
          </Link>
        }
      />

      {error && <AlertBanner kind="danger" onDismiss={() => setError(null)}>{error}</AlertBanner>}

      <div className="bz-card p-3 space-y-3">
        {restaurants.length > 1 && (
          <div>
            <label htmlFor={restaurantSelectId} className="pulse-eyebrow text-[#525252] block mb-1">
              {locale === 'tr' ? 'Hangi işletmeye kopyalansın?' : 'Fork into which business?'}
            </label>
            <PulseSelect
              id={restaurantSelectId}
              className="w-full"
              value={activeRestaurantId}
              onChange={setActiveRestaurantId}
              options={restaurants.map((r) => ({ value: r.id, label: r.name }))}
            />
          </div>
        )}
        <div>
          <label className="pulse-eyebrow text-[#525252] block mb-1">
            {locale === 'tr' ? 'Sektör' : 'Sector'}
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className={`px-3 py-1 rounded-full text-[12px] border ${
                sectorFilter === 'all'
                  ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                  : 'bg-white text-[#0A0A0A] border-[#EDEDED] hover:bg-[#FAFAFA]'
              }`}
              onClick={() => setSectorFilter('all')}
            >
              {locale === 'tr' ? 'Tümü' : 'All'}
            </button>
            {AUDIT_SECTORS.map((s) => (
              <button
                key={s}
                type="button"
                className={`px-3 py-1 rounded-full text-[12px] border ${
                  sectorFilter === s
                    ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                    : 'bg-white text-[#0A0A0A] border-[#EDEDED] hover:bg-[#FAFAFA]'
                }`}
                onClick={() => setSectorFilter(s)}
              >
                {sectorLabel[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && !rows ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : !rows || rows.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={20} />}
          title={t.audits_catalog_empty}
          body={locale === 'tr' ? 'Filtre değiştir veya sıfırdan oluştur.' : 'Adjust filter or start from scratch.'}
          action={
            <Link href={`/${locale}/dashboard/audits/new`} className="bz-btn-primary">
              {t.audits_my_list_cta_new}
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <article key={row.id} className="bz-card p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="bz-h-tight text-[16px]">{row.title}</h3>
                <Badge kind={SECTOR_BADGE[row.sector]}>{sectorLabel[row.sector]}</Badge>
              </div>
              {row.description && (
                <p className="text-[13px] text-[#525252] line-clamp-3">{row.description}</p>
              )}
              <div className="flex items-center justify-between text-[12px] text-[#737373] pt-1 mt-auto border-t border-[#EDEDED]">
                <span className="flex items-center gap-1">
                  <ClipboardCheck size={12} />
                  <span className="bz-mono">{row._count.questions}</span>{' '}
                  {t.audits_admin_questions.toLowerCase()}
                </span>
                <button
                  type="button"
                  className="bz-btn-primary"
                  onClick={() => handleFork(row.id)}
                  disabled={busyId === row.id || !activeRestaurantId}
                >
                  {busyId === row.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  {t.audits_fork_button}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
