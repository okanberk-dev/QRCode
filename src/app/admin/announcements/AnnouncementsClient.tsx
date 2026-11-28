'use client';

import { useState, useEffect, useCallback, useId, useRef } from 'react';
import { Plus, Pencil, Trash2, Megaphone, Save, Loader2 } from 'lucide-react';
import {
  AlertBanner,
  APSwitch,
  Badge,
  type BadgeKind,
  EmptyState,
  Modal,
  PageHeader,
  Tabs,
  type TabItem,
  useConfirmDialog,
} from '@/components/ui';

type Severity = 'info' | 'success' | 'warning' | 'critical';
type Status = 'draft' | 'published';
type Locale = 'tr' | 'en' | 'all';

interface Announcement {
  id: string;
  title: string;
  message: string;
  status: Status;
  severity: Severity;
  locale: Locale;
  priority: number;
  startDate: string | null;
  endDate: string | null;
  ctaText: string | null;
  ctaLink: string | null;
  isDismissible: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormState {
  title: string;
  message: string;
  status: Status;
  severity: Severity;
  locale: Locale;
  priority: number;
  startDate: string;
  endDate: string;
  ctaText: string;
  ctaLink: string;
  isDismissible: boolean;
}

const EMPTY_FORM: FormState = {
  title: '',
  message: '',
  status: 'published',
  severity: 'info',
  locale: 'all',
  priority: 0,
  startDate: '',
  endDate: '',
  ctaText: '',
  ctaLink: '',
  isDismissible: true,
};

const FIELD_LABEL = 'mb-2 block text-[14px] font-medium leading-[1.3] text-pn-ink';
const FIELD_HINT = 'mt-1.5 text-[12px] leading-[1.45] text-[#737373]';

const SEVERITY_META: Record<Severity, { label: string; kind: BadgeKind }> = {
  info: { label: 'Bilgi', kind: 'info' },
  success: { label: 'Başarı', kind: 'ok' },
  warning: { label: 'Uyarı', kind: 'warn' },
  critical: { label: 'Kritik', kind: 'danger' },
};

const toLocalInputDateTime = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Server hydration shape — prisma returns status/severity/locale as raw
// string; client narrows at usage sites. Allows the server page.tsx to pass
// SSR-fetched rows without literal-union casts.
interface AnnouncementInput {
  id: string;
  title: string;
  message: string;
  status: string;
  severity: string;
  locale: string;
  priority: number;
  startDate: string | null;
  endDate: string | null;
  ctaText: string | null;
  ctaLink: string | null;
  isDismissible: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AnnouncementsClientProps {
  initialAnnouncements?: AnnouncementInput[];
}

export default function AnnouncementsClient({
  initialAnnouncements,
}: AnnouncementsClientProps) {
  // §40.10 server-hydration — initialAnnouncements undefined ise client'ta
  // fetch yapılır, doluysa çift skeleton flash önlenir. Prisma'dan gelen
  // raw string union'lar runtime'da valid Announcement; literal-union cast'i
  // boundary'de yapılır (data API gate'lerinden geçtiği için güvenli).
  const [announcements, setAnnouncements] = useState<Announcement[]>(
    (initialAnnouncements ?? []) as Announcement[],
  );
  const [loading, setLoading] = useState(initialAnnouncements === undefined);
  const skipFirstFetchRef = useRef(initialAnnouncements !== undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Save/validation errors live inside the modal — the page-level banner
  // sits behind the modal backdrop, so 'Kaydet' looked like it did nothing.
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const fid = useId();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [filterStatus, setFilterStatus] = useState<'all' | Status>('all');
  const [confirmDialog, askConfirm] = useConfirmDialog();

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/announcements');
      const data = await res.json();
      setAnnouncements(Array.isArray(data?.announcements) ? data.announcements : []);
    } catch {
      setError('Duyurular yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (skipFirstFetchRef.current) {
      skipFirstFetchRef.current = false;
      return;
    }
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setFormError('');
  };

  const openEdit = (a: Announcement) => {
    setEditing(a);
    setForm({
      title: a.title,
      message: a.message,
      status: a.status,
      severity: a.severity,
      locale: a.locale,
      priority: a.priority,
      startDate: toLocalInputDateTime(a.startDate),
      endDate: toLocalInputDateTime(a.endDate),
      ctaText: a.ctaText || '',
      ctaLink: a.ctaLink || '',
      isDismissible: a.isDismissible,
    });
    setShowForm(true);
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) {
      setFormError('Bitiş tarihi başlangıç tarihinden önce olamaz.');
      return;
    }
    if (form.ctaText.trim() && !form.ctaLink.trim()) {
      setFormError('Buton metni yazdın; butonun açacağı bağlantıyı da ekle.');
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/admin/announcements/${editing.id}` : '/api/admin/announcements';
      const method = editing ? 'PATCH' : 'POST';
      const payload = {
        ...form,
        priority: Number(form.priority) || 0,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        ctaText: form.ctaText.trim() || null,
        ctaLink: form.ctaLink.trim() || null,
      };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const err = data?.error;
        setFormError(
          typeof err === 'string' && err
            ? err
            : typeof err?.message === 'string' && err.message
              ? err.message
              : 'Duyuru kaydedilemedi. Biraz sonra yeniden dene.',
        );
        return;
      }
      setSuccess(editing ? 'Duyuru güncellendi!' : 'Duyuru oluşturuldu!');
      setShowForm(false);
      fetchAnnouncements();
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setFormError('Bağlantı kurulamadı. İnternetini kontrol edip yeniden dene.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, title: string) => {
    askConfirm({
      variant: 'danger',
      title: `"${title}" duyurusu silinsin mi?`,
      body: 'Duyuru işletme panellerinden kalkar ve geri getirilemez.',
      confirmLabel: 'Duyuruyu sil',
      cancelLabel: 'Vazgeç',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' });
          if (res.ok) {
            setAnnouncements(list => list.filter(a => a.id !== id));
            setSuccess('Duyuru silindi.');
            setTimeout(() => setSuccess(''), 3000);
          } else {
            const data = await res.json().catch(() => ({}));
            setError(data.error || 'Duyuru silinemedi. Biraz sonra yeniden dene.');
          }
        } catch {
          setError('Duyuru silinemedi. İnternetini kontrol edip yeniden dene.');
        }
      },
    });
  };

  const filtered = filterStatus === 'all' ? announcements : announcements.filter(a => a.status === filterStatus);

  const tabs: TabItem[] = [
    { id: 'all', label: 'Tümü', count: announcements.length },
    { id: 'published', label: 'Yayında', count: announcements.filter(a => a.status === 'published').length },
    { id: 'draft', label: 'Taslak', count: announcements.filter(a => a.status === 'draft').length },
  ];

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow="SİSTEM DUYURULARI"
        title="Tüm işletmelere ulaş"
        actions={
          <button onClick={openNew} className="bz-btn-primary">
            <Plus size={14} strokeWidth={2} />
            Yeni duyuru
          </button>
        }
      />

      {/* Status filter tabs */}
      <Tabs
        items={tabs}
        active={filterStatus}
        onChange={(id) => setFilterStatus(id as 'all' | Status)}
        ariaLabel="Status filter"
        className="mb-3.5"
      />

      {/* Alerts */}
      {error && (
        <div className="mt-3.5">
          <AlertBanner kind="danger" onDismiss={() => setError('')}>
            {error}
          </AlertBanner>
        </div>
      )}
      {success && (
        <div className="mt-3.5">
          <AlertBanner kind="success">{success}</AlertBanner>
        </div>
      )}

      {/* List */}
      {loading ? null : filtered.length === 0 ? (
        <EmptyState
          icon={<Megaphone size={22} />}
          title="Henüz duyuru yok"
          body="İşletme panellerinin üstünde görünecek ilk duyurunuzu oluşturun."
          action={
            <button onClick={openNew} className="bz-btn-primary">
              <Plus size={14} strokeWidth={2} />
              Yeni duyuru
            </button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map(a => {
            const sev = SEVERITY_META[a.severity];
            const isLive =
              a.status === 'published' &&
              (!a.endDate || new Date(a.endDate) >= new Date()) &&
              (!a.startDate || new Date(a.startDate) <= new Date());
            return (
              <article
                key={a.id}
                className="bz-card"
                style={{ padding: 20, opacity: a.status === 'published' ? 1 : 0.7 }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      {isLive ? (
                        <Badge kind="ok">Yayında</Badge>
                      ) : a.status === 'draft' ? (
                        <Badge kind="ghost">Taslak</Badge>
                      ) : (
                        <Badge kind="warn">Planlı</Badge>
                      )}
                      {/* Audience chip — design 1:1 (locale-bazlı) */}
                      <Badge kind="ghost">
                        {a.locale === 'all' ? 'Tüm diller' : a.locale.toUpperCase()}
                      </Badge>
                      {/* Severity badge sadece 'critical' ise göster (vurgu) */}
                      {a.severity === 'critical' && (
                        <Badge kind={sev.kind}>{sev.label}</Badge>
                      )}
                    </div>
                    <div className="bz-h-tight mb-1.5" style={{ fontSize: 16 }}>
                      {a.title}
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: '#525252', lineHeight: 1.55 }}>
                      {a.message}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-[#A3A3A3]">
                      <span>
                        {new Date(a.createdAt).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      {(a.startDate || a.endDate) && (
                        <span className="bz-mono">
                          {a.startDate
                            ? new Date(a.startDate).toLocaleString('tr-TR', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}{' '}
                          →{' '}
                          {a.endDate
                            ? new Date(a.endDate).toLocaleString('tr-TR', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '∞'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0" style={{ gap: 4 }}>
                    <button
                      onClick={() => openEdit(a)}
                      className="bz-btn-icon"
                      title="Düzenle"
                      aria-label="Düzenle"
                    >
                      <Pencil size={14} strokeWidth={2} />
                    </button>
                    <button
                      onClick={() => handleDelete(a.id, a.title)}
                      className="bz-btn-icon"
                      title="Sil"
                      aria-label="Sil"
                    >
                      <Trash2 size={14} strokeWidth={2} className="text-[#991B1B]" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <Modal
          size={760}
          onClose={() => setShowForm(false)}
          icon={editing ? <Pencil size={18} strokeWidth={2} /> : <Megaphone size={18} strokeWidth={2} />}
          title={editing ? 'Duyuruyu düzenle' : 'Yeni duyuru oluştur'}
          description="Duyuru, işletme sahiplerinin panelinin üstünde bir şerit olarak görünür. Müşteriler görmez."
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label htmlFor={`${fid}-title`} className={FIELD_LABEL}>
                Başlık
                <span className="ml-1 text-[#E5484D]" aria-hidden="true">*</span>
              </label>
              <input
                id={`${fid}-title`}
                type="text"
                required
                maxLength={160}
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Örn: Yeni QR tasarımları yayında"
                className="bz-input"
              />
            </div>

            {/* Message */}
            <div>
              <label htmlFor={`${fid}-message`} className={FIELD_LABEL}>
                Mesaj
                <span className="ml-1 text-[#E5484D]" aria-hidden="true">*</span>
              </label>
              <textarea
                id={`${fid}-message`}
                required
                rows={4}
                maxLength={2000}
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Ne değişti, işletme sahibi ne yapmalı? Bir iki cümle yeter."
                className="bz-input resize-none"
              />
            </div>

            {/* Severity & Locale */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <p id={`${fid}-severity`} className={FIELD_LABEL}>Önem derecesi</p>
                <div role="group" aria-labelledby={`${fid}-severity`} className="grid grid-cols-2 gap-1.5 rounded-[18px] bg-pn-canvas p-1.5 sm:grid-cols-4">
                  {(Object.keys(SEVERITY_META) as Severity[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={form.severity === s}
                      onClick={() => setForm(f => ({ ...f, severity: s }))}
                      className={`min-h-11 rounded-[14px] px-2 text-[13px] font-medium transition-colors ${
                        form.severity === s ? 'bg-pn-accent text-white' : 'text-[#737373] hover:text-pn-ink'
                      }`}
                    >
                      {SEVERITY_META[s].label}
                    </button>
                  ))}
                </div>
                <p className={FIELD_HINT}>Şeridin rengini belirler.</p>
              </div>
              <div>
                <p id={`${fid}-locale`} className={FIELD_LABEL}>Kimler görsün</p>
                <div role="group" aria-labelledby={`${fid}-locale`} className="grid grid-cols-3 gap-1.5 rounded-[18px] bg-pn-canvas p-1.5">
                  {(['all', 'tr', 'en'] as Locale[]).map(l => (
                    <button
                      key={l}
                      type="button"
                      aria-pressed={form.locale === l}
                      onClick={() => setForm(f => ({ ...f, locale: l }))}
                      className={`min-h-11 rounded-[14px] px-2 text-[13px] font-medium transition-colors ${
                        form.locale === l ? 'bg-pn-accent text-white' : 'text-[#737373] hover:text-pn-ink'
                      }`}
                    >
                      {l === 'all' ? 'Herkes' : l === 'tr' ? 'Türkçe' : 'İngilizce'}
                    </button>
                  ))}
                </div>
                <p className={FIELD_HINT}>Paneli seçtiğin dilde kullananlara gösterilir.</p>
              </div>
            </div>

            {/* Dates & Priority */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div>
                <label htmlFor={`${fid}-start`} className={FIELD_LABEL}>Başlangıç</label>
                <input
                  id={`${fid}-start`}
                  type="datetime-local"
                  value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  aria-describedby={`${fid}-start-hint`}
                  className="bz-input"
                />
                <p id={`${fid}-start-hint`} className={FIELD_HINT}>Boş bırakırsan yayınlanınca başlar.</p>
              </div>
              <div>
                <label htmlFor={`${fid}-end`} className={FIELD_LABEL}>Bitiş</label>
                <input
                  id={`${fid}-end`}
                  type="datetime-local"
                  value={form.endDate}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  aria-describedby={`${fid}-end-hint`}
                  className="bz-input"
                />
                <p id={`${fid}-end-hint`} className={FIELD_HINT}>Boş bırakırsan sen kaldırana kadar kalır.</p>
              </div>
              <div>
                <label htmlFor={`${fid}-priority`} className={FIELD_LABEL}>Öncelik</label>
                <input
                  id={`${fid}-priority`}
                  type="number"
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))}
                  aria-describedby={`${fid}-priority-hint`}
                  className="bz-input"
                />
                <p id={`${fid}-priority-hint`} className={FIELD_HINT}>Büyük sayı listede üstte durur.</p>
              </div>
            </div>

            {/* Optional button */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label htmlFor={`${fid}-ctatext`} className={FIELD_LABEL}>Buton metni</label>
                <input
                  id={`${fid}-ctatext`}
                  type="text"
                  maxLength={60}
                  value={form.ctaText}
                  onChange={e => setForm(f => ({ ...f, ctaText: e.target.value }))}
                  placeholder="Detayları gör"
                  aria-describedby={`${fid}-ctatext-hint`}
                  className="bz-input"
                />
                <p id={`${fid}-ctatext-hint`} className={FIELD_HINT}>İsteğe bağlı. Boşsa buton gösterilmez.</p>
              </div>
              <div>
                <label htmlFor={`${fid}-ctalink`} className={FIELD_LABEL}>Buton bağlantısı</label>
                <input
                  id={`${fid}-ctalink`}
                  type="url"
                  value={form.ctaLink}
                  onChange={e => setForm(f => ({ ...f, ctaLink: e.target.value }))}
                  placeholder="https://..."
                  aria-describedby={`${fid}-ctalink-hint`}
                  className="bz-input"
                />
                <p id={`${fid}-ctalink-hint`} className={FIELD_HINT}>Buton metni yazdıysan gerekli.</p>
              </div>
            </div>

            {/* Dismissible + status */}
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
              <div className="rounded-[20px] bg-pn-canvas p-4">
                <APSwitch
                  checked={form.isDismissible}
                  onChange={() => setForm(f => ({ ...f, isDismissible: !f.isDismissible }))}
                  label="Kapatılabilsin"
                  sublabel={
                    form.isDismissible
                      ? 'İşletme sahibi duyuruyu kapatabilir.'
                      : 'Duyuru bitiş tarihine kadar hep görünür.'
                  }
                />
              </div>
              <div className="rounded-[20px] bg-pn-canvas p-4">
                <APSwitch
                  checked={form.status === 'published'}
                  onChange={() => setForm(f => ({ ...f, status: f.status === 'published' ? 'draft' : 'published' }))}
                  label="Yayınla"
                  sublabel={
                    form.status === 'published'
                      ? 'Kaydedince işletme panellerinde görünür.'
                      : 'Taslak kalır; yalnız yöneticiler görür.'
                  }
                />
              </div>
            </div>

            {formError && (
              <AlertBanner kind="danger" onDismiss={() => setFormError('')}>
                {formError}
              </AlertBanner>
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse gap-2 border-t border-pn-line pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bz-btn-ghost"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bz-btn-primary disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving
                  ? 'Kaydediliyor…'
                  : editing
                    ? 'Değişiklikleri kaydet'
                    : form.status === 'published'
                      ? 'Duyuruyu yayınla'
                      : 'Taslağı kaydet'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {confirmDialog}
    </div>
  );
}
