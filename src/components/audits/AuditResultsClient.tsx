'use client';

// CLAUDE.md §42 Phase 4 — Owner audit results client.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  Download,
  Loader2,
  Search,
} from 'lucide-react';
import {
  AlertBanner,
  Badge,
  type BadgeKind,
  BarChart,
  EmptyState,
  PageHeader,
  TableSkeleton,
} from '@/components/ui';
import { getTranslations, type Locale } from '@/lib/translations';
import type { AuditScoringMode } from '@/lib/audits/types';

interface ResponseRow {
  id: string;
  respondentName: string | null;
  respondentEmail: string | null;
  respondentPhone: string | null;
  teamMemberId: string | null;
  score: number | null;
  scorePercentage: number | null;
  passed: boolean | null;
  startedAt: string;
  completedAt: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  assignmentId: string | null;
  createdAt: string;
}

interface Summary {
  total: number;
  completed: number;
  averageScore: number | null;
  passedCount: number;
  passingScore: number | null;
}

interface Distribution {
  bucket: string;
  min: number;
  max: number;
  count: number;
}

interface FetchResponse {
  data: ResponseRow[];
  summary: Summary;
  distribution: Distribution[];
}

interface Props {
  locale: Locale;
  template: {
    id: string;
    restaurantId: string;
    title: string;
    scoringMode: AuditScoringMode;
    passingScore: number | null;
  };
}

type RangeFilter = '7d' | '30d' | '90d' | 'all';
type StatusFilter = 'all' | 'completed' | 'in_progress';
type PassedFilter = 'all' | 'true' | 'false';

