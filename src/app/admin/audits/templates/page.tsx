'use client';

// CLAUDE.md §42 — Audit template catalog (superadmin).
//
// MVP scope (Faz 1): list + filter + publish toggle + new (basic title +
// sector + category dropdown). Full question builder Faz 2'de. Owner-fork
// flow Faz 2'de owner panelinden açılır.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ClipboardCheck,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Sparkles,
} from 'lucide-react';
import {
  AlertBanner,
  Badge,
  type BadgeKind,
  EmptyState,
  PageHeader,
  Tabs,
  type TabItem,
  useConfirmDialog,
} from '@/components/ui';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import { AUDIT_SECTORS, type AuditSector, type AuditScoringMode } from '@/lib/audits/types';
import {
  parseAuditErrorResponse,
  summarizeAuditError,
} from '@/lib/audits/error-humanizer';
import type { SeedResult } from '@/components/admin/audits/SeedResultModal';

// Both render nothing until the admin acts (wizard closed / no seed result),
// so their code (question builder, zod wizard state) loads on demand instead
// of shipping with the page.
const SeedResultModal = dynamic(() => import('@/components/admin/audits/SeedResultModal'), {
  ssr: false,
});
const CreateTemplateWizard = dynamic(() => import('./_components/CreateTemplateWizard'), {
  ssr: false,
});

interface CategoryRef {
  id: string;
  slug: string;
  labelTr: string;
  labelEn: string;
  sector?: AuditSector;
}

interface Template {
  id: string;
  restaurantId: string | null;
  categoryId: string | null;
  category: CategoryRef | null;
  title: string;
  description: string | null;
  sector: AuditSector;
  scoringMode: AuditScoringMode;
  passingScore: number | null;
  locale: string;
  isPublished: boolean;
  isActive: boolean;
  createdBy: string | null;
  updatedAt: string;
  _count: { questions: number; responses: number; assignments: number };
}

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

const SCORING_LABEL: Record<AuditScoringMode, string> = {
  percentage: 'Yüzde',
  weighted: 'Ağırlıklı',
  pass_fail: 'Geçti / Kaldı',
};

const SCOPE_TABS: TabItem[] = [
  { id: 'global', label: 'Hazır şablonlar (global)' },
  { id: 'restaurant', label: 'Restoran-özel' },
  { id: 'all', label: 'Tümü' },
];

