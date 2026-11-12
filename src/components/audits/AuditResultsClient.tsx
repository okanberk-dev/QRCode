'use client';

// Denetim Merkezi — sonuçlar (spec §3.6).
//
// Sayfa sunucudan gelir (ilk boyamada iskelet yok). Üstten alta: özet kutuları
// (gerçek toplamlar), "Dikkat edilecek maddeler", filtreler, sayfalı liste.
// Rakamlar HER ZAMAN tüm filtrelenmiş kümeden (aggregate) gelir; liste yalnız
// 50'şerli sayfalardır — "Daha fazla göster" bir sonrakini ekler.

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, ChevronRight, Download, Loader2, Search, Share2 } from 'lucide-react';
import {
  AlertBanner,
  Badge,
  BarChart,
  EmptyState,
  PulseSelect,
  PageHeader,
} from '@/components/ui';
import type { Locale } from '@/lib/translations';
import type {
  AuditMissSummary,
  AuditResponseListRow,
  AuditResponsesPage,
  AuditResultsInitial,
} from '@/lib/audits/queries';
import { parseAuditErrorResponse, summarizeAuditError } from '@/lib/audits/error-humanizer';
import { formatResponseStamp, itemsCount, kindLabel, responsesCount } from './audit-ui';
import ChipRadioGroup from './ChipRadioGroup';
import Disclosure from './Disclosure';
import ShareLinksModal from './ShareLinksModal';

type RangeFilter = '7d' | '30d' | '90d' | 'all';
type PassedFilter = 'all' | 'true' | 'false';

interface Props {
  locale: Locale;
  initial: AuditResultsInitial;
  /** Denetimdeki madde sayısı (paylaşım penceresi için). */
  questionCount: number;
  /** Tanım gereği puanlanabilir madde sayısı; 0 ise "tümü tamam" denemez. */
  evaluableCount: number;
  /** Filtreden bağımsız toplam yanıt (boş durum ayrımı). */
  responseCountAllTime: number;
  appUrl: string;
  /** Salt-okunur (viewer) üyeler paylaşım penceresini açamaz. */
  canWrite: boolean;
}

const CSV_CAP = 5000;
const MISS_PREVIEW = 5;
const HISTOGRAM_MIN_RESPONSES = 5;

function isRange(v: string): v is RangeFilter {
  return v === '7d' || v === '30d' || v === '90d' || v === 'all';
}

