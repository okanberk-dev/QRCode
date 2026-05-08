'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Eye,
  History,
  Loader2,
  RotateCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import {
  AlertBanner,
  Badge,
  Field,
  Modal,
  PageHeader,
  APSwitch,
} from '@/components/ui';
import { renderLegalContent } from '@/lib/legal/render';

interface DocResponse {
  doc: {
    id: string;
    key: string;
    locale: string;
    title: string;
    content: string;
    description: string | null;
    version: number;
    isActive: boolean;
    effectiveAt: string | null;
    updatedAt: string;
    createdAt: string;
  } | null;
  defaults?: {
    title: string;
    content: string;
    description: string;
  };
}

interface RevisionRow {
  id: string;
  version: number;
  editType: string;
  title: string;
  isActive: boolean;
  effectiveAt: string | null;
  createdAt: string;
  editor: { username: string; email: string | null } | null;
}

const EDIT_TYPE_LABEL: Record<string, string> = {
  created: 'Oluşturuldu',
  updated: 'Güncellendi',
  deleted: 'Silindi',
  reverted: 'Geri alındı',
};

const EDIT_TYPE_KIND: Record<string, 'info' | 'warn' | 'danger' | 'lime' | 'ghost' | 'ok' | 'off'> = {
  created: 'ok',
  updated: 'info',
  deleted: 'danger',
  reverted: 'warn',
};

