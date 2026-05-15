'use client';

// Stage 119 §38.199 — Admin catalog for global customer-campaign templates.
// Superadmin manages the global library (restaurantId=null). Owner-saved
// templates are out of scope here (owner-only library on /dashboard/campaigns).

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertBanner,
  Badge,
  type BadgeKind,
  EmptyState,
  PageHeader,
  useConfirmDialog,
} from '@/components/ui';
import {
  Loader2,
  Plus,
  Sparkles,
  Eye,
  EyeOff,
  Trash2,
  Pencil,
  MessageSquareText,
} from 'lucide-react';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import { CampaignTemplateEditorModal } from './_components/CampaignTemplateEditorModal';

interface TemplateRow {
  id: string;
  key: string | null;
  title: string;
  description: string | null;
  sector: string;
  locale: string;
  category: string;
  subject: string;
  body: string;
  isPublished: boolean;
  forkCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  published: number;
  draft: number;
  bySector: Array<{ sector: string; count: number }>;
}

const SECTOR_LABEL: Record<string, string> = {
  food: 'Restoran / Kafe',
  delivery: 'Paket servis',
  hospitality: 'Otel',
  clinic: 'Klinik',
  legal: 'Hukuk',
  spa: 'Spa / Güzellik',
  retail: 'Perakende',
  fitness: 'Spor',
  education: 'Eğitim',
  other: 'Diğer',
};

const SECTOR_BADGE: Record<string, BadgeKind> = {
  food: 'lime',
  delivery: 'lime',
  hospitality: 'info',
  clinic: 'ok',
  legal: 'ghost',
  spa: 'warn',
  retail: 'warn',
  fitness: 'info',
  education: 'ghost',
  other: 'ghost',
};

const CATEGORY_LABEL: Record<string, string> = {
  reactivation: 'Geri kazanma',
  'special-offer': 'Özel teklif',
  'feedback-request': 'Geri bildirim',
  custom: 'Özel',
};

const SECTORS = [
  'food',
  'delivery',
  'hospitality',
  'clinic',
  'legal',
  'spa',
  'retail',
  'fitness',
  'education',
  'other',
];