export default function AuditResultsClient({
  locale,
  initial,
  questionCount,
  evaluableCount,
  responseCountAllTime,
  appUrl,
  canWrite,
}: Props) {
  const isTr = locale === 'tr';
  const ui = isTr ? 'tr' : 'en';
  const { template } = initial;
  const idBase = useId();
  const hasPassMark = template.passingScore !== null;
  const archived = template.status === 'archived';

  const [range, setRange] = useState<RangeFilter>(isRange(initial.range) ? initial.range : '30d');
  const [passedFilter, setPassedFilter] = useState<PassedFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [page, setPage] = useState<AuditResponsesPage>(initial.responses);
  const [rows, setRows] = useState<AuditResponseListRow[]>(initial.responses.data);
  const [misses, setMisses] = useState<AuditMissSummary>(initial.misses);

  const [listLoading, setListLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistogram, setShowHistogram] = useState(false);
  const [showAllMisses, setShowAllMisses] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const apiBase = `/api/restaurants/${template.restaurantId}/audits/templates/${template.id}`;
  const base = `/${locale}/dashboard/audits`;

  // Aramayı 400 ms geciktir.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filterKey = `${range}|${passedFilter}|${search}`;
  const loadedKeyRef = useRef(filterKey);
  const missRangeRef = useRef<RangeFilter>(range);
  // Eski bir yanıtın yenisini ezmesini engeller (hızlı filtre değişimi).
  const requestRef = useRef(0);

  const buildQuery = useCallback(
    (pageNo: number) => {
      const qs = new URLSearchParams();
      if (range !== 'all') qs.set('range', range);
      if (hasPassMark && passedFilter !== 'all') qs.set('passed', passedFilter);
      if (search) qs.set('search', search);
      qs.set('page', String(pageNo));
      return qs.toString();
    },
    [range, passedFilter, search, hasPassMark],
  );

  const fetchFirstPage = useCallback(async () => {
    const reqId = ++requestRef.current;
    setListLoading(true);
    setError(null);
    try {
      const needMisses = missRangeRef.current !== range;
      const [listRes, missRes] = await Promise.all([
        fetch(`${apiBase}/responses?${buildQuery(1)}`),
        needMisses
          ? fetch(`${apiBase}/summary${range !== 'all' ? `?range=${range}` : ''}`)
          : Promise.resolve(null),
      ]);
      if (reqId !== requestRef.current) return;
      if (!listRes.ok) {
        setError(summarizeAuditError(await parseAuditErrorResponse(listRes, locale)));
        return;
      }
      const next = (await listRes.json()) as AuditResponsesPage;
      if (reqId !== requestRef.current) return;
      setPage(next);
      setRows(next.data);
      if (missRes) {
        if (missRes.ok) {
          setMisses((await missRes.json()) as AuditMissSummary);
          missRangeRef.current = range;
        } else {
          setError(summarizeAuditError(await parseAuditErrorResponse(missRes, locale)));
        }
      }
    } catch {
      if (reqId === requestRef.current) setError(isTr ? 'Bağlantı hatası' : 'Connection error');
    } finally {
      if (reqId === requestRef.current) setListLoading(false);
    }
  }, [apiBase, buildQuery, range, locale, isTr]);

  useEffect(() => {
    if (filterKey === loadedKeyRef.current) return; // sunucudan gelen ilk veri
    loadedKeyRef.current = filterKey;
    void fetchFirstPage();
    // yalnız filtre değişince
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  async function loadMore() {
    if (loadingMore || !page.meta.hasMore) return;
    const reqId = requestRef.current;
    setLoadingMore(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/responses?${buildQuery(page.meta.page + 1)}`);
      if (reqId !== requestRef.current) return;
      if (!res.ok) {
        setError(summarizeAuditError(await parseAuditErrorResponse(res, locale)));
        return;
      }
      const next = (await res.json()) as AuditResponsesPage;
      if (reqId !== requestRef.current) return;
      setPage(next);
      setRows((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...next.data.filter((r) => !seen.has(r.id))];
      });
    } catch {
      setError(isTr ? 'Bağlantı hatası' : 'Connection error');
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/responses/export`);
      if (!res.ok) {
        setError(summarizeAuditError(await parseAuditErrorResponse(res, locale)));
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
      setError(isTr ? 'Bağlantı hatası' : 'Connection error');
    } finally {
      setExporting(false);
    }
  }

  function clearFilters() {
    setRange('all');
    setPassedFilter('all');
    setSearchInput('');
    setSearch('');
  }

  const summary = page.summary;
  const distributionTotal = useMemo(
    () => page.distribution.reduce((n, b) => n + b.count, 0),
    [page.distribution],
  );
  const histogram = useMemo(
    () => page.distribution.map((d) => ({ label: d.bucket, value: d.count })),
    [page.distribution],
  );
  const filtersActive = range !== 'all' || passedFilter !== 'all' || search !== '';
  const noResponsesAtAll = responseCountAllTime === 0;

  const rangeOptions = [
    { value: '7d' as const, label: isTr ? '7g' : '7d' },
    { value: '30d' as const, label: isTr ? '30g' : '30d' },
    { value: '90d' as const, label: isTr ? '90g' : '90d' },
    { value: 'all' as const, label: isTr ? 'Tümü' : 'All' },
  ];
  const rangeText = {
    '7d': isTr ? 'son 7 gün' : 'last 7 days',
    '30d': isTr ? 'son 30 gün' : 'last 30 days',
    '90d': isTr ? 'son 90 gün' : 'last 90 days',
    all: isTr ? 'tüm zamanlar' : 'all time',
  }[range];

  const visibleMisses = showAllMisses ? misses.items : misses.items.slice(0, MISS_PREVIEW);
  const showMissCard = evaluableCount > 0 && misses.total > 0;

  const passLabel = isTr ? 'Geçti' : 'Passed';
  const failLabel = isTr ? 'Kaldı' : 'Failed';

  return (
    <div className="mx-auto max-w-[1280px] space-y-4 px-4 py-6 sm:px-7 lg:py-8">
      <div>
        <Link
          href={`${base}/${template.id}`}
          className="inline-flex min-h-11 items-center gap-1 text-[13px] text-[#737373] hover:text-[#0A0A0A] sm:min-h-0 sm:text-[12px]"
        >
          <ArrowLeft size={13} aria-hidden="true" /> {isTr ? 'Denetime dön' : 'Back to audit'}
        </Link>
      </div>

      <PageHeader
        eyebrow={isTr ? 'SONUÇLAR' : 'RESULTS'}
        title={template.title}
        description={
          <>
            {kindLabel(template.kind, ui)} · {itemsCount(questionCount, ui)} ·{' '}
            {responsesCount(responseCountAllTime, ui)}
            {responseCountAllTime > CSV_CAP && (
              <>
                {' · '}
                {isTr
                  ? `Tablo en yeni ${CSV_CAP} yanıtı içerir.`
                  : `The table download holds the newest ${CSV_CAP} responses.`}
              </>
            )}
          </>
        }
        actions={
          // Hiç yanıt yokken indirilecek bir şey yok: düğme gösterilmez.
          noResponsesAtAll ? undefined : (
            <button
              type="button"
              className="bz-btn-ghost min-h-11 sm:min-h-0"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              ) : (
                <Download size={14} aria-hidden="true" />
              )}
              {isTr ? 'Tablo olarak indir (CSV)' : 'Download as table (CSV)'}
            </button>
          )
        }
      />

      {archived && (
        <AlertBanner kind="info">
          {isTr
            ? 'Bu denetim arşivlendi. Linkleri kapandı, yanıtlar korunuyor.'
            : 'This audit is archived. Its links are closed; responses are kept.'}
        </AlertBanner>
      )}
      {error && (
        <AlertBanner kind="danger" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      )}

      {noResponsesAtAll ? (
        <EmptyState
          icon={<BarChart3 size={20} aria-hidden="true" />}
          title={isTr ? 'Henüz yanıt yok' : 'No responses yet'}
          body={
            isTr
              ? 'Linki paylaştığında yanıtlar burada görünür.'
              : 'Once you share the link, responses show up here.'
          }
          action={
            canWrite && !archived ? (
              <button type="button" className="bz-btn-primary min-h-11" onClick={() => setShareOpen(true)}>
                <Share2 size={14} aria-hidden="true" /> {isTr ? 'Linki paylaş' : 'Share link'}
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Özet: mobilde de yan yana kalır */}
          <div
            className={`grid gap-2 sm:gap-3 ${hasPassMark ? 'grid-cols-3' : 'grid-cols-2'}`}
            aria-busy={listLoading}
          >
            <SummaryTile label={isTr ? 'Yanıt' : 'Responses'}>{summary.total}</SummaryTile>
            <SummaryTile label={isTr ? 'Ortalama' : 'Average'}>
              {summary.averageScore !== null ? (
                <>
                  {Math.round(summary.averageScore)}
                  <span className="text-[12px] text-[#A3A3A3] sm:text-[14px]">/100</span>
                </>
              ) : (
                '—'
              )}
            </SummaryTile>
            {hasPassMark && (
              <SummaryTile label={isTr ? 'Geçme oranı' : 'Pass rate'}>
                {summary.passRate !== null ? `%${summary.passRate}` : '—'}
              </SummaryTile>
            )}
          </div>

          {/* Dikkat edilecek maddeler */}
          {showMissCard && (
            <section className="bz-card p-4 sm:p-5" aria-labelledby={`${idBase}-miss`}>
              <h2 id={`${idBase}-miss`} className="bz-h-tight text-[15px]">
                {isTr ? 'Dikkat edilecek maddeler' : 'Items needing attention'}
              </h2>
              <p className="mt-0.5 text-[12px] text-[#737373]">
                {isTr ? `En çok aksayan maddeler · ${rangeText}` : `Most-missed items · ${rangeText}`}
              </p>
              {misses.items.length === 0 ? (
                <div className="mt-3">
                  <AlertBanner kind="success">
                    {isTr ? 'Tüm maddeler tamam görünüyor.' : 'All items look fine.'}
                  </AlertBanner>
                </div>
              ) : (
                <>
                  <ol className="mt-3 space-y-3">
                    {visibleMisses.map((m) => (
                      <li key={m.questionId}>
                        <div className="flex items-start justify-between gap-3">
                          <p className="min-w-0 break-words text-[14px] leading-snug text-[#0A0A0A]">
                            {m.prompt}
                          </p>
                          <p className="shrink-0 text-right text-[12px] text-[#525252]">
                            {isTr
                              ? `${m.missed} / ${m.answered} yanıtta sorunlu`
                              : `${m.missed} / ${m.answered} flagged`}
                          </p>
                        </div>
                        <div
                          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#EDEDED]"
                          role="img"
                          aria-label={`${Math.round(m.missRate * 100)}%`}
                        >
                          <div
                            className="h-full rounded-full bg-[#DC2626]"
                            style={{ width: `${Math.max(3, Math.round(m.missRate * 100))}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ol>
                  {misses.items.length > MISS_PREVIEW && (
                    <button
                      type="button"
                      className="mt-3 min-h-11 text-[13px] font-medium text-[#0A0A0A] underline underline-offset-2 sm:min-h-9"
                      onClick={() => setShowAllMisses((v) => !v)}
                    >
                      {showAllMisses
                        ? isTr
                          ? 'Daha az göster'
                          : 'Show fewer'
                        : isTr
                          ? `Tümünü göster (${misses.items.length})`
                          : `Show all (${misses.items.length})`}
                    </button>
                  )}
                  {misses.truncated && (
                    <p className="mt-2 text-[11px] text-[#737373]">
                      {isTr
                        ? 'Çok sayıda cevap olduğu için en yeni cevaplara göre hesaplandı.'
                        : 'Based on the newest answers because there are very many.'}
                    </p>
                  )}
                </>
              )}
            </section>
          )}

          {/* Puan dağılımı: en az 5 puanlı yanıt varsa, kapalı başlar */}
          {distributionTotal >= HISTOGRAM_MIN_RESPONSES && (
            <section className="bz-card px-4 py-1 sm:px-5">
              <Disclosure
                open={showHistogram}
                onToggle={() => setShowHistogram((v) => !v)}
                controls={`${idBase}-hist`}
              >
                <BarChart3 size={15} aria-hidden="true" />
                {isTr ? 'Puan dağılımı' : 'Score distribution'}
              </Disclosure>
              {showHistogram && (
                <div id={`${idBase}-hist`} className="pb-4 pt-2">
                  <BarChart
                    data={histogram}
                    maxValue={Math.max(...histogram.map((h) => h.value), 1)}
                    height={120}
                    accent="#C6F24E"
                    showValues
                  />
                </div>
              )}
            </section>
          )}

          {/* Filtreler: tek satır */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <ChipRadioGroup
              name={`${idBase}-range`}
              label={isTr ? 'Tarih aralığı' : 'Date range'}
              value={range}
              options={rangeOptions}
              onChange={(v) => setRange(v)}
            />
            <div className="relative min-w-[180px] flex-1">
              <Search
                size={14}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]"
              />
              <label htmlFor={`${idBase}-search`} className="sr-only">
                {isTr ? 'Ad veya e-postayla ara' : 'Search by name or email'}
              </label>
              <input
                id={`${idBase}-search`}
                type="search"
                className="bz-input pl-9"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={isTr ? 'Ad veya e-posta ara' : 'Search name or email'}
                enterKeyHint="search"
                autoComplete="off"
              />
            </div>
            {hasPassMark && (
              <div className="w-full sm:w-auto">
                <PulseSelect
                  id={`${idBase}-outcome`}
                  ariaLabel={isTr ? 'Sonuç' : 'Outcome'}
                  className="w-full sm:min-w-[140px]"
                  value={passedFilter}
                  onChange={(v) => setPassedFilter(v as PassedFilter)}
                  options={[
                    { value: 'all', label: isTr ? 'Sonuç: Tümü' : 'Outcome: All' },
                    { value: 'true', label: passLabel },
                    { value: 'false', label: failLabel },
                  ]}
                />
              </div>
            )}
          </div>

          {/* Liste */}
          {rows.length === 0 ? (
            <EmptyState
              icon={<BarChart3 size={20} aria-hidden="true" />}
              title={
                listLoading
                  ? isTr
                    ? 'Yükleniyor…'
                    : 'Loading…'
                  : isTr
                    ? 'Bu filtreyle yanıt yok'
                    : 'No responses for this filter'
              }
              body={
                listLoading
                  ? undefined
                  : isTr
                    ? 'Tarih aralığını genişletmeyi veya aramayı temizlemeyi dene.'
                    : 'Try a wider date range or clear the search.'
              }
              action={
                !listLoading && filtersActive ? (
                  <button type="button" className="bz-btn-ghost min-h-11" onClick={clearFilters}>
                    {isTr ? 'Filtreleri temizle' : 'Clear filters'}
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className={listLoading ? 'opacity-60 transition-opacity' : 'transition-opacity'} aria-busy={listLoading}>
              {/* Masaüstü: tablo */}
              <div className="bz-card hidden overflow-hidden lg:block">
                <div className="overflow-x-auto">
                  <table className="bz-table">
                    <thead>
                      <tr>
                        <th>{isTr ? 'Katılımcı' : 'Respondent'}</th>
                        <th className="text-right">{isTr ? 'Puan' : 'Score'}</th>
                        {hasPassMark && <th>{isTr ? 'Sonuç' : 'Outcome'}</th>}
                        <th>{isTr ? 'Tarih' : 'Date'}</th>
                        <th>
                          <span className="sr-only">{isTr ? 'İncele' : 'Review'}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <Link
                              href={`${base}/${template.id}/responses/${r.id}`}
                              className="text-[14px] text-[#0A0A0A] hover:underline"
                            >
                              {r.respondentName || (isTr ? 'Anonim' : 'Anonymous')}
                            </Link>
                            {r.respondentEmail && (
                              <div className="text-[11px] text-[#737373]">{r.respondentEmail}</div>
                            )}
                          </td>
                          <td className="bz-mono text-right">
                            {r.score !== null ? (
                              <>
                                {r.score}
                                <span className="text-[#A3A3A3]">/100</span>
                              </>
                            ) : (
                              '—'
                            )}
                          </td>
                          {hasPassMark && (
                            <td>
                              {r.passed === true ? (
                                <Badge kind="ok">{passLabel}</Badge>
                              ) : r.passed === false ? (
                                <Badge kind="danger">{failLabel}</Badge>
                              ) : (
                                <span className="text-[#A3A3A3]">—</span>
                              )}
                            </td>
                          )}
                          <td className="text-[12px] text-[#525252]">
                            {formatResponseStamp(r.completedAt ?? r.createdAt, ui)}
                            {r.reviewedAt && (
                              <span className="ml-2 text-[#A3A3A3]">
                                {isTr ? 'İncelendi' : 'Reviewed'}
                              </span>
                            )}
                          </td>
                          <td className="text-right">
                            <Link href={`${base}/${template.id}/responses/${r.id}`} className="bz-btn-ghost">
                              {isTr ? 'İncele' : 'Review'}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobil / tablet: kart listesi */}
              <ul className="space-y-2 lg:hidden">
                {rows.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`${base}/${template.id}/responses/${r.id}`}
                      className="bz-card flex min-h-14 items-center gap-3 px-4 py-3 hover:border-[#A3A3A3]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-[#0A0A0A]">
                          {r.respondentName || (isTr ? 'Anonim' : 'Anonymous')}
                        </span>
                        <span className="block truncate text-[12px] text-[#737373]">
                          {formatResponseStamp(r.completedAt ?? r.createdAt, ui)}
                          {r.reviewedAt && ` · ${isTr ? 'İncelendi' : 'Reviewed'}`}
                        </span>
                      </span>
                      <ScoreChip row={r} hasPassMark={hasPassMark} />
                      <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-[#A3A3A3]" />
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex flex-col items-center gap-2">
                <p className="text-[12px] text-[#737373]" aria-live="polite">
                  {isTr
                    ? `${rows.length} / ${summary.total} yanıt gösteriliyor`
                    : `Showing ${rows.length} of ${summary.total} responses`}
                </p>
                {page.meta.hasMore && (
                  <button
                    type="button"
                    className="bz-btn-ghost min-h-11"
                    onClick={() => {
                      if (!loadingMore) loadMore();
                    }}
                    aria-disabled={loadingMore}
                  >
                    {loadingMore && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                    {isTr ? 'Daha fazla göster' : 'Show more'}
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {shareOpen && (
        <ShareLinksModal
          locale={ui}
          restaurantId={template.restaurantId}
          templateId={template.id}
          title={template.title}
          kind={template.kind}
          isPublished={template.isPublished}
          questionCount={questionCount}
          appUrl={appUrl}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}

function SummaryTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bz-card min-w-0 px-3 py-3 sm:p-4">
      <div className="truncate text-[10px] font-medium uppercase tracking-[0.08em] text-[#525252] sm:text-[11px] sm:tracking-[0.14em]">
        {label}
      </div>
      <div className="bz-h-tight mt-1 text-[22px] leading-none sm:text-[26px]">{children}</div>
    </div>
  );
}

function ScoreChip({ row, hasPassMark }: { row: AuditResponseListRow; hasPassMark: boolean }) {
  if (row.score === null) {
    return <span className="shrink-0 text-[13px] text-[#A3A3A3]">—</span>;
  }
  const kind = hasPassMark ? (row.passed === true ? 'ok' : row.passed === false ? 'danger' : 'ghost') : 'ghost';
  return (
    <Badge kind={kind} dot={false} className="shrink-0">
      <span className="bz-mono">{row.score}/100</span>
    </Badge>
  );
}