export default function LegalDocumentEditorPage({
  params,
}: {
  params: Promise<{ key: string; locale: string }>;
}) {
  const { key, locale } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [doc, setDoc] = useState<DocResponse['doc']>(null);
  const [defaults, setDefaults] = useState<DocResponse['defaults'] | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [effectiveAtStr, setEffectiveAtStr] = useState('');

  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reverting, setReverting] = useState<string | null>(null);

  const [revisions, setRevisions] = useState<RevisionRow[] | null>(null);
  const [revisionsLoading, setRevisionsLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/admin/legal-documents/${key}/${locale}`);
        const body: DocResponse = await res.json();
        if (!alive) return;
        if (!res.ok) throw new Error((body as unknown as { error?: string }).error || 'Yüklenemedi');
        if (body.doc) {
          setDoc(body.doc);
          setTitle(body.doc.title);
          setContent(body.doc.content);
          setDescription(body.doc.description ?? '');
          setIsActive(body.doc.isActive);
          setEffectiveAtStr(body.doc.effectiveAt?.split('T')[0] ?? '');
        } else if (body.defaults) {
          setDoc(null);
          setDefaults(body.defaults);
          setTitle(body.defaults.title);
          setContent(body.defaults.content);
          setDescription(body.defaults.description);
          setIsActive(true);
          setEffectiveAtStr(new Date().toISOString().split('T')[0]);
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [key, locale]);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/legal-documents/${key}/${locale}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          description: description.trim() || null,
          isActive,
          effectiveAt: effectiveAtStr ? new Date(effectiveAtStr).toISOString() : null,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        if (body.error === 'invalid_field') {
          throw new Error(
            `${body.field} alanı: ${body.reason === 'too_long' ? `çok uzun (max ${body.max})` : body.reason}`,
          );
        }
        throw new Error(body.error || 'Kaydedilemedi');
      }
      setDoc(body.doc);
      setDefaults(null);
      setNotice(`Yeni versiyon (v${body.doc.version}) kaydedildi.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onResetToDefault = () => {
    if (!defaults && !doc) return;
    if (!confirm('Düzenlenen değişiklikler kaybolacak. Varsayılan içeriği yüklemek istediğine emin misin?')) return;
    if (defaults) {
      setTitle(defaults.title);
      setContent(defaults.content);
      setDescription(defaults.description);
      return;
    }
    // Mevcut belge varsa yine taslak default'a dön (admin yine kaydetmesi gerekir)
    fetch(`/api/admin/legal-documents/${key}/${locale}`)
      .then((r) => r.json())
      .then((b: DocResponse) => {
        if (b.defaults) {
          setTitle(b.defaults.title);
          setContent(b.defaults.content);
          setDescription(b.defaults.description);
          setNotice('Kod varsayılanı yüklendi. Kaydet butonuna basana kadar mevcut versiyon korunur.');
        }
      })
      .catch(() => undefined);
  };

  const onDelete = async () => {
    if (!doc) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/legal-documents/${key}/${locale}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Silme başarısız');
      }
      setShowDelete(false);
      setNotice('Belge silindi. Public surface artık kod default\'unu gösteriyor.');
      setDoc(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const loadRevisions = async () => {
    setRevisionsLoading(true);
    try {
      const res = await fetch(`/api/admin/legal-documents/${key}/${locale}/revisions`);
      const body = await res.json();
      if (res.ok) setRevisions(body.revisions);
    } finally {
      setRevisionsLoading(false);
    }
  };

  const onRevert = async (revisionId: string) => {
    if (!confirm('Bu sürüme geri dönmek istediğine emin misin? Yeni bir versiyon eklenecek.')) return;
    setReverting(revisionId);
    try {
      const res = await fetch(
        `/api/admin/legal-documents/${key}/${locale}/revisions/${revisionId}/revert`,
        { method: 'POST' },
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Revert başarısız');
      setNotice(`v${body.doc.version} olarak geri alındı.`);
      setShowHistory(false);
      // Reload current doc
      const reload = await fetch(`/api/admin/legal-documents/${key}/${locale}`);
      const reloaded: DocResponse = await reload.json();
      if (reload.ok && reloaded.doc) {
        setDoc(reloaded.doc);
        setTitle(reloaded.doc.title);
        setContent(reloaded.doc.content);
        setDescription(reloaded.doc.description ?? '');
        setIsActive(reloaded.doc.isActive);
        setEffectiveAtStr(reloaded.doc.effectiveAt?.split('T')[0] ?? '');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReverting(null);
    }
  };

  const previewBlocks = useMemo(() => renderLegalContent(content), [content]);

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8">
      <Link
        href="/admin/legal-documents"
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] text-[#737373] hover:text-[#0A0A0A]"
      >
        <ArrowLeft size={14} />
        Tüm metinler
      </Link>
      <PageHeader
        eyebrow={`${key.toUpperCase()} · ${locale.toUpperCase()}`}
        title={title || 'Hukuki metin'}
        description={
          doc
            ? `Yürürlükteki sürüm: v${doc.version} · ${doc.isActive ? 'Aktif' : 'Pasif'}`
            : 'Henüz kaydedilmedi — kod varsayılanı düzenleniyor.'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="bz-btn-ghost"
            >
              <Eye size={14} />
              Ön izle
            </button>
            <button
              type="button"
              onClick={() => {
                setShowHistory(true);
                if (revisions === null) loadRevisions();
              }}
              className="bz-btn-ghost"
            >
              <History size={14} />
              Geçmiş
            </button>
            <button
              type="button"
              onClick={onResetToDefault}
              className="bz-btn-ghost"
              title="Kod default'una dön"
            >
              <RotateCcw size={14} />
              Varsayılan
            </button>
            {doc && (
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                className="bz-btn-danger"
              >
                <Trash2 size={14} />
                Sil
              </button>
            )}
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="bz-btn-primary"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        }
      />

      {error && (
        <AlertBanner kind="danger" className="mb-4" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      )}
      {notice && (
        <AlertBanner kind="success" className="mb-4" onDismiss={() => setNotice(null)}>
          {notice}
        </AlertBanner>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-[#737373]">
          <Loader2 size={18} className="animate-spin" />
          Yükleniyor...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <div className="bz-card p-5">
              <Field label="Başlık" required>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bz-input w-full"
                  maxLength={200}
                />
              </Field>
              <Field
                label="Kısa açıklama"
                hint="Admin paneli ve liste görünümünde gözükür. Public sayfada gösterilmez."
              >
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bz-input min-h-[80px] w-full resize-y"
                  maxLength={1000}
                />
              </Field>
              <Field
                label="İçerik (Markdown-lite)"
                required
                hint='## başlık · ### alt başlık · "- " madde · boş satır = paragraf · placeholder formatı: {{ANAHTAR}}'
              >
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="bz-input min-h-[480px] w-full resize-y font-mono text-[12.5px] leading-[1.6]"
                />
              </Field>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="bz-card p-5">
              <h3 className="bz-h-tight text-[14px] tracking-[-0.02em]">Yayın ayarları</h3>
              <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[#EDEDED] bg-white px-3 py-2.5">
                <div>
                  <div className="text-[13px] font-medium text-[#0A0A0A]">Aktif</div>
                  <div className="text-[11.5px] text-[#737373]">
                    Pasifleştirilirse public surface&apos;lerde gizlenir.
                  </div>
                </div>
                <APSwitch checked={isActive} onChange={setIsActive} />
              </div>
              <Field label="Yürürlük tarihi" hint="Public sayfada 'yürürlük: ...' olarak görünür.">
                <input
                  type="date"
                  value={effectiveAtStr}
                  onChange={(e) => setEffectiveAtStr(e.target.value)}
                  className="bz-input w-full"
                />
              </Field>
            </div>
            <div className="bz-card p-5">
              <h3 className="bz-h-tight text-[14px] tracking-[-0.02em]">Versiyon bilgisi</h3>
              {doc ? (
                <dl className="mt-3 space-y-2 text-[12.5px]">
                  <div className="flex items-center justify-between">
                    <dt className="text-[#737373]">Mevcut sürüm</dt>
                    <dd>
                      <Badge kind="lime">v{doc.version}</Badge>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-[#737373]">Durum</dt>
                    <dd>
                      <Badge kind={doc.isActive ? 'ok' : 'off'}>
                        {doc.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-[#737373]">Son güncelleme</dt>
                    <dd className="text-[#0A0A0A]">
                      {new Date(doc.updatedAt).toLocaleString('tr-TR')}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-2 text-[12.5px] text-[#737373]">
                  Henüz kayıt yok. İlk kaydet → v1 oluşturulur.
                </p>
              )}
            </div>
            <div className="bz-card p-5">
              <h3 className="bz-h-tight text-[14px] tracking-[-0.02em]">Değişkenler</h3>
              <p className="mt-1 text-[11.5px] leading-[1.55] text-[#737373]">
                İçerikte <code className="rounded bg-[#FAFAFA] px-1 py-0.5 text-[10px]">{'{{COMPANY_NAME}}'}</code> gibi
                placeholder&apos;lar yazıldığında, public sayfa render edilirken otomatik gerçek değerle değiştirilir.
              </p>
              <Link
                href="/admin/legal-documents/variables"
                className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#0A0A0A] underline decoration-[#A8D62E] decoration-2 underline-offset-4 hover:text-[#A8D62E]"
              >
                Değişkenleri yönet →
              </Link>
            </div>
            <AlertBanner kind="warn">
              <div className="text-[12px] leading-[1.55]">
                Hukuki taslaktır; yayına almadan önce hukuk danışmanı veya KVKK uzmanı tarafından
                onaylanması gerekir.
              </div>
            </AlertBanner>
          </aside>
        </div>
      )}

      {showPreview && (
        <Modal onClose={() => setShowPreview(false)} size="lg">
          <div className="flex items-center justify-between border-b border-[#EDEDED] px-5 py-3">
            <h3 className="bz-h-tight text-[15px]">Ön izleme — {title}</h3>
            <button
              type="button"
              className="bz-btn-icon"
              onClick={() => setShowPreview(false)}
              aria-label="Kapat"
            >
              <X size={16} />
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
            <article className="prose-legal">{previewBlocks}</article>
          </div>
        </Modal>
      )}

      {showHistory && (
        <Modal onClose={() => setShowHistory(false)} size="lg">
          <div className="flex items-center justify-between border-b border-[#EDEDED] px-5 py-3">
            <h3 className="bz-h-tight text-[15px]">Versiyon geçmişi</h3>
            <button
              type="button"
              className="bz-btn-icon"
              onClick={() => setShowHistory(false)}
              aria-label="Kapat"
            >
              <X size={16} />
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
            {revisionsLoading ? (
              <div className="flex items-center gap-2 text-[#737373]">
                <Loader2 size={18} className="animate-spin" />
                Yükleniyor...
              </div>
            ) : !revisions || revisions.length === 0 ? (
              <p className="text-[13px] text-[#737373]">Henüz geçmiş yok.</p>
            ) : (
              <ul className="divide-y divide-[#EDEDED]">
                {revisions.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge kind="lime">v{r.version}</Badge>
                        <Badge kind={EDIT_TYPE_KIND[r.editType] ?? 'ghost'}>
                          {EDIT_TYPE_LABEL[r.editType] ?? r.editType}
                        </Badge>
                      </div>
                      <div className="mt-1 truncate text-[13px] text-[#0A0A0A]">{r.title}</div>
                      <div className="mt-0.5 text-[11.5px] text-[#737373]">
                        {new Date(r.createdAt).toLocaleString('tr-TR')}
                        {r.editor && ` · ${r.editor.username}`}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRevert(r.id)}
                      disabled={reverting === r.id}
                      className="bz-btn-ghost shrink-0"
                    >
                      {reverting === r.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <RotateCcw size={14} />
                      )}
                      Bu sürüme dön
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Modal>
      )}

      {showDelete && (
        <Modal onClose={() => !deleting && setShowDelete(false)} size="sm">
          <div className="px-5 py-4">
            <h3 className="bz-h-tight text-[15px]">Belgeyi sil?</h3>
            <p className="mt-2 text-[13px] leading-[1.6] text-[#525252]">
              Bu işlem belgeyi siler ve public surface&apos;lerde kod default&apos;una düşürür.
              Versiyon geçmişi audit için korunur. Geri almak için &quot;Geçmiş&quot; üzerinden eski
              sürüme dönebilirsin.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="bz-btn-ghost"
                onClick={() => setShowDelete(false)}
                disabled={deleting}
              >
                İptal
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="bz-btn-primary bg-[#991B1B] hover:bg-[#7f1414]"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Sil
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