export default function AdminCampaignTemplatesPage() {
  const filters = useUrlFilter({
    sector: 'all',
    locale: 'all',
    category: 'all',
    status: 'all',
  });

  const [rows, setRows] = useState<TemplateRow[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editorTarget, setEditorTarget] = useState<TemplateRow | 'new' | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [confirmEl, askConfirm] = useConfirmDialog();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (filters.values.sector !== 'all') qs.set('sector', String(filters.values.sector));
      if (filters.values.locale !== 'all') qs.set('locale', String(filters.values.locale));
      if (filters.values.category !== 'all') qs.set('category', String(filters.values.category));
      if (filters.values.status !== 'all') qs.set('status', String(filters.values.status));
      const res = await fetch(`/api/admin/customer-campaign-templates?${qs.toString()}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || 'Yükleme başarısız');
        return;
      }
      const json = await res.json();
      setRows(Array.isArray(json?.templates) ? json.templates : []);
      setStats(json?.stats ?? null);
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  }, [filters.values.sector, filters.values.locale, filters.values.category, filters.values.status]);

  useEffect(() => {
    load();
  }, [load]);

  async function togglePublish(row: TemplateRow) {
    setBusyId(row.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/customer-campaign-templates/${row.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isPublished: !row.isPublished }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || 'İşlem başarısız');
        return;
      }
      setNotice(row.isPublished ? 'Yayından kaldırıldı.' : 'Yayınlandı.');
      await load();
      setTimeout(() => setNotice(null), 3500);
    } finally {
      setBusyId(null);
    }
  }

  function deleteRow(row: TemplateRow) {
    askConfirm({
      title: 'Şablonu sil',
      body: (
        <div className="space-y-2 text-[13px] text-[#525252]">
          <p>
            <strong className="text-[#0A0A0A]">{row.title}</strong> şablonu kalıcı olarak silinecek.
            {row.forkCount > 0 ? (
              <>
                {' '}
                <em>
                  {row.forkCount} işletme bu şablonu kendi kütüphanesine forklamış — onların kopyaları
                  korunur ama kaynak bağlantısı kaybolur.
                </em>
              </>
            ) : null}
          </p>
          <p className="text-[#737373]">Geri alınamaz.</p>
        </div>
      ),
      confirmLabel: 'Sil',
      cancelLabel: 'Vazgeç',
      onConfirm: async () => {
        setBusyId(row.id);
        try {
          const res = await fetch(`/api/admin/customer-campaign-templates/${row.id}`, {
            method: 'DELETE',
          });
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            setError(j?.error || 'Silme başarısız');
            return;
          }
          setNotice('Şablon silindi.');
          await load();
          setTimeout(() => setNotice(null), 3500);
        } finally {
          setBusyId(null);
        }
      },
    });
  }

  function runSeed() {
    askConfirm({
      title: 'Varsayılan içeriği yükle',
      body: (
        <div className="space-y-2 text-[13px] text-[#525252]">
          <p>
            Kampanya kataloğu için <strong className="text-[#0A0A0A]">60 hazır şablon</strong>{' '}
            yüklenir veya güncellenir (10 sektör × 3 şablon × 2 dil).
          </p>
          <p className="text-[#737373]">
            Mevcut şablonların başlık/konu/gövdesi varsayılana döndürülür; admin tarafından
            <em> isPublished</em> değiştirilmiş satırlar dokunulmadan korunur.
          </p>
        </div>
      ),
      confirmLabel: 'Yükle',
      cancelLabel: 'Vazgeç',
      onConfirm: async () => {
        setSeeding(true);
        setError(null);
        try {
          const res = await fetch('/api/admin/customer-campaign-templates/seed', {
            method: 'POST',
          });
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            setError(j?.error || 'Seed başarısız');
            return;
          }
          const json = await res.json();
          setNotice(
            `Yüklendi: ${json?.upserted ?? '—'} şablon (${json?.durationMs ?? '?'}ms)`,
          );
          await load();
          setTimeout(() => setNotice(null), 5000);
        } catch {
          setError('Bağlantı hatası');
        } finally {
          setSeeding(false);
        }
      },
    });
  }

  const counts = useMemo(() => {
    if (!stats) return { total: 0, published: 0, draft: 0, sectorsCovered: 0 };
    const sectorsCovered = stats.bySector.filter((s) => s.count > 0).length;
    return {
      total: stats.total,
      published: stats.published,
      draft: stats.draft,
      sectorsCovered,
    };
  }, [stats]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow="SUPERADMIN · KAMPANYA ŞABLONLARI"
        eyebrowColor="#C6F24E"
        title="Kampanya şablon kataloğu"
        description="Owner'ların kampanya oluştururken seçebileceği global hazır şablonları yönet. Owner kendi sektörüne uygun şablonu seçer, içeriği düzenleyip gönderim öncesi onaya gönderir."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="bz-btn-ghost"
              onClick={runSeed}
              disabled={seeding || loading}
              title="60 hazır şablonu (10 sektör × 3 şablon × 2 dil) yükler veya günceller."
            >
              {seeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Varsayılan içeriği yükle
            </button>
            <button
              type="button"
              className="bz-btn-primary"
              onClick={() => setEditorTarget('new')}
            >
              <Plus size={14} strokeWidth={2} /> Yeni şablon
            </button>
          </div>
        }
      />

      {error && (
        <AlertBanner kind="danger" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      )}
      {notice && (
        <AlertBanner kind="success" onDismiss={() => setNotice(null)}>
          {notice}
        </AlertBanner>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bz-card p-3">
          <div className="pulse-eyebrow text-[#525252]">Toplam</div>
          <div className="bz-h-tight text-[22px] mt-1">{counts.total}</div>
        </div>
        <div className="bz-card p-3">
          <div className="pulse-eyebrow text-[#525252]">Yayında</div>
          <div className="bz-h-tight text-[22px] mt-1 text-[#166534]">{counts.published}</div>
        </div>
        <div className="bz-card p-3">
          <div className="pulse-eyebrow text-[#525252]">Taslak</div>
          <div className="bz-h-tight text-[22px] mt-1 text-[#525252]">{counts.draft}</div>
        </div>
        <div className="bz-card p-3">
          <div className="pulse-eyebrow text-[#525252]">Sektör kapsamı</div>
          <div className="bz-h-tight text-[22px] mt-1">
            {counts.sectorsCovered}
            <span className="text-[12px] text-[#A3A3A3]"> / 10</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-2">
        <select
          className="bz-input min-w-[160px]"
          value={String(filters.values.sector)}
          onChange={(e) => filters.set('sector', e.target.value)}
          aria-label="Sektör filtresi"
        >
          <option value="all">Tüm sektörler</option>
          {SECTORS.map((s) => (
            <option key={s} value={s}>
              {SECTOR_LABEL[s]}
            </option>
          ))}
        </select>
        <select
          className="bz-input min-w-[120px]"
          value={String(filters.values.locale)}
          onChange={(e) => filters.set('locale', e.target.value)}
          aria-label="Dil filtresi"
        >
          <option value="all">Tüm diller</option>
          <option value="tr">Türkçe</option>
          <option value="en">English</option>
        </select>
        <select
          className="bz-input min-w-[160px]"
          value={String(filters.values.category)}
          onChange={(e) => filters.set('category', e.target.value)}
          aria-label="Kategori filtresi"
        >
          <option value="all">Tüm kategoriler</option>
          <option value="reactivation">Geri kazanma</option>
          <option value="special-offer">Özel teklif</option>
          <option value="feedback-request">Geri bildirim</option>
          <option value="custom">Özel</option>
        </select>
        <select
          className="bz-input min-w-[140px]"
          value={String(filters.values.status)}
          onChange={(e) => filters.set('status', e.target.value)}
          aria-label="Yayın durumu"
        >
          <option value="all">Tüm durumlar</option>
          <option value="published">Yayında</option>
          <option value="draft">Taslak</option>
        </select>
      </div>

      {/* Empty state */}
      {!loading && (!rows || rows.length === 0) ? (
        <EmptyState
          icon={<MessageSquareText size={20} />}
          title={counts.total === 0 ? 'Henüz şablon yok' : 'Sonuç yok'}
          body={
            counts.total === 0
              ? 'Buaze 10 sektör için 60 hazır kampanya şablonu (geri kazanma + özel teklif + geri bildirim) ile başlatabilirsin.'
              : 'Filtreyi değiştir veya yeni bir şablon oluştur.'
          }
          action={
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              {counts.total === 0 ? (
                <button
                  type="button"
                  className="bz-btn-primary"
                  onClick={runSeed}
                  disabled={seeding}
                >
                  {seeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Varsayılan içeriği yükle
                </button>
              ) : null}
              <button
                type="button"
                className={counts.total === 0 ? 'bz-btn-ghost' : 'bz-btn-primary'}
                onClick={() => setEditorTarget('new')}
              >
                <Plus size={14} strokeWidth={2} /> Yeni şablon
              </button>
            </div>
          }
        />
      ) : loading && !rows ? (
        <div className="bz-card p-8 text-center text-[12px] text-[#737373]">
          <Loader2 size={16} className="inline-block animate-spin mr-2" />
          Yükleniyor…
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="bz-card hidden overflow-hidden lg:block">
            <table className="bz-table">
              <thead>
                <tr>
                  <th>Başlık</th>
                  <th>Sektör</th>
                  <th>Kategori</th>
                  <th>Dil</th>
                  <th>Anahtar</th>
                  <th className="text-right">Forklar</th>
                  <th>Durum</th>
                  <th className="text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {rows!.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="bz-h-tight text-[14px]">{row.title}</div>
                      {row.description ? (
                        <div className="line-clamp-1 text-[12px] text-[#737373]">
                          {row.description}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <Badge kind={SECTOR_BADGE[row.sector] ?? 'ghost'}>
                        {SECTOR_LABEL[row.sector] ?? row.sector}
                      </Badge>
                    </td>
                    <td className="text-[13px]">
                      {CATEGORY_LABEL[row.category] ?? row.category}
                    </td>
                    <td className="text-[13px] uppercase">{row.locale}</td>
                    <td className="bz-mono text-[11px] text-[#737373]">{row.key ?? '—'}</td>
                    <td className="bz-mono text-right">{row.forkCount}</td>
                    <td>
                      {row.isPublished ? (
                        <Badge kind="ok">Yayında</Badge>
                      ) : (
                        <Badge kind="ghost">Taslak</Badge>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          className="bz-btn-ghost"
                          onClick={() => setEditorTarget(row)}
                        >
                          <Pencil size={14} /> Düzenle
                        </button>
                        <button
                          type="button"
                          className="bz-btn-ghost"
                          disabled={busyId === row.id}
                          onClick={() => togglePublish(row)}
                        >
                          {busyId === row.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : row.isPublished ? (
                            <>
                              <EyeOff size={14} /> Kaldır
                            </>
                          ) : (
                            <>
                              <Eye size={14} /> Yayınla
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          className="bz-btn-ghost"
                          disabled={busyId === row.id}
                          onClick={() => deleteRow(row)}
                          aria-label="Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="space-y-3 lg:hidden">
            {rows!.map((row) => (
              <div key={row.id} className="bz-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="bz-h-tight truncate text-[15px]">{row.title}</div>
                    {row.description && (
                      <div className="mt-1 line-clamp-2 text-[12px] leading-snug text-[#737373]">
                        {row.description}
                      </div>
                    )}
                  </div>
                  {row.isPublished ? (
                    <Badge kind="ok">Yayında</Badge>
                  ) : (
                    <Badge kind="ghost">Taslak</Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge kind={SECTOR_BADGE[row.sector] ?? 'ghost'}>
                    {SECTOR_LABEL[row.sector] ?? row.sector}
                  </Badge>
                  <span className="rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[11px] text-[#525252]">
                    {CATEGORY_LABEL[row.category] ?? row.category}
                  </span>
                  <span className="rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[11px] uppercase text-[#525252]">
                    {row.locale}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    className="bz-btn-ghost justify-center text-[12px]"
                    onClick={() => setEditorTarget(row)}
                  >
                    <Pencil size={14} /> Düzenle
                  </button>
                  <button
                    type="button"
                    className="bz-btn-ghost justify-center text-[12px]"
                    disabled={busyId === row.id}
                    onClick={() => togglePublish(row)}
                  >
                    {busyId === row.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : row.isPublished ? (
                      <>
                        <EyeOff size={14} /> Kaldır
                      </>
                    ) : (
                      <>
                        <Eye size={14} /> Yayınla
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="bz-btn-ghost justify-center text-[12px]"
                    disabled={busyId === row.id}
                    onClick={() => deleteRow(row)}
                  >
                    <Trash2 size={14} /> Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {editorTarget ? (
        <CampaignTemplateEditorModal
          target={editorTarget === 'new' ? null : editorTarget}
          onClose={() => setEditorTarget(null)}
          onSaved={(message) => {
            setEditorTarget(null);
            setNotice(message);
            load();
            setTimeout(() => setNotice(null), 4000);
          }}
        />
      ) : null}

      {confirmEl}
    </div>
  );
}
