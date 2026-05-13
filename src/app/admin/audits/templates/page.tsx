'use client';

// CLAUDE.md §42 — Audit template catalog (superadmin).
//
// MVP scope (Faz 1): list + filter + publish toggle + new (basic title +
// sector + category dropdown). Full question builder Faz 2'de. Owner-fork
// flow Faz 2'de owner panelinden açılır.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Save,
} from 'lucide-react';
import {
  AlertBanner,
  Badge,
  type BadgeKind,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Tabs,
  type TabItem,
  TableSkeleton,
} from '@/components/ui';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import { AUDIT_SECTORS, AUDIT_SCORING_MODES, type AuditSector, type AuditScoringMode } from '@/lib/audits/types';

interface CategoryRef {
  id: string;
  slug: string;
  labelTr: string;
  labelEn: string;
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

interface CreateForm {
  title: string;
  sector: AuditSector;
  categoryId: string;
  scoringMode: AuditScoringMode;
  passingScore: string;
  description: string;
}

const EMPTY_FORM: CreateForm = {
  title: '',
  sector: 'food',
  categoryId: '',
  scoringMode: 'percentage',
  passingScore: '',
  description: '',
};

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
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (sectorFilter !== 'all') qs.set('sector', sectorFilter);
      if (publishedFilter !== 'all') qs.set('isPublished', publishedFilter);
      if (scope === 'global') qs.set('restaurantId', 'null');

      const res = await fetch(`/api/admin/audits/templates?${qs.toString()}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || 'Yükleme başarısız');
        return;
      }
      const json = await res.json();
      let rows: Template[] = json.data;
      if (scope === 'restaurant') rows = rows.filter((r) => r.restaurantId !== null);
      setData(rows);
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setLoading(false);
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
        const j = await res.json().catch(() => ({}));
        if (j.code === 'NO_QUESTIONS') setError('Yayın için en az 1 soru ekle.');
        else setError(j.error || 'İşlem başarısız');
        return;
      }
      setNotice(tpl.isPublished ? 'Yayından kaldırıldı.' : 'Yayınlandı.');
      await load();
      setTimeout(() => setNotice(null), 3500);
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreate() {
    setFormError(null);
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        sector: form.sector,
        scoringMode: form.scoringMode,
      };
      if (form.categoryId) body.categoryId = form.categoryId;
      if (form.description.trim()) body.description = form.description.trim();
      const pass = Number(form.passingScore);
      if (Number.isFinite(pass) && pass > 0) body.passingScore = pass;

      const res = await fetch('/api/admin/audits/templates', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setFormError(j.error || j.message || 'Oluşturulamadı');
        return;
      }
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      setNotice('Şablon oluşturuldu (taslak). Sorular eklendikten sonra yayınlayabilirsin.');
      await load();
      setTimeout(() => setNotice(null), 4000);
    } catch {
      setFormError('Bağlantı hatası');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow="SUPERADMIN · DENETİM MERKEZİ"
        eyebrowColor="#C6F24E"
        title="Şablon kataloğu"
        description="Sektör başına yayınlanan hazır denetim şablonlarını yönet. Owner'lar bu kataloğu kendi denetimleri için fork eder."
        actions={
          <div className="flex gap-2">
            <Link href="/admin/audits/categories" className="bz-btn-ghost">
              Kategoriler
            </Link>
            <button className="bz-btn-primary" onClick={() => { setForm(EMPTY_FORM); setFormError(null); setCreateOpen(true); }}>
              <Plus size={14} strokeWidth={2} /> Yeni şablon
            </button>
          </div>
        }
      />

      {error && <AlertBanner kind="danger" onDismiss={() => setError(null)}>{error}</AlertBanner>}
      {notice && <AlertBanner kind="success" onDismiss={() => setNotice(null)}>{notice}</AlertBanner>}

      <div className="grid grid-cols-3 gap-3">
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
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Tabs items={SCOPE_TABS} active={scope} onChange={(v) => filters.set('scope', v)} />
        <div className="flex flex-wrap gap-2">
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

      {loading && !data ? (
        <TableSkeleton rows={6} cols={5} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck size={20} />}
          title="Sonuç yok"
          body="Filtreyi değiştir veya yeni bir şablon oluştur."
          action={
            <button className="bz-btn-primary" onClick={() => setCreateOpen(true)}>
              <Plus size={14} strokeWidth={2} /> Yeni şablon
            </button>
          }
        />
      ) : (
        <div className="bz-card overflow-hidden">
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
                      <div className="text-[12px] text-[#737373] line-clamp-1">
                        {tpl.description}
                      </div>
                    ) : null}
                    {tpl.restaurantId && (
                      <div className="text-[11px] text-[#525252] mt-1">
                        Restoran-özel
                      </div>
                    )}
                  </td>
                  <td>
                    <Badge kind={SECTOR_BADGE[tpl.sector]}>{SECTOR_LABEL[tpl.sector]}</Badge>
                  </td>
                  <td className="text-[13px]">
                    {tpl.category ? tpl.category.labelTr : '—'}
                  </td>
                  <td className="text-[13px]">
                    {SCORING_LABEL[tpl.scoringMode]}
                    {tpl.passingScore != null && (
                      <span className="text-[11px] text-[#737373]"> · ≥{tpl.passingScore}</span>
                    )}
                  </td>
                  <td className="text-right bz-mono">{tpl._count.questions}</td>
                  <td className="text-right bz-mono">{tpl._count.responses}</td>
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
                        title={tpl.restaurantId ? 'Restoran-özel şablon admin endpoint üzerinden yönetilmez' : ''}
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
      )}

      {createOpen && <Modal
        onClose={() => setCreateOpen(false)}
        title="Yeni global şablon"
        size={560}
      >
        <div className="space-y-3">
          {formError && <AlertBanner kind="danger">{formError}</AlertBanner>}
          <Field label="Başlık" required>
            <input
              className="bz-input"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="F&B yeni eleman temel quiz"
            />
          </Field>
          <Field label="Açıklama" hint="Owner şablonu seçtiğinde göreceği özet metin">
            <textarea
              className="bz-input min-h-[80px]"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Sektör">
              <select
                className="bz-input"
                value={form.sector}
                onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value as AuditSector }))}
              >
                {AUDIT_SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {SECTOR_LABEL[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Kategori (opsiyonel)">
              <select
                className="bz-input"
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              >
                <option value="">— Yok —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.labelTr}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Puanlama modu">
              <select
                className="bz-input"
                value={form.scoringMode}
                onChange={(e) => setForm((f) => ({ ...f, scoringMode: e.target.value as AuditScoringMode }))}
              >
                {AUDIT_SCORING_MODES.map((s) => (
                  <option key={s} value={s}>
                    {SCORING_LABEL[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Geçme puanı (0-100)" hint="Boş = sadece skor göster">
              <input
                className="bz-input"
                type="number"
                min={0}
                max={100}
                value={form.passingScore}
                onChange={(e) => setForm((f) => ({ ...f, passingScore: e.target.value }))}
              />
            </Field>
          </div>
          <p className="text-[12px] text-[#737373]">
            Sorular bu adımda eklenmiyor — şablon taslak olarak oluşturulur, soru
            ekleme + yayın akışı sonraki dalga (Faz 2 — yapım listesinde).
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="bz-btn-ghost" onClick={() => setCreateOpen(false)} disabled={creating}>
              Vazgeç
            </button>
            <button type="button" className="bz-btn-primary" onClick={handleCreate} disabled={creating || !form.title.trim()}>
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Kaydet
            </button>
          </div>
        </div>
      </Modal>}
    </div>
  );
}