export default function AuditTemplatesPage() {
  const filters = useUrlFilter({ scope: 'global', sector: 'all', published: 'all' });
  const scope = filters.values.scope as 'global' | 'restaurant' | 'all';
  const sectorFilter = filters.values.sector as AuditSector | 'all';
  const publishedFilter = filters.values.published as 'all' | 'true' | 'false';

  const [data, setData] = useState<Template[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryRef[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  // The wizard mounts on first open and then stays mounted, so its draft
  // survives close + reopen exactly as when it was always mounted.
  const [wizardMounted, setWizardMounted] = useState(false);
  const openCreate = () => {
    setWizardMounted(true);
    setCreateOpen(true);
  };
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<SeedResult | null>(null);
  const [confirmEl, askConfirm] = useConfirmDialog();

  // Only the latest request may update state: a slower, older request that
  // failed used to leave an error banner on top of freshly loaded data.
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (sectorFilter !== 'all') qs.set('sector', sectorFilter);
      if (publishedFilter !== 'all') qs.set('isPublished', publishedFilter);
      if (scope === 'global') qs.set('restaurantId', 'null');

      const res = await fetch(`/api/admin/audits/templates?${qs.toString()}`);
      if (seq !== loadSeq.current) return;
      if (!res.ok) {
        const parsed = await parseAuditErrorResponse(res, 'tr');
        if (seq === loadSeq.current) setError(summarizeAuditError(parsed));
        return;
      }
      const json = await res.json();
      if (seq !== loadSeq.current) return;
      let rows: Template[] = json.data;
      if (scope === 'restaurant') rows = rows.filter((r) => r.restaurantId !== null);
      setData(rows);
    } catch {
      if (seq === loadSeq.current) setError('Bağlantı hatası');
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [scope, sectorFilter, publishedFilter]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/audits/categories');
      if (!res.ok) return;
      const json = await res.json();
      setCategories(
        (json.data || []).map((c: CategoryRef) => ({
          id: c.id,
          slug: c.slug,
          labelTr: c.labelTr,
          labelEn: c.labelEn,
          sector: c.sector,
        })),
      );
    } catch {
      // category load fail = non-fatal, dropdown sadece "yok" gösterir
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const counts = useMemo(() => {
    if (!data) return { total: 0, published: 0, draft: 0 };
    const published = data.filter((t) => t.isPublished).length;
    return { total: data.length, published, draft: data.length - published };
  }, [data]);

  async function togglePublish(tpl: Template) {
    setBusyId(tpl.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/audits/templates/${tpl.id}/publish`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isPublished: !tpl.isPublished }),
      });
      if (!res.ok) {
        const parsed = await parseAuditErrorResponse(res, 'tr');
        setError(summarizeAuditError(parsed));
        return;
      }
      setNotice(tpl.isPublished ? 'Yayından kaldırıldı.' : 'Yayınlandı.');
      await load();
      setTimeout(() => setNotice(null), 3500);
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setBusyId(null);
    }
  }

  function runSeed() {
    askConfirm({
      title: 'Varsayılan içeriği yükle',
      body: (
        <div className="space-y-2 text-[13px] text-[#525252]">
          <p>
            Denetim Merkezi için <strong className="text-pn-ink">18 kategori</strong>,{' '}
            <strong className="text-pn-ink">24 şablon</strong> ve{' '}
            <strong className="text-pn-ink">~120 soru</strong> yüklenir veya güncellenir.
          </p>
          <p>
            Mevcut <em>title</em> değiştirilmemiş şablonlar güncellenir; manuel olarak başlık
            değiştirdiğin satırlar dokunulmadan korunur — seed kendi orijinalini ayrı bir satır
            olarak ekler.
          </p>
          <p className="text-[#737373]">İşlem birkaç saniye sürer. Operatör trafiğini etkilemez.</p>
        </div>
      ),
      confirmLabel: 'Yükle',
      cancelLabel: 'Vazgeç',
      onConfirm: async () => {
        setSeeding(true);
        setError(null);
        try {
          const res = await fetch('/api/admin/audits/seed', { method: 'POST' });
          if (!res.ok) {
            const parsed = await parseAuditErrorResponse(res, 'tr');
            setError(summarizeAuditError(parsed));
            return;
          }
          const json = await res.json();
          setSeedResult(json.data as SeedResult);
          await load();
        } catch {
          setError('Bağlantı hatası');
        } finally {
          setSeeding(false);
        }
      },
    });
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow="SUPERADMIN · DENETİM MERKEZİ"
        eyebrowColor="#D7FE03"
        title="Şablon kataloğu"
        description="Sektör başına yayınlanan hazır denetim şablonlarını yönet. İşletme sahipleri bu kataloğu kopyalayıp kendi denetimlerine uyarlar."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/audits/categories" className="bz-btn-ghost">
              Kategoriler
            </Link>
            <button
              type="button"
              className="bz-btn-ghost"
              onClick={runSeed}
              disabled={seeding || loading}
              title="Varsayılan 18 kategori + 24 şablon + ~120 soru yüklenir veya güncellenir"
            >
              {seeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Varsayılan içeriği yükle
            </button>
            <button className="bz-btn-primary" onClick={openCreate}>
              <Plus size={14} strokeWidth={2} /> Yeni şablon
            </button>
          </div>
        }
      />

      {error && <AlertBanner kind="danger" onDismiss={() => setError(null)}>{error}</AlertBanner>}
      {notice && <AlertBanner kind="success" onDismiss={() => setNotice(null)}>{notice}</AlertBanner>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="bz-card p-3">
          <div className="text-[13px] font-medium text-[#525252]">Toplam</div>
          <div className="bz-h-tight text-[22px] mt-1">{counts.total}</div>
        </div>
        <div className="bz-card p-3">
          <div className="text-[13px] font-medium text-[#525252]">Yayında</div>
          <div className="bz-h-tight text-[22px] mt-1 text-[#166534]">{counts.published}</div>
        </div>
        <div className="bz-card p-3">
          <div className="text-[13px] font-medium text-[#525252]">Taslak</div>
          <div className="bz-h-tight text-[22px] mt-1 text-[#525252]">{counts.draft}</div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Tabs items={SCOPE_TABS} active={scope} onChange={(v) => filters.set('scope', v)} />
        {/* shrink-0: .bz-tabs is width:100%, which squeezed this group and
            stacked the two filters vertically next to the tabs. */}
        <div className="flex flex-wrap gap-2 sm:shrink-0 sm:flex-nowrap">
          <select
            className="bz-input min-w-[160px]"
            value={sectorFilter}
            onChange={(e) => filters.set('sector', e.target.value)}
            aria-label="Sektör filtresi"
          >
            <option value="all">Tüm sektörler</option>
            {AUDIT_SECTORS.map((s) => (
              <option key={s} value={s}>
                {SECTOR_LABEL[s]}
              </option>
            ))}
          </select>
          <select
            className="bz-input min-w-[140px]"
            value={publishedFilter}
            onChange={(e) => filters.set('published', e.target.value)}
            aria-label="Yayın durumu"
          >
            <option value="all">Tüm durumlar</option>
            <option value="true">Yayında</option>
            <option value="false">Taslak</option>
          </select>
        </div>
      </div>

      {loading && !data ? null : !data || data.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck size={20} />}
          title={filters.hasActive ? 'Sonuç yok' : 'Henüz şablon yok'}
          body={
            filters.hasActive
              ? 'Bu filtrelerle eşleşen şablon yok. Filtreyi değiştir veya yeni bir şablon oluştur.'
              : 'Buaze 6 sektör için hazır 18 kategori + 24 şablon ile başlatabilirsin. Sıfırdan ekleyeceksen "Yeni şablon" butonunu kullan.'
          }
          action={
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              {!filters.hasActive && (
                <button
                  type="button"
                  className="bz-btn-primary"
                  onClick={runSeed}
                  disabled={seeding}
                >
                  {seeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Varsayılan içeriği yükle
                </button>
              )}
              <button
                type="button"
                className={filters.hasActive ? 'bz-btn-primary' : 'bz-btn-ghost'}
                onClick={openCreate}
              >
                <Plus size={14} strokeWidth={2} /> Yeni şablon
              </button>
            </div>
          }
        />
      ) : (
        <>
          {/* Desktop tablo (lg+) */}
          <div className="bz-card hidden overflow-hidden lg:block">
            <table className="bz-table">
              <thead>
                <tr>
                  <th>Başlık</th>
                  <th>Sektör</th>
                  <th>Kategori</th>
                  <th>Mod</th>
                  <th className="text-right">Soru</th>
                  <th className="text-right">Yanıt</th>
                  <th>Durum</th>
                  <th className="text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {data.map((tpl) => (
                  <tr key={tpl.id}>
                    <td>
                      <div className="bz-h-tight text-[14px]">{tpl.title}</div>
                      {tpl.description ? (
                        <div className="line-clamp-1 text-[12px] text-[#737373]">
                          {tpl.description}
                        </div>
                      ) : null}
                      {tpl.restaurantId && (
                        <div className="mt-1 text-[12px] text-[#525252]">Restoran-özel</div>
                      )}
                    </td>
                    <td>
                      <Badge kind={SECTOR_BADGE[tpl.sector]}>{SECTOR_LABEL[tpl.sector]}</Badge>
                    </td>
                    <td className="text-[13px]">{tpl.category ? tpl.category.labelTr : '—'}</td>
                    <td className="text-[13px]">
                      {SCORING_LABEL[tpl.scoringMode]}
                      {tpl.passingScore != null && (
                        <span className="text-[12px] text-[#737373]"> · ≥{tpl.passingScore}</span>
                      )}
                    </td>
                    <td className="tabular-nums text-right">{tpl._count.questions}</td>
                    <td className="tabular-nums text-right">{tpl._count.responses}</td>
                    <td>
                      {tpl.isPublished ? (
                        <Badge kind="ok">Yayında</Badge>
                      ) : (
                        <Badge kind="ghost">Taslak</Badge>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="inline-flex gap-2">
                        <Link
                          href={`/admin/audits/templates/${tpl.id}`}
                          className="bz-btn-ghost"
                        >
                          Düzenle
                        </Link>
                        <button
                          type="button"
                          className="bz-btn-ghost"
                          disabled={busyId === tpl.id || Boolean(tpl.restaurantId)}
                          onClick={() => togglePublish(tpl)}
                          title={
                            tpl.restaurantId
                              ? 'İşletmeye özel şablonların yayın durumu işletme panelinden yönetilir'
                              : undefined
                          }
                        >
                          {busyId === tpl.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : tpl.isPublished ? (
                            <>
                              <EyeOff size={14} /> Yayından kaldır
                            </>
                          ) : (
                            <>
                              <Eye size={14} /> Yayınla
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list (< lg) */}
          <div className="space-y-3 lg:hidden">
            {data.map((tpl) => (
              <div key={tpl.id} className="bz-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="bz-h-tight truncate text-[15px]">{tpl.title}</div>
                    {tpl.description && (
                      <div className="mt-1 line-clamp-2 text-[12px] leading-snug text-[#737373]">
                        {tpl.description}
                      </div>
                    )}
                    {tpl.restaurantId && (
                      <div className="mt-1 text-[12px] text-[#525252]">
                        Restoran-özel
                      </div>
                    )}
                  </div>
                  {tpl.isPublished ? (
                    <Badge kind="ok">Yayında</Badge>
                  ) : (
                    <Badge kind="ghost">Taslak</Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge kind={SECTOR_BADGE[tpl.sector]}>{SECTOR_LABEL[tpl.sector]}</Badge>
                  {tpl.category && (
                    <span className="rounded-full bg-pn-canvas px-2 py-0.5 text-[12px] text-[#525252]">
                      {tpl.category.labelTr}
                    </span>
                  )}
                  <span className="rounded-full bg-pn-canvas px-2 py-0.5 text-[12px] text-[#525252]">
                    {SCORING_LABEL[tpl.scoringMode]}
                    {tpl.passingScore != null ? ` · ≥${tpl.passingScore}` : ''}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-[20px] border border-pn-line bg-pn-canvas p-2.5">
                  <div className="text-center">
                    <div className="text-[13px] font-medium text-[#737373]">Soru</div>
                    <div className="tabular-nums mt-0.5 text-[15px] font-medium">
                      {tpl._count.questions}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[13px] font-medium text-[#737373]">Yanıt</div>
                    <div className="tabular-nums mt-0.5 text-[15px] font-medium">
                      {tpl._count.responses}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/admin/audits/templates/${tpl.id}`}
                    className="bz-btn-ghost justify-center text-[12px]"
                  >
                    Düzenle
                  </Link>
                  <button
                    type="button"
                    className="bz-btn-ghost justify-center text-[12px]"
                    disabled={busyId === tpl.id || Boolean(tpl.restaurantId)}
                    onClick={() => togglePublish(tpl)}
                  >
                    {busyId === tpl.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : tpl.isPublished ? (
                      <>
                        <EyeOff size={14} /> Kaldır
                      </>
                    ) : (
                      <>
                        <Eye size={14} /> Yayınla
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {wizardMounted && (
        <CreateTemplateWizard
          open={createOpen}
          categories={categories}
          onClose={() => setCreateOpen(false)}
          onCreated={(message) => {
            setCreateOpen(false);
            setNotice(message);
            load();
            setTimeout(() => setNotice(null), 4000);
          }}
        />
      )}

      {confirmEl}

      {seedResult && (
        <SeedResultModal
          result={seedResult}
          onClose={() => setSeedResult(null)}
        />
      )}
    </div>
  );
}
