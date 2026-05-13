'use client';

// CLAUDE.md §42 — Admin Denetim Merkezi istatistik dashboard'u.
//
// 4 panel (kullanıcı seçimi):
//   1. Sistem KPI (4 StatCard): toplam taslak / yayında / yanıt / ortalama puan
//   2. Sektör başına breakdown (Tablo): 6 sektör × (template count / response
//      count / avgScore)
//   3. En popüler 5 taslak (Tablo): title + sector badge + responseCount + avgScore
//   4. Per-restoran rakamlar (Tablo): name + responseCount + avgScore + son
//      yanıt tarihi (Top 10)

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import {
  AlertBanner,
  Badge,
  type BadgeKind,
  EmptyState,
  PageHeader,
  StatCard,
  CardSkeleton,
  TableSkeleton,
} from '@/components/ui';
import { AUDIT_SECTORS, type AuditSector } from '@/lib/audits/types';

const SECTOR_LABEL: Record<AuditSector, string> = {
  food: 'Yeme & İçme',
  hotel: 'Konaklama',
  retail: 'Perakende',
  health: 'Sağlık',
  beauty: 'Güzellik',
  other: 'Diğer',
};

const SECTOR_BADGE: Record<AuditSector, BadgeKind> = {
  food: 'lime',
  hotel: 'info',
  retail: 'warn',
  health: 'ok',
  beauty: 'ghost',
  other: 'ghost',
};

