'use client';

import { useState, useEffect, useCallback, useId, useRef } from 'react';
import { Plus, Pencil, Trash2, Megaphone, Save, Loader2 } from 'lucide-react';
import {
  AlertBanner,
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
      setFormError('CTA metni için bir bağlantı gerekli.');
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
              : 'İşlem başarısız.',
        );
        return;
      }
      setSuccess(editing ? 'Duyuru güncellendi!' : 'Duyuru oluşturuldu!');
      setShowForm(false);
      fetchAnnouncements();
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setFormError('Kaydetme sırasında hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, title: string) => {
    askConfirm({
      variant: 'danger',
      title: 'Bu duyuruyu sil',
      body: `"${title}" duyurusunu kalıcı olarak silmek istediğinden emin misin? Bu işlem geri alınamaz.`,
      confirmLabel: 'Sil',
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
            setError(data.error || 'Silme başarısız.');
          }
        } catch {
          setError('Silme başarısız.');
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
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#A3A3A3]">
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
          title={
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 shrink-0 bg-[#EAF9B8] rounded-xl flex items-center justify-center">
                {editing ? <Pencil size={18} className="text-[#0A0A0A]" strokeWidth={2} /> : <Plus size={18} className="text-[#0A0A0A]" strokeWidth={2} />}
              </div>
              <div className="min-w-0">
                <h2 className="text-[18px] font-medium tracking-[-0.015em] text-[#0A0A0A] truncate">
                  {editing ? 'Duyuruyu düzenle' : 'Yeni duyuru'}
                </h2>
                <p className="pulse-eyebrow text-[#737373] mt-0.5">
                  İşletme panellerinde gösterilecek
                </p>
              </div>
            </div>
          }
        >
            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              {/* Title */}
              <div>
                <label htmlFor={`${fid}-title`} className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-[0.2em] mb-3">BAŞLIK</label>
                <input
                  id={`${fid}-title`}
                  type="text"
                  required
                  maxLength={160}
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Örn: Yeni QR tasarımları yayında!"
                  className="w-full bg-[#FFFFFF] border border-[#EDEDED] rounded-xl px-5 py-3.5 text-[#0A0A0A] text-sm font-bold placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#C6F24E] focus:bg-white transition-all shadow-sm"
                />
              </div>

              {/* Message */}
              <div>
                <label htmlFor={`${fid}-message`} className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-[0.2em] mb-3">MESAJ</label>
                <textarea
                  id={`${fid}-message`}
                  required
                  rows={4}
                  maxLength={2000}
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Detayları buraya yazın..."
                  className="w-full bg-[#FFFFFF] border border-[#EDEDED] rounded-xl px-5 py-3.5 text-[#0A0A0A] text-sm font-medium placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#C6F24E] focus:bg-white transition-all resize-none"
                />
              </div>

              {/* Severity & Locale */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p id={`${fid}-severity`} className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-[0.2em] mb-3">ÖNEM DERECESİ</p>
                  <div role="group" aria-labelledby={`${fid}-severity`} className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-[#FFFFFF] rounded-[18px]">
                    {(Object.keys(SEVERITY_META) as Severity[]).map(s => (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={form.severity === s}
                        onClick={() => setForm(f => ({ ...f, severity: s }))}
                        className={`py-2.5 rounded-xl text-[10px] font-semibold uppercase tracking-wider transition-all ${
                          form.severity === s ? 'bg-[#0A0A0A] text-white shadow-lg' : 'text-[#6B7280] hover:text-[#0A0A0A]'
                        }`}
                      >
                        {SEVERITY_META[s].label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p id={`${fid}-locale`} className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-[0.2em] mb-3">DİL</p>
                  <div role="group" aria-labelledby={`${fid}-locale`} className="grid grid-cols-3 gap-2 p-1.5 bg-[#FFFFFF] rounded-[18px]">
                    {(['all', 'tr', 'en'] as Locale[]).map(l => (
                      <button
                        key={l}
                        type="button"
                        aria-pressed={form.locale === l}
                        onClick={() => setForm(f => ({ ...f, locale: l }))}
                        className={`py-2.5 rounded-xl text-[10px] font-semibold uppercase tracking-wider transition-all ${
                          form.locale === l ? 'bg-[#0A0A0A] text-white shadow-lg' : 'text-[#6B7280] hover:text-[#0A0A0A]'
                        }`}
                      >
                        {l === 'all' ? 'TÜMÜ' : l.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dates & Priority */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor={`${fid}-start`} className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-[0.2em] mb-3">BAŞLANGIÇ</label>
                  <input
                    id={`${fid}-start`}
                    type="datetime-local"
                    value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full bg-[#FFFFFF] border border-[#EDEDED] rounded-xl px-5 py-3.5 text-[#0A0A0A] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#C6F24E] focus:bg-white transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label htmlFor={`${fid}-end`} className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-[0.2em] mb-3">BİTİŞ</label>
                  <input
                    id={`${fid}-end`}
                    type="datetime-local"
                    value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full bg-[#FFFFFF] border border-[#EDEDED] rounded-xl px-5 py-3.5 text-[#0A0A0A] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#C6F24E] focus:bg-white transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label htmlFor={`${fid}-priority`} className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-[0.2em] mb-3">ÖNCELİK</label>
                  <input
                    id={`${fid}-priority`}
                    type="number"
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))}
                    className="w-full bg-[#FFFFFF] border border-[#EDEDED] rounded-xl px-5 py-3.5 text-[#0A0A0A] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#C6F24E] focus:bg-white transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* CTA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor={`${fid}-ctatext`} className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-[0.2em] mb-3">CTA METNİ (OPSİYONEL)</label>
                  <input
                    id={`${fid}-ctatext`}
                    type="text"
                    maxLength={60}
                    value={form.ctaText}
                    onChange={e => setForm(f => ({ ...f, ctaText: e.target.value }))}
                    placeholder="Detayları gör"
                    className="w-full bg-[#FFFFFF] border border-[#EDEDED] rounded-xl px-5 py-3.5 text-[#0A0A0A] text-sm font-bold placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#C6F24E] focus:bg-white transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label htmlFor={`${fid}-ctalink`} className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-[0.2em] mb-3">CTA BAĞLANTISI</label>
                  <input
                    id={`${fid}-ctalink`}
                    type="url"
                    value={form.ctaLink}
                    onChange={e => setForm(f => ({ ...f, ctaLink: e.target.value }))}
                    placeholder="https://..."
                    className="w-full bg-[#FFFFFF] border border-[#EDEDED] rounded-xl px-5 py-3.5 text-[#0A0A0A] text-sm font-bold placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#C6F24E] focus:bg-white transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Dismissible + status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-5 bg-[#FFFFFF] rounded-xl border border-[#EDEDED]">
                  <div className="space-y-0.5">
                    <p className="text-[#0A0A0A] text-[13px] font-semibold uppercase tracking-tight">{form.isDismissible ? 'KAPATILABİLİR' : 'HER ZAMAN GÖRÜNÜR'}</p>
                    <p className="text-[#6B7280] text-[11px] font-bold">{form.isDismissible ? 'Kullanıcı banner\u2019ı kapatabilir.' : 'Banner kapatılamaz.'}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.isDismissible}
                    aria-label="Kullanıcı duyuruyu kapatabilsin"
                    onClick={() => setForm(f => ({ ...f, isDismissible: !f.isDismissible }))}
                    className={`relative w-12 h-6.5 rounded-full transition-all duration-300 ${form.isDismissible ? 'bg-[#C6F24E]' : 'bg-[#C9D0DB]'}`}
                  >
                    <span className={`absolute top-1 left-1 w-4.5 h-4.5 bg-white rounded-full transition-all duration-300 ${form.isDismissible ? 'translate-x-5.5' : ''}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-5 bg-[#FFFFFF] rounded-xl border border-[#EDEDED]">
                  <div className="space-y-0.5">
                    <p className="text-[#0A0A0A] text-[13px] font-semibold uppercase tracking-tight">{form.status === 'published' ? 'YAYINDA' : 'TASLAK'}</p>
                    <p className="text-[#6B7280] text-[11px] font-bold">{form.status === 'published' ? 'Tüm işletme panellerinde görünür.' : 'Sadece admin panelinde.'}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.status === 'published'}
                    aria-label="Duyuruyu yayınla"
                    onClick={() => setForm(f => ({ ...f, status: f.status === 'published' ? 'draft' : 'published' }))}
                    className={`relative w-12 h-6.5 rounded-full transition-all duration-300 ${form.status === 'published' ? 'bg-[#C6F24E]' : 'bg-[#C9D0DB]'}`}
                  >
                    <span className={`absolute top-1 left-1 w-4.5 h-4.5 bg-white rounded-full transition-all duration-300 ${form.status === 'published' ? 'translate-x-5.5' : ''}`} />
                  </button>
                </div>
              </div>

              {formError && (
                <AlertBanner kind="danger" onDismiss={() => setFormError('')}>
                  {formError}
                </AlertBanner>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-5 border-t border-[#EDEDED]">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bz-btn-ghost"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bz-btn-primary disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {editing ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </form>
        </Modal>
      )}
      {confirmDialog}
    </div>
  );
}
