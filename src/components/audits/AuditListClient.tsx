'use client';

// CLAUDE.md §42 Phase 2 — Owner audit list client component.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck,
  Copy as CopyIcon,
  Loader2,
  Plus,
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
} from '@/components/ui';
import type { AuditSector, AuditScoringMode } from '@/lib/audits/types';

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

export default function AuditListClient({ locale, restaurants, initialActiveRestaurantId }: Props) {
  const t = getTranslations(locale);
  const [activeRestaurantId, setActiveRestaurantId] = useState<string>(
    initialActiveRestaurantId ?? restaurants[0]?.id ?? '',
  );
  const [templates, setTemplates] = useState<TemplateRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
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
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || (locale === 'tr' ? 'Yükleme başarısız' : 'Failed to load'));
        return;
      }
      const json = await res.json();
      setTemplates(json.data);
    } catch {
      setError(locale === 'tr' ? 'Bağlantı hatası' : 'Connection error');
    } finally {
      setLoading(false);
    }
  }, [activeRestaurantId, locale]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    if (!templates) return { total: 0, published: 0, draft: 0 };
    const published = templates.filter((tpl) => tpl.isPublished).length;
    return { total: templates.length, published, draft: templates.length - published };
  }, [templates]);

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
        const j = await res.json().catch(() => ({}));
        setError(j.error || (locale === 'tr' ? 'Kopyalanamadı' : 'Duplicate failed'));
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
    <div className="mx-auto max-w-[1280px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow={locale === 'tr' ? 'DENETİM MERKEZİ' : 'AUDIT CENTER'}
        eyebrowColor="#C6F24E"
        title={t.audits_title}
        description={t.audits_subtitle}
        actions={
          <div className="flex gap-2">
            <Link href={`/${locale}/dashboard/audits/catalog`} className="bz-btn-ghost">
              <Sparkles size={14} /> {t.audits_my_list_cta_catalog}
            </Link>
            <Link href={`/${locale}/dashboard/audits/new`} className="bz-btn-primary">
              <Plus size={14} /> {t.audits_my_list_cta_new}
            </Link>
          </div>
        }
      />

      {restaurants.length > 1 && (
        <div className="bz-card p-3">
          <label className="pulse-eyebrow text-[#525252] block mb-1">
            {locale === 'tr' ? 'Aktif işletme' : 'Active business'}
          </label>
          <select
            className="bz-input"
            value={activeRestaurantId}
            onChange={(e) => setActiveRestaurantId(e.target.value)}
          >
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
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
              <Link href={`/${locale}/dashboard/audits/catalog`} className="bz-btn-ghost">
                {t.audits_my_list_cta_catalog}
              </Link>
              <Link href={`/${locale}/dashboard/audits/new`} className="bz-btn-primary">
                <Plus size={14} /> {t.audits_my_list_cta_new}
              </Link>
            </div>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => (
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
                  {t.audits_admin_questions.toLowerCase()} ·{' '}
                  <span className="bz-mono">{tpl._count.assignments}</span>{' '}
                  {t.audits_assignments.toLowerCase()} ·{' '}
                  <span className="bz-mono">{tpl._count.responses}</span>{' '}
                  {t.audits_responses.toLowerCase()}
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
