'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, RefreshCw, Send, Zap, Mail, Clock } from 'lucide-react';
import { AlertBanner, Badge, Eyebrow, PageHeader, StatCard } from '@/components/ui';

// Admin lifecycle email trigger + log viewer (CLAUDE.md §21.37 + §23.7
// Phase 11.31). Superadmin elle cron'u tetikleyebilir + son 50 gönderimi
// görür. Cron'un kendisi günlük çalışır (`0 8 * * *` UTC); bu sayfa
// üretim'de debug + monitoring için.

type LifecycleType =
  | 'qr_not_downloaded'
  | 'first_feedback_tips'
  | 'upgrade_suggestion';

const TYPE_LABEL: Record<LifecycleType, string> = {
  qr_not_downloaded: 'QR İndirilmedi',
  first_feedback_tips: 'İlk Yorum Tipleri',
  upgrade_suggestion: 'Plan Yükseltme',
};

// The log table also carries the types written by other crons, plus types
// retired in 2026-11 (CLAUDE.md §21.39) that still sit in older log rows.
const ALL_TYPE_LABEL: Record<string, string> = {
  ...TYPE_LABEL,
  monthly_health_report: 'Aylık Sağlık Raporu',
  rating_drop_alert: 'Puan Düşüşü Uyarısı',
  inactive_reactivation: 'Tekrar Canlandırma (kaldırıldı)',
  first_feedback_celebration: 'İlk Yorum Kutlaması (kaldırıldı)',
  qr_no_scans_reminder: 'QR Taranmıyor (kaldırıldı)',
  first_reply_celebration: 'İlk Yanıt Kutlaması (kaldırıldı)',
};

function typeLabel(type: string): string {
  return ALL_TYPE_LABEL[type] ?? type;
}

interface LogEntry {
  id: string;
  type: string;
  sentAt: string;
  user: { id: string; name: string | null; email: string } | null;
  restaurant: { id: string; name: string } | null;
  metadata: unknown;
}

interface LogsResponse {
  stats: {
    sent7d: number;
    sent30d: number;
    byType: Record<string, number>;
    total: number;
  };
  logs: LogEntry[];
  range: { type: string | null; days: number; windowStart: string; windowEnd: string };
}

