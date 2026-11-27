'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  User as UserIcon,
} from 'lucide-react';
import {
  AlertBanner,
  Badge,
  type BadgeKind,
  EmptyState,
  PageHeader,
  PulseSelect,
} from '@/components/ui';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import { actionLabel } from '@/lib/audit-log-labels';
import { resolveDisplayTimeZone } from '@/lib/timezone';

// Stage A3 §38.95 — admin audit log viewer page.
// Filter toolbar (useUrlFilter §36) + paginated table + CSV export +
// retention disclosure banner.

interface AuditEntry {
  id: string;
  actorId: string;
  actorSource: 'admin' | 'user';
  actor: {
    id: string;
    label: string;
    email: string | null;
    role: string | null;
  } | null;
  action: string;
  targetId: string | null;
  payload: unknown;
  createdAt: string;
}

interface ApiResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  windowStart: string;
  windowEnd: string;
  data: AuditEntry[];
}

type SourceFilter = 'all' | 'admin' | 'user';
type RangeFilter = '7d' | '30d' | '90d';

const SOURCE_BADGE: Record<string, { label: string; kind: BadgeKind }> = {
  admin: { label: 'Yönetici', kind: 'info' },
  user: { label: 'İşletme sahibi', kind: 'ok' },
  cron: { label: 'Otomatik görev', kind: 'ghost' },
};

function describeAction(action: string): string {
  return actionLabel(action, 'tr');
}

