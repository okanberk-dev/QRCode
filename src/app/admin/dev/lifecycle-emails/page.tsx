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
  | 'upgrade_suggestion'
  | 'inactive_reactivation';

const TYPE_LABEL: Record<LifecycleType, string> = {
  qr_not_downloaded: 'QR İndirilmedi',
  first_feedback_tips: 'İlk Yorum Tipleri',
  upgrade_suggestion: 'Plan Yükseltme',
  inactive_reactivation: 'Tekrar Canlandırma',
};

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
  sent: Record<LifecycleType, number>;
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
      if (!res.ok) throw new Error('Loglar yüklenemedi');
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
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Trigger başarısız');
      setTriggerResult(body as TriggerSummary);
      // Logs reload — yeni gönderimler görünür
      await loadLogs();
    } catch (e) {
      setTriggerError((e as Error).message);
    } finally {
      setTriggering(false);
    }
  };

  const totalSentInTrigger = triggerResult
    ? triggerResult.sent.qr_not_downloaded +
      triggerResult.sent.first_feedback_tips +
      triggerResult.sent.upgrade_suggestion +
      triggerResult.sent.inactive_reactivation
    : 0;

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 space-y-6">
      <PageHeader
        eyebrow="LIFECYCLE EMAIL"
        title="Yaşam Döngüsü Mailleri"
        description="Cron schedule (her gün 08:00 UTC) elle tetikle + gönderim geçmişi."
      />

      {/* Trigger Now */}
      <section className="bz-card p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 min-w-0">
            <Eyebrow className="mb-1.5">CRON TETİKLEME</Eyebrow>
            <h2 className="bz-h-tight text-[16px]">Tüm aktif kullanıcılar için 4 kuralı şimdi çalıştır</h2>
            <p className="text-[12px] text-[#737373] mt-1">
              `runLifecycleEmails()` doğrudan çağrılır. Idempotent — cooldown uygulanan kayıtlar atlanır.
              Rate limit: 5/dk.
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
          <div className="mt-4 rounded-xl border border-[#A8D62E] bg-[#EAF9B8]/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Send size={14} className="text-[#0A0A0A]" />
              <span className="bz-h-tight text-[14px]">Çalışma sonucu</span>
              <Badge kind="lime">{`${triggerResult.durationMs}ms`}</Badge>
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
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              {(Object.entries(triggerResult.sent) as Array<[LifecycleType, number]>).map(([k, v]) => (
                <div key={k} className="rounded-lg bg-white border border-[#EDEDED] px-2 py-1.5">
                  <div className="text-[#737373]">{TYPE_LABEL[k]}</div>
                  <div className="bz-h-tight text-[12.5px]">{v}</div>
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
        <div className="rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-4">
          <Eyebrow className="mb-2">SON 30 GÜN — TÜR DAĞILIMI</Eyebrow>
          <div className="space-y-1 text-[11.5px]">
            {(['qr_not_downloaded', 'first_feedback_tips', 'upgrade_suggestion', 'inactive_reactivation'] as LifecycleType[]).map(
              (t) => (
                <div key={t} className="flex justify-between">
                  <span className="text-[#525252]">{TYPE_LABEL[t]}</span>
                  <span className="bz-mono text-[#0A0A0A]">{data?.stats.byType[t] ?? 0}</span>
                </div>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Filters + Logs */}
      <section className="bz-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="bz-h-tight text-[15px]">Son gönderimler</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bz-input"
              style={{ minWidth: 160 }}
              aria-label="Mail türü filtresi"
            >
              <option value="">Tüm türler</option>
              <option value="qr_not_downloaded">{TYPE_LABEL.qr_not_downloaded}</option>
              <option value="first_feedback_tips">{TYPE_LABEL.first_feedback_tips}</option>
              <option value="upgrade_suggestion">{TYPE_LABEL.upgrade_suggestion}</option>
              <option value="inactive_reactivation">{TYPE_LABEL.inactive_reactivation}</option>
            </select>
            <select
              value={filterDays}
              onChange={(e) => setFilterDays(Number(e.target.value))}
              className="bz-input"
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
          <div className="rounded-2xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-6 text-center text-[13px] text-[#737373]">
            {loading ? 'Yükleniyor…' : 'Bu aralıkta gönderim yok.'}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 sm:mx-0">
            <table className="bz-table w-full text-[12.5px]">
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
                  const t = log.type as LifecycleType;
                  return (
                    <tr key={log.id}>
                      <td>
                        <Badge kind="ghost">{TYPE_LABEL[t] ?? log.type}</Badge>
                      </td>
                      <td>
                        {log.user ? (
                          <div className="flex flex-col">
                            <span className="bz-h-tight">{log.user.name ?? log.user.email.split('@')[0]}</span>
                            <span className="text-[11px] text-[#737373] truncate max-w-[220px]">
                              {log.user.email}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#737373]">—</span>
                        )}
                      </td>
                      <td>
                        {log.restaurant ? (
                          <span className="text-[#0A0A0A]">{log.restaurant.name}</span>
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