interface StatsData {
  totals: {
    totalTemplates: number;
    publishedTemplates: number;
    draftTemplates: number;
    completedResponses: number;
    avgScore: number | null;
  };
  sectorBreakdown: Array<{
    sector: AuditSector;
    templates: number;
    responses: number;
    avgScore: number | null;
  }>;
  topTemplates: Array<{
    id: string;
    title: string;
    sector: AuditSector;
    responseCount: number;
    avgScore: number | null;
    isPublished: boolean;
  }>;
  perRestaurant: Array<{
    restaurantId: string;
    name: string;
    responseCount: number;
    avgScore: number | null;
    latestResponseAt: string | null;
  }>;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function fmtScore(value: number | null): string {
  if (value == null) return '—';
  return `${value.toFixed(1)}`;
}

export default function AuditStatsPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/audits/stats', { cache: 'no-store' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || 'İstatistikler yüklenemedi');
        return;
      }
      const json = await res.json();
      setData(json.data);
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow="SUPERADMIN · DENETİM MERKEZİ"
        eyebrowColor="#C6F24E"
        title="İstatistikler"
        description="Sistem genelinde denetim kullanımı: sektör başına şablon + yanıt dağılımı, en popüler şablonlar, en aktif işletmeler."
        actions={
          <div className="flex gap-2">
            <Link href="/admin/audits/templates" className="bz-btn-ghost">
              <ArrowLeft size={14} /> Şablonlar
            </Link>
            <button
              type="button"
              className="bz-btn-ghost"
              onClick={() => load(true)}
              disabled={refreshing || loading}
            >
              {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Yenile
            </button>
          </div>
        }
      />

      {error && <AlertBanner kind="danger" onDismiss={() => setError(null)}>{error}</AlertBanner>}

      {/* Sistem KPI grid */}
      {loading && !data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Toplam şablon"
            value={data.totals.totalTemplates}
            delta={`${data.totals.draftTemplates} taslak`}
            deltaKind="neutral"
          />
          <StatCard
            label="Yayında"
            value={data.totals.publishedTemplates}
            accent="#C6F24E"
          />
          <StatCard
            label="Tamamlanan yanıt"
            value={data.totals.completedResponses}
          />
          <StatCard
            label="Ortalama puan"
            value={data.totals.avgScore != null ? `${data.totals.avgScore.toFixed(1)}` : '—'}
            deltaSuffix="100 üzerinden"
          />
        </div>
      ) : null}

      {/* Sistem boş hint — şablon yokken operatöre seed yolunu göster */}
      {data && data.totals.totalTemplates === 0 ? (
        <div className="bz-card-soft p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 text-[13px] text-[#525252] leading-relaxed">
            <strong className="text-[#0A0A0A]">Sistem boş.</strong> Henüz şablon veya yanıt yok.
            6 sektör için hazır 18 kategori + 25 şablon + ~120 soru ile başlamak için{' '}
            <em>“Varsayılan içeriği yükle”</em> butonuna git.
          </div>
          <Link href="/admin/audits/templates" className="bz-btn-primary shrink-0">
            <Sparkles size={14} /> Şablonlara git
          </Link>
        </div>
      ) : null}

      {/* Sektör başına breakdown */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} strokeWidth={2} className="text-[#525252]" />
          <h2 className="bz-h-tight text-[15px]">Sektör başına dağılım</h2>
        </div>
        {loading && !data ? (
          <TableSkeleton rows={6} cols={4} />
        ) : data ? (
          <div className="bz-card overflow-hidden">
            <table className="bz-table">
              <thead>
                <tr>
                  <th>Sektör</th>
                  <th className="text-right">Şablon</th>
                  <th className="text-right">Yanıt</th>
                  <th className="text-right">Ort. Puan</th>
                </tr>
              </thead>
              <tbody>
                {AUDIT_SECTORS.map((sec) => {
                  const row = data.sectorBreakdown.find((r) => r.sector === sec);
                  const templates = row?.templates ?? 0;
                  const responses = row?.responses ?? 0;
                  const avgScore = row?.avgScore ?? null;
                  return (
                    <tr key={sec}>
                      <td>
                        <Badge kind={SECTOR_BADGE[sec]}>{SECTOR_LABEL[sec]}</Badge>
                      </td>
                      <td className="text-right bz-mono">{templates}</td>
                      <td className="text-right bz-mono">{responses}</td>
                      <td className="text-right bz-mono">{fmtScore(avgScore)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {/* En popüler 5 taslak */}
      <section className="space-y-2">
        <h2 className="bz-h-tight text-[15px]">En popüler şablonlar</h2>
        {loading && !data ? (
          <TableSkeleton rows={5} cols={4} />
        ) : !data || data.topTemplates.length === 0 ? (
          <EmptyState
            title="Yanıt yok"
            body="Henüz tamamlanmış denetim yanıtı yok."
          />
        ) : (
          <div className="bz-card overflow-hidden">
            <table className="bz-table">
              <thead>
                <tr>
                  <th>Başlık</th>
                  <th>Sektör</th>
                  <th>Durum</th>
                  <th className="text-right">Yanıt</th>
                  <th className="text-right">Ort. Puan</th>
                  <th className="text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {data.topTemplates.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div className="bz-h-tight text-[14px]">{t.title}</div>
                    </td>
                    <td>
                      <Badge kind={SECTOR_BADGE[t.sector]}>{SECTOR_LABEL[t.sector]}</Badge>
                    </td>
                    <td>
                      {t.isPublished ? (
                        <Badge kind="ok">Yayında</Badge>
                      ) : (
                        <Badge kind="ghost">Taslak</Badge>
                      )}
                    </td>
                    <td className="text-right bz-mono">{t.responseCount}</td>
                    <td className="text-right bz-mono">{fmtScore(t.avgScore)}</td>
                    <td className="text-right">
                      <Link
                        href={`/admin/audits/templates/${t.id}`}
                        className="bz-btn-ghost"
                      >
                        Düzenle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Per-restoran */}
      <section className="space-y-2">
        <h2 className="bz-h-tight text-[15px]">En aktif işletmeler</h2>
        {loading && !data ? (
          <TableSkeleton rows={5} cols={4} />
        ) : !data || data.perRestaurant.length === 0 ? (
          <EmptyState
            title="İşletme yanıtı yok"
            body="Henüz yanıt veren işletme yok."
          />
        ) : (
          <div className="bz-card overflow-hidden">
            <table className="bz-table">
              <thead>
                <tr>
                  <th>İşletme</th>
                  <th className="text-right">Yanıt</th>
                  <th className="text-right">Ort. Puan</th>
                  <th className="text-right">Son yanıt</th>
                </tr>
              </thead>
              <tbody>
                {data.perRestaurant.map((r) => (
                  <tr key={r.restaurantId}>
                    <td>
                      <Link
                        href={`/admin/restaurants/${r.restaurantId}`}
                        className="bz-h-tight text-[14px] hover:underline"
                      >
                        {r.name}
                      </Link>
                    </td>
                    <td className="text-right bz-mono">{r.responseCount}</td>
                    <td className="text-right bz-mono">{fmtScore(r.avgScore)}</td>
                    <td className="text-right text-[13px] text-[#525252]">
                      {fmtDate(r.latestResponseAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