interface TriggerSummary {
  usersChecked: number;
  contextsProcessed: number;
  sent: Record<string, number>;
  skipped: number;
  failures: number;
  durationMs: number;
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

export default function LifecycleEmailsAdmin() {
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('');
  const [filterDays, setFilterDays] = useState<number>(30);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<TriggerSummary | null>(null);
  const [triggerError, setTriggerError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterType) params.set('type', filterType);
      params.set('days', String(filterDays));
      const res = await fetch(`/api/admin/lifecycle-emails/logs?${params.toString()}`);
      if (!res.ok) throw new Error('Gönderim geçmişi yüklenemedi.');
      const body = (await res.json()) as LogsResponse;
      setData(body);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterDays]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleTrigger = async () => {
    if (triggering) return;
    setTriggering(true);
    setTriggerError(null);
    setTriggerResult(null);
    try {
      const res = await fetch('/api/admin/lifecycle-emails/trigger', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          res.status === 429
            ? 'Çok sık çalıştırıldı. Bir dakika sonra tekrar dene.'
            : body.error || 'Çalıştırılamadı.',
        );
      }
      setTriggerResult(body as TriggerSummary);
      // Logs reload — yeni gönderimler görünür
      await loadLogs();
    } catch (e) {
      setTriggerError(e instanceof Error && e.message ? e.message : 'Bağlantı hatası.');
    } finally {
      setTriggering(false);
    }
  };

  const totalSentInTrigger = triggerResult
    ? Object.values(triggerResult.sent).reduce((sum, n) => sum + (Number(n) || 0), 0)
    : 0;

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8 space-y-6">
      <PageHeader
        eyebrow="YAŞAM DÖNGÜSÜ"
        title="Yaşam Döngüsü Mailleri"
        description="Hatırlatma e-postaları her gün 11:00'de (TSİ) otomatik gönderilir. Buradan elle çalıştırabilir ve son gönderimleri görebilirsin."
      />

      {/* Trigger Now */}
      <section className="bz-card p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 min-w-0">
            <Eyebrow className="mb-1.5">ELLE ÇALIŞTIR</Eyebrow>
            <h2 className="bz-h-tight text-[16px]">Tüm aktif kullanıcılar için 4 kuralı şimdi çalıştır</h2>
            <p className="text-[12px] text-[#737373] mt-1">
              Daha önce gönderilmiş ve bekleme süresi dolmamış e-postalar tekrar gönderilmez.
              Dakikada en fazla 5 kez çalıştırılabilir.
            </p>
          </div>
          <button
            type="button"
            onClick={handleTrigger}
            disabled={triggering}
            className="bz-btn-primary shrink-0 inline-flex items-center justify-center gap-2 rounded-full"
            style={{ minHeight: 44, padding: '0 20px' }}
          >
            {triggering ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            {triggering ? 'Çalışıyor…' : 'Şimdi tetikle'}
          </button>
        </div>

        {triggerError && (
          <div className="mt-4">
            <AlertBanner kind="danger">{triggerError}</AlertBanner>
          </div>
        )}

        {triggerResult && (
          <div className="mt-4 rounded-[20px] border border-pn-accent-hover bg-pn-accent-soft/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Send size={14} className="text-pn-ink" />
              <span className="bz-h-tight text-[14px]">Çalışma sonucu</span>
              <Badge kind="lime">{`${(triggerResult.durationMs / 1000).toFixed(1)} sn`}</Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[12px]">
              <div>
                <div className="text-[#525252]">Kullanıcı</div>
                <div className="bz-h-tight">{triggerResult.usersChecked}</div>
              </div>
              <div>
                <div className="text-[#525252]">Gönderildi</div>
                <div className="bz-h-tight text-[#166534]">{totalSentInTrigger}</div>
              </div>
              <div>
                <div className="text-[#525252]">Atlandı</div>
                <div className="bz-h-tight">{triggerResult.skipped}</div>
              </div>
              <div>
                <div className="text-[#525252]">Hata</div>
                <div className={`bz-h-tight ${triggerResult.failures > 0 ? 'text-[#991B1B]' : ''}`}>
                  {triggerResult.failures}
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[12px]">
              {Object.entries(triggerResult.sent).map(([k, v]) => (
                <div key={k} className="rounded-[14px] bg-white border border-pn-line px-2 py-1.5">
                  <div className="text-[#737373]">{typeLabel(k)}</div>
                  <div className="bz-h-tight text-[13px]">{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label="Son 7 gün"
          value={data?.stats.sent7d?.toLocaleString('tr-TR') ?? '—'}
          icon={<Clock size={14} />}
        />
        <StatCard
          label="Son 30 gün"
          value={data?.stats.sent30d?.toLocaleString('tr-TR') ?? '—'}
          icon={<Mail size={14} />}
        />
        <StatCard
          label="Toplam (tüm zamanlar)"
          value={data?.stats.total?.toLocaleString('tr-TR') ?? '—'}
          icon={<Send size={14} />}
        />
        <div className="rounded-[24px] border border-pn-line bg-pn-canvas p-4">
          <Eyebrow className="mb-2">SON 30 GÜN — TÜR DAĞILIMI</Eyebrow>
          <div className="space-y-1 text-[12px]">
            {/* The four cron types always show; the other types only when
                they were sent in the window, so the card keeps its height. */}
            {Object.keys(ALL_TYPE_LABEL)
              .filter((t) => t in TYPE_LABEL || (data?.stats.byType[t] ?? 0) > 0)
              .map((t) => (
                <div key={t} className="flex justify-between">
                  <span className="text-[#525252]">{typeLabel(t)}</span>
                  <span className="tabular-nums text-pn-ink">{data?.stats.byType[t] ?? 0}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Filters + Logs */}
      <section className="bz-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="bz-h-tight text-[15px]">Son gönderimler</h2>
          {/* .bz-input is width:100%; without w-auto each select took a full
              row, stacking the filters vertically next to the title. */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bz-input w-full sm:w-auto"
              style={{ minWidth: 160 }}
              aria-label="Mail türü filtresi"
            >
              <option value="">Tüm türler</option>
              {Object.entries(ALL_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select
              value={filterDays}
              onChange={(e) => setFilterDays(Number(e.target.value))}
              className="bz-input w-full sm:w-auto"
              style={{ minWidth: 100 }}
              aria-label="Tarih aralığı"
            >
              <option value={7}>7 gün</option>
              <option value={30}>30 gün</option>
              <option value={90}>90 gün</option>
            </select>
            <button
              type="button"
              onClick={loadLogs}
              disabled={loading}
              className="bz-btn-icon"
              aria-label="Yenile"
              title="Yenile"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            </button>
          </div>
        </div>

        {error && <AlertBanner kind="danger">{error}</AlertBanner>}

        {!data || data.logs.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-pn-line bg-pn-canvas p-6 text-center text-[13px] text-[#737373]">
            {loading ? 'Yükleniyor…' : 'Bu aralıkta gönderim yok.'}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 sm:mx-0">
            <table className="bz-table w-full text-[13px]">
              <thead>
                <tr>
                  <th className="text-left">Tür</th>
                  <th className="text-left">Kullanıcı</th>
                  <th className="text-left">İşletme</th>
                  <th className="text-left">Zaman</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map((log) => {
                  return (
                    <tr key={log.id}>
                      <td>
                        <Badge kind="ghost">{typeLabel(log.type)}</Badge>
                      </td>
                      <td>
                        {log.user ? (
                          <div className="flex flex-col">
                            <span className="bz-h-tight">{log.user.name ?? log.user.email.split('@')[0]}</span>
                            <span className="text-[12px] text-[#737373] truncate max-w-[220px]">
                              {log.user.email}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#737373]">—</span>
                        )}
                      </td>
                      <td>
                        {log.restaurant ? (
                          <span className="text-pn-ink">{log.restaurant.name}</span>
                        ) : (
                          <span className="text-[#737373]">—</span>
                        )}
                      </td>
                      <td>
                        <span className="text-[#525252]">{relTime(log.sentAt)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