// §46 — render in the business display timezone, not the device timezone.
const DATE_FORMAT = new Intl.DateTimeFormat('tr-TR', {
  timeZone: resolveDisplayTimeZone(),
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function dateLabel(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : DATE_FORMAT.format(d);
}

export default function AdminAuditLogsPage() {
  const filters = useUrlFilter({
    range: '30d' as RangeFilter,
    actorSource: 'all' as SourceFilter,
    action: '',
    actorId: '',
    // Deep links (restaurant detail "İşlem kaydı", campaign approvals) pass
    // ?targetId=…; the API supported it but the page dropped it, so those
    // links showed the unfiltered global log.
    targetId: '',
    page: 1,
  });
  const range = filters.values.range;
  const setRange = (v: RangeFilter) => filters.set('range', v);
  const actorSource = filters.values.actorSource;
  const setActorSource = (v: SourceFilter) => filters.set('actorSource', v);
  const actionFilter = filters.values.action;
  const [actionInput, setActionInput] = useState(actionFilter);
  const setActionDebounced = (v: string) => filters.set('action', v);
  const actorIdFilter = filters.values.actorId;
  const setActorId = (v: string) => filters.set('actorId', v);
  const targetIdFilter = filters.values.targetId;
  const setTargetId = (v: string) => filters.set('targetId', v);
  const page = filters.values.page;
  const setPage = (v: number) => filters.set('page', v);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Debounce action search.
  useEffect(() => {
    const t = setTimeout(() => setActionDebounced(actionInput.trim()), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionInput]);

  // Reset to page 1 on filter change.
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, actorSource, actionFilter, actorIdFilter, targetIdFilter]);

  const buildQuery = useCallback(
    (overrides: Partial<{ page: number }> = {}) => {
      const q = new URLSearchParams();
      q.set('range', range);
      if (actorSource !== 'all') q.set('actorSource', actorSource);
      if (actionFilter) q.set('action', actionFilter);
      if (actorIdFilter) q.set('actorId', actorIdFilter);
      if (targetIdFilter) q.set('targetId', targetIdFilter);
      q.set('page', String(overrides.page ?? page));
      q.set('limit', '50');
      return q;
    },
    [range, actorSource, actionFilter, actorIdFilter, targetIdFilter, page],
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/audit-logs?${buildQuery().toString()}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (res.status === 403) setError('Denetim kayıtlarını görme yetkin yok.');
        else setError(j.error || 'Yükleme başarısız.');
        return;
      }
      setData(await res.json());
    } catch {
      setError('Bağlantı hatası.');
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const downloadCsv = async () => {
    setExporting(true);
    setError(null);
    try {
      const q = buildQuery();
      q.delete('page');
      q.delete('limit');
      const res = await fetch(`/api/admin/audit-logs/export?${q.toString()}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (res.status === 429) {
          const retry = j.retryAfter ?? 60;
          setError(`Çok sık indiriyorsun. ${retry} sn sonra tekrar dene.`);
        } else if (res.status === 403) {
          setError('Denetim kayıtlarını görme yetkin yok.');
        } else {
          setError(j.error || 'CSV indirilemedi.');
        }
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError('Bağlantı hatası.');
    } finally {
      setExporting(false);
    }
  };

  const totalPages = data?.totalPages ?? 1;
  const rows = data?.data ?? [];

  const pagination = useMemo(() => {
    if (totalPages <= 1) return null;
    const items: Array<number | '…'> = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) items.push(i);
    } else {
      items.push(1);
      if (page > 3) items.push('…');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        items.push(i);
      }
      if (page < totalPages - 2) items.push('…');
      items.push(totalPages);
    }
    return items;
  }, [page, totalPages]);

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow="SUPERADMIN · DENETİM KAYITLARI"
        eyebrowColor="#5D3EBC"
        title="Denetim kayıtları"
        description="Paneldeki tüm işlemlerin zaman damgalı kaydı. IP adresi tutulmaz, e-posta ve telefon gizlenir. Filtrele, ayrıntıyı aç, CSV olarak indir."
        actions={
          <>
            <button onClick={fetchData} disabled={loading} className="bz-btn-ghost">
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} strokeWidth={2} />
              )}
              Yenile
            </button>
            <button
              onClick={downloadCsv}
              disabled={exporting || (data?.total ?? 0) === 0}
              className="bz-btn-primary"
            >
              {exporting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} strokeWidth={2} />
              )}
              CSV İndir
            </button>
          </>
        }
      />

      {/* KVKK retention disclosure (CLAUDE.md §13.9) */}
      <AlertBanner kind="info">
        <div className="flex items-start gap-2">
          <Clock size={14} strokeWidth={2} className="shrink-0 mt-0.5" />
          <div>
            <strong>Veri saklama (KVKK):</strong>{' '}
            Denetim kayıtları hesap güvenliği ve olası KVKK incelemeleri için 2 yıl saklanır.
            E-posta ve telefon gibi kişisel veriler bu ekranda otomatik olarak gizlenir.
          </div>
        </div>
      </AlertBanner>

      {error && (
        <AlertBanner kind="danger" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      )}

      {/* Filter toolbar */}
      <div className="bz-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-[20px] border border-pn-line bg-white p-1 text-[13px] font-medium">
            {(['7d', '30d', '90d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-[14px] px-3 py-1.5 transition-all ${
                  range === r
                    ? 'bg-pn-accent text-white '
                    : 'text-pn-ink-2 hover:text-pn-ink'
                }`}
              >
                {r === '7d' ? 'Son 7 gün' : r === '30d' ? 'Son 30 gün' : 'Son 90 gün'}
              </button>
            ))}
          </div>

          <PulseSelect
            value={actorSource}
            onChange={(v) => setActorSource(v as SourceFilter)}
            options={[
              { value: 'all', label: 'Tüm aktörler' },
              { value: 'admin', label: 'Yöneticiler' },
              { value: 'user', label: 'İşletme sahipleri' },
            ]}
            ariaLabel="Aktör kaynağı"
            className="min-w-[160px]"
          />

          <div className="relative w-full flex-1 sm:w-auto sm:min-w-[200px]">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
              strokeWidth={2}
            />
            <input
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value)}
              placeholder="Aksiyon ara (örn. user.delete, permission.grant)"
              aria-label="Aksiyon ara"
              className="bz-input w-full pl-9"
            />
          </div>

          {actorIdFilter && (
            <button
              onClick={() => setActorId('')}
              className="inline-flex items-center gap-1 rounded-full border border-pn-line bg-white px-3 py-1.5 text-[12px] font-medium text-[#525252]"
            >
              <UserIcon size={12} strokeWidth={2} />
              Aktör: {actorIdFilter.slice(0, 12)}…
              <span className="text-[#A3A3A3]">×</span>
            </button>
          )}
          {targetIdFilter && (
            <button
              onClick={() => setTargetId('')}
              className="inline-flex items-center gap-1 rounded-full border border-pn-line bg-white px-3 py-1.5 text-[12px] font-medium text-[#525252]"
            >
              Hedef: {targetIdFilter.slice(0, 12)}…
              <span className="text-[#A3A3A3]">×</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bz-card overflow-hidden p-0">
        {loading && !data ? (
          <div className="flex items-center justify-center p-16">
            <Loader2 size={22} className="animate-spin text-pn-ink" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Shield size={20} strokeWidth={2} />}
            title="Kayıt bulunamadı"
            body="Filtreyi gevşetmeyi veya tarih aralığını genişletmeyi deneyin."
          />
        ) : (
          <>
            {/* Mobile card list */}
            <div className="flex flex-col gap-2.5 p-3 lg:hidden">
              {rows.map((entry) => {
                const isExpanded = expandedRow === entry.id;
                const sourceMeta =
                  SOURCE_BADGE[entry.actorSource] || {
                    label: entry.actorSource,
                    kind: 'ghost' as BadgeKind,
                  };
                return (
                  <div key={entry.id} className="bz-card p-3.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-medium text-pn-ink truncate">
                        {entry.actor?.label || entry.actorId}
                      </span>
                      <Badge kind={sourceMeta.kind}>{sourceMeta.label}</Badge>
                    </div>
                    {entry.actor?.email && (
                      <div className="mt-0.5 text-[12px] text-[#737373] font-mono truncate">
                        {entry.actor.email}
                      </div>
                    )}
                    <div className="mt-2 text-[12px] font-medium text-pn-ink">
                      {describeAction(entry.action)}
                    </div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap text-[12px] text-[#737373]">
                      <span className="font-mono text-[#A3A3A3]">{entry.action}</span>
                      <span className="text-[#A3A3A3]">·</span>
                      <span className="tabular-nums">{dateLabel(entry.createdAt)}</span>
                      {entry.targetId && (
                        <>
                          <span className="text-[#A3A3A3]">·</span>
                          <span className="font-mono truncate max-w-[140px]">
                            {entry.targetId}
                          </span>
                        </>
                      )}
                    </div>
                    {entry.payload != null && (
                      <button
                        type="button"
                        onClick={() => setExpandedRow(isExpanded ? null : entry.id)}
                        aria-expanded={isExpanded}
                        className="mt-2 text-[12px] text-[#525252] hover:text-pn-ink underline"
                      >
                        {isExpanded ? 'Ayrıntıyı gizle' : 'Ayrıntıyı göster'}
                      </button>
                    )}
                    {isExpanded && entry.payload != null && (
                      <pre
                        className="mt-2 overflow-x-auto rounded-[14px] border border-pn-line bg-pn-canvas p-3 text-[12px] text-[#262626]"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {JSON.stringify(entry.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="overflow-x-auto hidden lg:block">
              <table className="w-full text-left text-[13px]" style={{ minWidth: 900 }}>
                <thead className="bg-pn-canvas border-b border-pn-line">
                  <tr className="text-[13px] font-medium text-[#737373]">
                    <th className="px-4 py-3" style={{ width: 160 }}>
                      Tarih
                    </th>
                    <th className="px-4 py-3">Aktör</th>
                    <th className="px-4 py-3" style={{ width: 110 }}>
                      Kaynak
                    </th>
                    <th className="px-4 py-3">Aksiyon</th>
                    <th className="px-4 py-3" style={{ width: 140 }}>
                      Hedef
                    </th>
                    <th className="px-4 py-3 text-right" style={{ width: 100 }}>
                      Ayrıntı
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pn-line">
                  {rows.map((entry) => {
                    const isExpanded = expandedRow === entry.id;
                    const sourceMeta =
                      SOURCE_BADGE[entry.actorSource] || { label: entry.actorSource, kind: 'ghost' as BadgeKind };
                    return (
                      <Fragment key={entry.id}>
                        <tr className="hover:bg-pn-canvas/60">
                          <td className="px-4 py-3 text-[12px] text-[#525252] tabular-nums">
                            {dateLabel(entry.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[13px] font-medium text-pn-ink">
                                {entry.actor?.label || entry.actorId}
                              </span>
                              {entry.actor?.email && (
                                <span className="text-[12px] text-[#737373] font-mono truncate max-w-[200px]">
                                  {entry.actor.email}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge kind={sourceMeta.kind}>{sourceMeta.label}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[13px] font-medium text-pn-ink">
                                {describeAction(entry.action)}
                              </span>
                              <span className="text-[12px] text-[#A3A3A3] font-mono">
                                {entry.action}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {entry.targetId ? (
                              <span className="text-[12px] font-mono text-[#525252] truncate max-w-[120px] block">
                                {entry.targetId}
                              </span>
                            ) : (
                              <span className="text-[12px] text-[#A3A3A3]">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {entry.payload != null ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedRow(isExpanded ? null : entry.id)
                                }
                                aria-expanded={isExpanded}
                                className="text-[12px] text-[#525252] hover:text-pn-ink underline"
                              >
                                {isExpanded ? 'Gizle' : 'Göster'}
                              </button>
                            ) : (
                              <span className="text-[12px] text-[#A3A3A3]">—</span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && entry.payload != null && (
                          <tr className="bg-pn-canvas/40">
                            <td colSpan={6} className="px-4 py-3">
                              <pre
                                className="overflow-x-auto rounded-[14px] bg-white p-3 text-[12px] text-[#262626] border border-pn-line"
                                style={{ fontFamily: 'var(--font-mono)' }}
                              >
                                {JSON.stringify(entry.payload, null, 2)}
                              </pre>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {pagination && (
              <div className="flex flex-col items-start gap-3 border-t border-pn-line bg-pn-canvas px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[13px] font-medium text-[#6B7280]">
                  Sayfa {data?.page ?? 1} / {totalPages} · Toplam {data?.total ?? 0}
                </p>
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1 || loading}
                    className="rounded-[14px] border border-pn-line bg-white p-2 hover:bg-pn-canvas disabled:opacity-40"
                    aria-label="Önceki sayfa"
                  >
                    <ChevronLeft size={14} strokeWidth={2} />
                  </button>
                  {pagination.map((p, i) =>
                    p === '…' ? (
                      <span key={`gap-${i}`} className="px-2 text-[12px] text-[#737373]">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        disabled={loading}
                        className={`min-w-[32px] rounded-[14px] px-2 py-1.5 text-[12px] font-medium ${
                          p === page
                            ? 'bg-pn-accent text-white'
                            : 'border border-pn-line bg-white text-pn-ink-2 hover:bg-pn-canvas'
                        }`}
                      >
                        {p}
                      </button>
                    ),
                  )}
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages || loading}
                    className="rounded-[14px] border border-pn-line bg-white p-2 hover:bg-pn-canvas disabled:opacity-40"
                    aria-label="Sonraki sayfa"
                  >
                    <ChevronRight size={14} strokeWidth={2} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