export default function AuditResultsClient({ locale, template }: Props) {
  const t = getTranslations(locale);
  const [range, setRange] = useState<RangeFilter>('30d');
  const [status, setStatus] = useState<StatusFilter>('completed');
  const [passedFilter, setPassedFilter] = useState<PassedFilter>('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [data, setData] = useState<FetchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const buildQs = useCallback(() => {
    const qs = new URLSearchParams();
    if (range !== 'all') qs.set('range', range);
    if (status !== 'all') qs.set('status', status);
    if (passedFilter !== 'all') qs.set('passed', passedFilter);
    if (search) qs.set('search', search);
    return qs;
  }, [range, status, passedFilter, search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/restaurants/${template.restaurantId}/audits/templates/${template.id}/responses?${buildQs().toString()}`,
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || (locale === 'tr' ? 'Yükleme başarısız' : 'Failed to load'));
        return;
      }
      const json = (await res.json()) as FetchResponse;
      setData(json);
    } catch {
      setError(locale === 'tr' ? 'Bağlantı hatası' : 'Connection error');
    } finally {
      setLoading(false);
    }
  }, [template.restaurantId, template.id, buildQs, locale]);

  useEffect(() => {
    load();
  }, [load]);

  const histogram = useMemo(() => {
    if (!data) return [];
    return data.distribution.map((d) => ({ label: d.bucket, value: d.count }));
  }, [data]);

  const maxBucket = useMemo(() => {
    if (!histogram.length) return 0;
    return Math.max(...histogram.map((d) => d.value));
  }, [histogram]);

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      const qs = buildQs();
      const res = await fetch(
        `/api/restaurants/${template.restaurantId}/audits/templates/${template.id}/responses/export?${qs.toString()}`,
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (res.status === 429) {
          setError(locale === 'tr' ? 'Çok sık indiriyorsun, 60sn sonra tekrar dene.' : 'Too many exports, retry in 60s.');
        } else {
          setError(j.error || (locale === 'tr' ? 'CSV indirilemedi' : 'CSV export failed'));
        }
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-${template.id}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError(locale === 'tr' ? 'Bağlantı hatası' : 'Connection error');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1280px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      <div>
        <Link
          href={`/${locale}/dashboard/audits/${template.id}`}
          className="text-[12px] text-[#737373] hover:text-[#0A0A0A] inline-flex items-center gap-1"
        >
          <ArrowLeft size={12} /> {locale === 'tr' ? 'Detaya dön' : 'Back to detail'}
        </Link>
      </div>

      <PageHeader
        eyebrow={locale === 'tr' ? 'DENETİM SONUÇLARI' : 'AUDIT RESULTS'}
        eyebrowColor="#C6F24E"
        title={template.title}
        description={
          locale === 'tr'
            ? 'Yanıtların tam listesi + skor dağılımı + manuel inceleme.'
            : 'Full response list + score distribution + manual review.'
        }
        actions={
          <button
            type="button"
            className="bz-btn-ghost"
            onClick={handleExport}
            disabled={exporting || !data || data.data.length === 0}
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            CSV
          </button>
        }
      />

      {error && <AlertBanner kind="danger" onDismiss={() => setError(null)}>{error}</AlertBanner>}

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="bz-card p-3">
          <div className="pulse-eyebrow text-[#525252]">
            {locale === 'tr' ? 'Toplam yanıt' : 'Total responses'}
          </div>
          <div className="bz-h-tight text-[22px] mt-1">{data?.summary.total ?? '—'}</div>
        </div>
        <div className="bz-card p-3">
          <div className="pulse-eyebrow text-[#525252]">{t.audits_completed}</div>
          <div className="bz-h-tight text-[22px] mt-1">{data?.summary.completed ?? '—'}</div>
        </div>
        <div className="bz-card p-3">
          <div className="pulse-eyebrow text-[#525252]">{t.audits_average_score}</div>
          <div className="bz-h-tight text-[22px] mt-1">
            {data?.summary.averageScore != null
              ? `${Math.round(data.summary.averageScore)}`
              : '—'}
            {data?.summary.averageScore != null && (
              <span className="text-[#A3A3A3] text-[14px]">/100</span>
            )}
          </div>
        </div>
        <div className="bz-card p-3">
          <div className="pulse-eyebrow text-[#525252]">{t.audits_pass_rate}</div>
          <div className="bz-h-tight text-[22px] mt-1">
            {data?.summary.completed && data.summary.completed > 0
              ? `%${Math.round((data.summary.passedCount / data.summary.completed) * 100)}`
              : '—'}
          </div>
        </div>
      </div>

      {/* Histogram */}
      {data && data.summary.completed > 0 && (
        <section className="bz-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={16} />
            <h2 className="bz-h-tight text-[14px]">
              {locale === 'tr' ? 'Skor dağılımı' : 'Score distribution'}
            </h2>
          </div>
          <BarChart data={histogram} maxValue={maxBucket || 1} height={120} accent="#C6F24E" showValues />
        </section>
      )}

      {/* Filters */}
      <div className="bz-card p-3 flex flex-wrap gap-2 items-end">
        <div>
          <label className="pulse-eyebrow text-[#525252] block mb-1">
            {locale === 'tr' ? 'Aralık' : 'Range'}
          </label>
          <select
            className="bz-input min-w-[120px]"
            value={range}
            onChange={(e) => setRange(e.target.value as RangeFilter)}
          >
            <option value="7d">7g</option>
            <option value="30d">30g</option>
            <option value="90d">90g</option>
            <option value="all">{locale === 'tr' ? 'Tümü' : 'All'}</option>
          </select>
        </div>
        <div>
          <label className="pulse-eyebrow text-[#525252] block mb-1">
            {locale === 'tr' ? 'Durum' : 'Status'}
          </label>
          <select
            className="bz-input min-w-[140px]"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
          >
            <option value="all">{locale === 'tr' ? 'Tümü' : 'All'}</option>
            <option value="completed">{t.audits_completed}</option>
            <option value="in_progress">{t.audits_in_progress}</option>
          </select>
        </div>
        <div>
          <label className="pulse-eyebrow text-[#525252] block mb-1">
            {locale === 'tr' ? 'Sonuç' : 'Outcome'}
          </label>
          <select
            className="bz-input min-w-[120px]"
            value={passedFilter}
            onChange={(e) => setPassedFilter(e.target.value as PassedFilter)}
          >
            <option value="all">{locale === 'tr' ? 'Tümü' : 'All'}</option>
            <option value="true">{t.audits_passed}</option>
            <option value="false">{t.audits_failed}</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="pulse-eyebrow text-[#525252] block mb-1">
            {locale === 'tr' ? 'Ara (ad / e-posta)' : 'Search (name / email)'}
          </label>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#737373]"
            />
            <input
              className="bz-input pl-8"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={locale === 'tr' ? 'Ad veya e-posta' : 'Name or email'}
            />
          </div>
        </div>
      </div>

      {/* List */}
      {loading && !data ? (
        <TableSkeleton rows={6} cols={5} />
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          icon={<BarChart3 size={20} />}
          title={locale === 'tr' ? 'Yanıt bulunamadı' : 'No responses'}
          body={
            locale === 'tr'
              ? 'Filtreyi değiştir veya yeni bir atama yap.'
              : 'Adjust filters or create a new assignment.'
          }
        />
      ) : (
        <div className="bz-card overflow-hidden">
          <table className="bz-table">
            <thead>
              <tr>
                <th>{locale === 'tr' ? 'Katılımcı' : 'Respondent'}</th>
                <th className="text-right">{t.audits_total_score}</th>
                <th>{locale === 'tr' ? 'Sonuç' : 'Outcome'}</th>
                <th>{locale === 'tr' ? 'Tamamlandı' : 'Completed'}</th>
                <th>{locale === 'tr' ? 'İnceleme' : 'Reviewed'}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((r) => {
                const passedKind: BadgeKind = r.passed === true
                  ? 'ok'
                  : r.passed === false
                    ? 'danger'
                    : 'ghost';
                return (
                  <tr key={r.id}>
                    <td>
                      <div className="text-[14px]">
                        {r.respondentName || (locale === 'tr' ? 'Anonim' : 'Anonymous')}
                      </div>
                      {r.respondentEmail && (
                        <div className="text-[11px] text-[#737373]">{r.respondentEmail}</div>
                      )}
                    </td>
                    <td className="text-right bz-mono">
                      {r.score != null ? (
                        <>
                          {r.score}
                          <span className="text-[#A3A3A3]">/100</span>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {r.completedAt ? (
                        r.passed === true ? (
                          <Badge kind="ok">{t.audits_passed}</Badge>
                        ) : r.passed === false ? (
                          <Badge kind="danger">{t.audits_failed}</Badge>
                        ) : (
                          <Badge kind={passedKind}>—</Badge>
                        )
                      ) : (
                        <Badge kind="ghost">{t.audits_in_progress}</Badge>
                      )}
                    </td>
                    <td className="text-[12px] text-[#525252]">
                      {r.completedAt
                        ? new Date(r.completedAt).toLocaleDateString(
                            locale === 'tr' ? 'tr-TR' : 'en-US',
                            { day: '2-digit', month: 'short', year: 'numeric' },
                          )
                        : '—'}
                    </td>
                    <td className="text-[12px] text-[#525252]">
                      {r.reviewedAt
                        ? new Date(r.reviewedAt).toLocaleDateString(
                            locale === 'tr' ? 'tr-TR' : 'en-US',
                            { day: '2-digit', month: 'short' },
                          )
                        : ''}
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/${locale}/dashboard/audits/${template.id}/responses/${r.id}`}
                        className="bz-btn-ghost"
                      >
                        {locale === 'tr' ? 'İncele' : 'Review'}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
