'use client';

// CLAUDE.md §42 — Audit Center category CRUD (superadmin).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, Save, Sparkles, Tag } from 'lucide-react';
import SeedResultModal, { type SeedResult } from '@/components/admin/audits/SeedResultModal';
import {
  AlertBanner,
  Badge,
  type BadgeKind,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  useConfirmDialog,
} from '@/components/ui';
import { AUDIT_SECTORS, type AuditSector } from '@/lib/audits/types';
import {
  parseAuditErrorResponse,
  summarizeAuditError,
} from '@/lib/audits/error-humanizer';

interface Category {
  id: string;
  slug: string;
  labelTr: string;
  labelEn: string;
  sector: AuditSector;
  iconKey: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  _count: { templates: number };
}

const SECTOR_LABEL: Record<AuditSector, string> = {
  food: 'Yeme & İçme',
  hotel: 'Konaklama',
  retail: 'Perakende',
  health: 'Sağlık & Klinik',
  beauty: 'Güzellik & Spa',
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

interface FormState {
  id?: string;
  slug: string;
  labelTr: string;
  labelEn: string;
  sector: AuditSector;
  iconKey: string;
  order: string;
}

const EMPTY_FORM: FormState = {
  slug: '',
  labelTr: '',
  labelEn: '',
  sector: 'food',
  iconKey: '',
  order: '0',
};

export default function AuditCategoriesPage() {
  const [data, setData] = useState<Category[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmEl, askConfirm] = useConfirmDialog();
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<SeedResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/audits/categories');
      if (!res.ok) {
        const parsed = await parseAuditErrorResponse(res, 'tr');
        setError(summarizeAuditError(parsed));
        return;
      }
      const json = await res.json();
      setData(json.data);
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<AuditSector, Category[]>();
    (data ?? []).forEach((c) => {
      const arr = map.get(c.sector) ?? [];
      arr.push(c);
      map.set(c.sector, arr);
    });
    return Array.from(map.entries()).sort(([a], [b]) =>
      SECTOR_LABEL[a].localeCompare(SECTOR_LABEL[b], 'tr'),
    );
  }, [data]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(cat: Category) {
    setForm({
      id: cat.id,
      slug: cat.slug,
      labelTr: cat.labelTr,
      labelEn: cat.labelEn,
      sector: cat.sector,
      iconKey: cat.iconKey ?? '',
      order: String(cat.order),
    });
    setFormError(null);
    setModalOpen(true);
  }

  function runSeed() {
    askConfirm({
      title: 'Varsayılan içeriği yükle',
      body: (
        <div className="space-y-2 text-[13px] text-[#525252]">
          <p>
            Denetim Merkezi için <strong className="text-[#0A0A0A]">18 kategori</strong>,{' '}
            <strong className="text-[#0A0A0A]">24 şablon</strong> ve{' '}
            <strong className="text-[#0A0A0A]">~120 soru</strong> yüklenir veya güncellenir.
          </p>
          <p>
            Mevcut <em>slug</em> ile eşleşen kategoriler güncellenir; admin tarafından elle eklenen
            kategoriler etkilenmez.
          </p>
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

  async function handleSave() {
    setFormError(null);
    setSaving(true);
    try {
      const isUpdate = Boolean(form.id);
      const url = isUpdate
        ? `/api/admin/audits/categories/${form.id}`
        : '/api/admin/audits/categories';
      const method = isUpdate ? 'PATCH' : 'POST';
      const body = isUpdate
        ? {
            labelTr: form.labelTr.trim(),
            labelEn: form.labelEn.trim(),
            sector: form.sector,
            iconKey: form.iconKey.trim() || null,
            order: Number(form.order) || 0,
          }
        : {
            slug: form.slug.trim(),
            labelTr: form.labelTr.trim(),
            labelEn: form.labelEn.trim(),
            sector: form.sector,
            iconKey: form.iconKey.trim() || null,
            order: Number(form.order) || 0,
          };
      const res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        if (res.status === 409) {
          setFormError('Bu slug zaten kullanılıyor.');
          return;
        }
        const parsed = await parseAuditErrorResponse(res, 'tr');
        setFormError(summarizeAuditError(parsed));
        return;
      }
      setModalOpen(false);
      setNotice(isUpdate ? 'Kategori güncellendi.' : 'Kategori eklendi.');
      await load();
      setTimeout(() => setNotice(null), 3500);
    } catch {
      setFormError('Bağlantı hatası');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(cat: Category) {
    askConfirm({
      title: 'Kategoriyi sil',
      body: `"${cat.labelTr}" kategorisini silmek istediğine emin misin? Bu kategoride ${cat._count.templates} şablon var; şablonlar silinmez ama kategori bağı kopar.`,
      confirmLabel: 'Sil',
      cancelLabel: 'Vazgeç',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/audits/categories/${cat.id}`, {
            method: 'DELETE',
          });
          if (!res.ok) {
            const parsed = await parseAuditErrorResponse(res, 'tr');
            setError(summarizeAuditError(parsed));
            return;
          }
          setNotice('Kategori silindi.');
          await load();
          setTimeout(() => setNotice(null), 3500);
        } catch {
          setError('Bağlantı hatası');
        }
      },
    });
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow="SUPERADMIN · DENETİM MERKEZİ"
        eyebrowColor="#C6F24E"
        title="Denetim kategorileri"
        description="Şablonları sektör ve konuya göre gruplayan taksonomi. İşletme sahipleri şablon oluştururken bu kategori listesinden seçer."
        actions={
          <div className="flex flex-wrap gap-2">
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
              <Plus size={14} strokeWidth={2} /> Yeni kategori
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

      {loading && !data ? null : !data || data.length === 0 ? (
        <EmptyState
          icon={<Tag size={20} />}
          title="Henüz kategori yok"
          body="Buaze 6 sektör için hazır 18 kategori + 24 şablon ile başlatabilirsin. Sıfırdan ekleyeceksen 'Yeni kategori' butonunu kullan."
          action={
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                className="bz-btn-primary"
                onClick={runSeed}
                disabled={seeding}
              >
                {seeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Varsayılan içeriği yükle
              </button>
              <button className="bz-btn-ghost" onClick={openCreate}>
                <Plus size={14} strokeWidth={2} /> Yeni kategori
              </button>
            </div>
          }
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(([sector, items]) => (
            <section key={sector} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="pulse-eyebrow text-[#0A0A0A]">{SECTOR_LABEL[sector]}</span>
                <Badge kind={SECTOR_BADGE[sector]}>{items.length}</Badge>
              </div>
              {/* grid-cols-1 (minmax(0,1fr)): without it the single mobile
                  track sized itself to the longest "label · /slug" line and
                  pushed cards past the 390px viewport, clipping the actions. */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((cat) => (
                  <article key={cat.id} className="bz-card min-w-0 p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="bz-h-tight text-[15px] truncate">{cat.labelTr}</div>
                        <div className="text-[12px] text-[#737373] truncate">
                          {cat.labelEn} · <span className="bz-mono">/{cat.slug}</span>
                        </div>
                      </div>
                      <Badge kind="ghost">#{cat.order}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-[12px] text-[#525252]">
                      <span>{cat._count.templates} şablon</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="bz-btn-icon"
                          onClick={() => openEdit(cat)}
                          aria-label="Düzenle"
                        >
                          <Pencil size={14} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          className="bz-btn-icon"
                          onClick={() => handleDelete(cat)}
                          aria-label="Sil"
                        >
                          <Trash2 size={14} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {modalOpen && <Modal
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Kategoriyi düzenle' : 'Yeni kategori'}
        size={480}
      >
        <div className="space-y-3">
          {formError && <AlertBanner kind="danger">{formError}</AlertBanner>}
          <Field label="Slug" hint="URL-uyumlu, küçük harf + tire" required>
            <input
              className="bz-input"
              value={form.slug}
              disabled={Boolean(form.id)}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="ornek-kategori"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Türkçe başlık" required>
              <input
                className="bz-input"
                value={form.labelTr}
                onChange={(e) => setForm((f) => ({ ...f, labelTr: e.target.value }))}
              />
            </Field>
            <Field label="English label" required>
              <input
                className="bz-input"
                value={form.labelEn}
                onChange={(e) => setForm((f) => ({ ...f, labelEn: e.target.value }))}
              />
            </Field>
          </div>
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
            <Field label="Sıralama">
              <input
                className="bz-input"
                type="number"
                value={form.order}
                onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="İkon adı (opsiyonel)" hint="Örn. UserPlus. Boş bırakılabilir.">
            <input
              className="bz-input"
              value={form.iconKey}
              onChange={(e) => setForm((f) => ({ ...f, iconKey: e.target.value }))}
              placeholder="UserPlus"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="bz-btn-ghost"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Vazgeç
            </button>
            <button
              type="button"
              className="bz-btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Kaydet
            </button>
          </div>
        </div>
      </Modal>}

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
