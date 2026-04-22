'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Megaphone, X, Save, Loader2, AlertTriangle, Info, CheckCircle2, AlertOctagon } from 'lucide-react';

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
  status: 'draft',
  severity: 'info',
  locale: 'all',
  priority: 0,
  startDate: '',
  endDate: '',
  ctaText: '',
  ctaLink: '',
  isDismissible: true,
};

const SEVERITY_META: Record<Severity, { label: string; dot: string; chip: string; icon: typeof Info }> = {
  info: { label: 'Bilgi', dot: 'bg-slate-500', chip: 'bg-slate-50 text-slate-600', icon: Info },
  success: { label: 'Başarı', dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-600', icon: CheckCircle2 },
  warning: { label: 'Uyarı', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-600', icon: AlertTriangle },
  critical: { label: 'Kritik', dot: 'bg-red-500', chip: 'bg-red-50 text-red-600', icon: AlertOctagon },
};

const toLocalInputDateTime = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [filterStatus, setFilterStatus] = useState<'all' | Status>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/announcements');
      const data = await res.json();
      setAnnouncements(data.announcements || []);
    } catch {
      setError('Duyurular yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError('');
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
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
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
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'İşlem başarısız.');
        return;
      }
      setSuccess(editing ? 'Duyuru güncellendi!' : 'Duyuru oluşturuldu!');
      setShowForm(false);
      fetchAnnouncements();
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Kaydetme sırasında hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
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
    } finally {
      setDeleteConfirm(null);
    }
  };

  const filtered = filterStatus === 'all' ? announcements : announcements.filter(a => a.status === filterStatus);

  return (
    <div className="flex-1 min-h-screen bg-[#F8F6F1] p-3 sm:p-6 md:p-10 space-y-8">
      {/* Banner Header */}
      <div className="bg-[#1A2332] rounded-[24px] sm:rounded-[32px] border border-white/10 p-6 sm:p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 bg-[#F4B400]/10 text-[#F4B400] px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em]">
            ✦ İLETİŞİM MERKEZİ
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">Duyurular</h1>
          <p className="text-white/80 text-sm sm:text-base font-medium max-w-md">
            Restoran panellerinin üstünde tüm müşterilerinize duyurular gösterin.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center relative z-10">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/10 text-center">
            <p className="text-2xl font-black text-white">{announcements.filter(a => a.status === 'published').length}</p>
            <p className="text-[10px] text-[#6B7280] font-bold uppercase tracking-widest mt-1">Yayında</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/10 text-center">
            <p className="text-2xl font-black text-white">{announcements.length}</p>
            <p className="text-[10px] text-[#6B7280] font-bold uppercase tracking-widest mt-1">Toplam</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-[20px] border border-[#E8ECF2] shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {([
            { k: 'all', label: 'TÜMÜ' },
            { k: 'published', label: 'YAYINDA' },
            { k: 'draft', label: 'TASLAK' },
          ] as const).map(f => (
            <button
              key={f.k}
              onClick={() => setFilterStatus(f.k as 'all' | Status)}
              className={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                filterStatus === f.k ? 'bg-[#1A2332] text-white shadow-md' : 'bg-[#F8F6F1] text-[#6B7280] hover:bg-[#E8ECF2]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={openNew}
          className="flex items-center gap-2 px-6 py-3 bg-[#F4B400] text-[#1A2332] rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#f5b914] transition-all shadow-lg shadow-[#F4B400]/10 active:scale-95"
        >
          <Plus size={18} strokeWidth={2} />
          Yeni Duyuru
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-6 py-4 text-red-600 text-sm font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            {error}
          </div>
          <button onClick={() => setError('')} className="p-1 hover:bg-red-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-6 py-4 text-emerald-600 text-sm font-bold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          {success}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-[#F4B400]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-[32px] border border-[#E8ECF2] shadow-sm p-16 text-center space-y-4">
          <div className="w-20 h-20 bg-[#F8F6F1] rounded-[28px] flex items-center justify-center mx-auto">
            <Megaphone size={40} className="text-[#E8ECF2]" />
          </div>
          <p className="text-xl font-black text-[#1A2332]">Henüz duyuru bulunamadı</p>
          <p className="text-[#6B7280] text-sm max-w-sm mx-auto font-medium">
            Restoran panellerinin üstünde görünecek ilk duyurunuzu oluşturun.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(a => {
            const sev = SEVERITY_META[a.severity];
            const SevIcon = sev.icon;
            const isLive = a.status === 'published' && (!a.endDate || new Date(a.endDate) >= new Date()) && (!a.startDate || new Date(a.startDate) <= new Date());
            return (
              <div
                key={a.id}
                className={`bg-white border rounded-[24px] p-5 flex flex-col sm:flex-row sm:items-center gap-5 transition-all hover:shadow-md hover:border-[#F4B400]/30 ${
                  a.status === 'published' ? 'border-[#E8ECF2]' : 'border-[#E8ECF2] opacity-70'
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${sev.chip}`}>
                  <SevIcon size={22} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className={`text-[10px] font-black uppercase tracking-[0.1em] px-2.5 py-1 rounded-lg ${sev.chip}`}>{sev.label}</span>
                    <span className={`text-[10px] font-black uppercase tracking-[0.1em] px-2.5 py-1 rounded-lg ${isLive ? 'bg-emerald-50 text-emerald-600' : 'bg-[#F8F6F1] text-[#6B7280]'}`}>
                      {isLive ? 'YAYINDA' : a.status === 'draft' ? 'TASLAK' : 'YAYINDA DEĞİL'}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-[0.1em] px-2.5 py-1 rounded-lg bg-[#F8F6F1] text-[#6B7280]">
                      {a.locale === 'all' ? 'TÜM DİLLER' : a.locale === 'tr' ? 'TR' : 'EN'}
                    </span>
                    {a.priority !== 0 && (
                      <span className="text-[10px] font-black uppercase tracking-[0.1em] px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600">
                        #P{a.priority}
                      </span>
                    )}
                  </div>
                  <h3 className="text-[#1A2332] font-bold text-[15px] leading-tight">{a.title}</h3>
                  <p className="text-[#6B7280] text-sm mt-1 line-clamp-2">{a.message}</p>
                  {(a.startDate || a.endDate) && (
                    <p className="mt-2 text-[#6B7280] text-[11px] font-bold uppercase tracking-wider">
                      {a.startDate ? new Date(a.startDate).toLocaleString('tr-TR') : '—'} → {a.endDate ? new Date(a.endDate).toLocaleString('tr-TR') : '∞'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 border-t sm:border-t-0 sm:border-l border-[#E8ECF2] pt-4 sm:pt-0 sm:pl-4">
                  <button
                    onClick={() => openEdit(a)}
                    className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center transition-all"
                    title="Düzenle"
                  >
                    <Pencil size={18} strokeWidth={2} />
                  </button>
                  {deleteConfirm === a.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="px-4 py-2 text-[10px] font-black text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-lg shadow-red-500/20"
                      >
                        SİL
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-4 py-2 text-[10px] font-black text-[#6B7280] bg-[#E8ECF2] hover:bg-[#E8ECF2] rounded-xl transition-all"
                      >
                        İPTAL
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(a.id)}
                      className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-all"
                      title="Sil"
                    >
                      <Trash2 size={18} strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-[#1A2332]/60 backdrop-blur-md z-60 flex items-start justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-[24px] sm:rounded-[32px] w-full max-w-3xl my-4 sm:my-8 shadow-2xl border border-[#E8ECF2] overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-6 md:p-8 border-b border-[#F8F6F1] gap-3">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 bg-[#F4B400]/10 rounded-2xl flex items-center justify-center">
                  {editing ? <Pencil size={20} className="text-[#F4B400]" strokeWidth={2} /> : <Plus size={20} className="text-[#F4B400]" strokeWidth={2} />}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#1A2332] truncate">{editing ? 'Duyuruyu Düzenle' : 'Yeni Duyuru'}</h2>
                  <p className="text-[#6B7280] text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-0.5">Restoran panellerinde gösterilecek</p>
                </div>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="w-10 h-10 shrink-0 flex items-center justify-center text-[#6B7280] hover:text-[#1A2332] hover:bg-[#F8F6F1] rounded-xl transition-all"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6">
              {/* Title */}
              <div>
                <label className="block text-[10px] font-black text-[#6B7280] uppercase tracking-[0.2em] mb-3">BAŞLIK</label>
                <input
                  type="text"
                  required
                  maxLength={160}
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Örn: Yeni QR tasarımları yayında!"
                  className="w-full bg-[#F8F6F1] border border-[#E8ECF2] rounded-xl px-5 py-3.5 text-[#1A2332] text-sm font-bold placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#F4B400] focus:bg-white transition-all shadow-sm"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-[10px] font-black text-[#6B7280] uppercase tracking-[0.2em] mb-3">MESAJ</label>
                <textarea
                  required
                  rows={4}
                  maxLength={2000}
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Detayları buraya yazın..."
                  className="w-full bg-[#F8F6F1] border border-[#E8ECF2] rounded-xl px-5 py-3.5 text-[#1A2332] text-sm font-medium placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#F4B400] focus:bg-white transition-all shadow-sm resize-none"
                />
              </div>

              {/* Severity & Locale */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-[#6B7280] uppercase tracking-[0.2em] mb-3">ÖNEM DERECESİ</label>
                  <div className="grid grid-cols-4 gap-2 p-1.5 bg-[#F8F6F1] rounded-[18px]">
                    {(Object.keys(SEVERITY_META) as Severity[]).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, severity: s }))}
                        className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                          form.severity === s ? 'bg-[#1A2332] text-white shadow-lg' : 'text-[#6B7280] hover:text-[#1A2332]'
                        }`}
                      >
                        {SEVERITY_META[s].label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-[#6B7280] uppercase tracking-[0.2em] mb-3">DİL</label>
                  <div className="grid grid-cols-3 gap-2 p-1.5 bg-[#F8F6F1] rounded-[18px]">
                    {(['all', 'tr', 'en'] as Locale[]).map(l => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, locale: l }))}
                        className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                          form.locale === l ? 'bg-[#1A2332] text-white shadow-lg' : 'text-[#6B7280] hover:text-[#1A2332]'
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
                  <label className="block text-[10px] font-black text-[#6B7280] uppercase tracking-[0.2em] mb-3">BAŞLANGIÇ</label>
                  <input
                    type="datetime-local"
                    value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full bg-[#F8F6F1] border border-[#E8ECF2] rounded-xl px-5 py-3.5 text-[#1A2332] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#F4B400] focus:bg-white transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-[#6B7280] uppercase tracking-[0.2em] mb-3">BİTİŞ</label>
                  <input
                    type="datetime-local"
                    value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full bg-[#F8F6F1] border border-[#E8ECF2] rounded-xl px-5 py-3.5 text-[#1A2332] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#F4B400] focus:bg-white transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-[#6B7280] uppercase tracking-[0.2em] mb-3">ÖNCELİK</label>
                  <input
                    type="number"
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))}
                    className="w-full bg-[#F8F6F1] border border-[#E8ECF2] rounded-xl px-5 py-3.5 text-[#1A2332] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#F4B400] focus:bg-white transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* CTA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-[#6B7280] uppercase tracking-[0.2em] mb-3">CTA METNİ (OPSİYONEL)</label>
                  <input
                    type="text"
                    maxLength={60}
                    value={form.ctaText}
                    onChange={e => setForm(f => ({ ...f, ctaText: e.target.value }))}
                    placeholder="Detayları gör"
                    className="w-full bg-[#F8F6F1] border border-[#E8ECF2] rounded-xl px-5 py-3.5 text-[#1A2332] text-sm font-bold placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#F4B400] focus:bg-white transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-[#6B7280] uppercase tracking-[0.2em] mb-3">CTA BAĞLANTISI</label>
                  <input
                    type="url"
                    value={form.ctaLink}
                    onChange={e => setForm(f => ({ ...f, ctaLink: e.target.value }))}
                    placeholder="https://..."
                    className="w-full bg-[#F8F6F1] border border-[#E8ECF2] rounded-xl px-5 py-3.5 text-[#1A2332] text-sm font-bold placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#F4B400] focus:bg-white transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Dismissible + status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-5 bg-[#F8F6F1] rounded-[20px] border border-[#E8ECF2]">
                  <div className="space-y-0.5">
                    <p className="text-[#1A2332] text-[13px] font-black uppercase tracking-tight">{form.isDismissible ? 'KAPATILABİLİR' : 'HER ZAMAN GÖRÜNÜR'}</p>
                    <p className="text-[#6B7280] text-[11px] font-bold">{form.isDismissible ? 'Kullanıcı banner\u2019ı kapatabilir.' : 'Banner kapatılamaz.'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, isDismissible: !f.isDismissible }))}
                    className={`relative w-12 h-6.5 rounded-full transition-all duration-300 ${form.isDismissible ? 'bg-[#F4B400]' : 'bg-[#C9D0DB]'}`}
                  >
                    <span className={`absolute top-1 left-1 w-4.5 h-4.5 bg-white rounded-full shadow-md transition-all duration-300 ${form.isDismissible ? 'translate-x-5.5' : ''}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-5 bg-[#F8F6F1] rounded-[20px] border border-[#E8ECF2]">
                  <div className="space-y-0.5">
                    <p className="text-[#1A2332] text-[13px] font-black uppercase tracking-tight">{form.status === 'published' ? 'YAYINDA' : 'TASLAK'}</p>
                    <p className="text-[#6B7280] text-[11px] font-bold">{form.status === 'published' ? 'Tüm restoranlarda görünür.' : 'Sadece admin panelinde.'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, status: f.status === 'published' ? 'draft' : 'published' }))}
                    className={`relative w-12 h-6.5 rounded-full transition-all duration-300 ${form.status === 'published' ? 'bg-emerald-500' : 'bg-[#C9D0DB]'}`}
                  >
                    <span className={`absolute top-1 left-1 w-4.5 h-4.5 bg-white rounded-full shadow-md transition-all duration-300 ${form.status === 'published' ? 'translate-x-5.5' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#F8F6F1]">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-8 py-3.5 text-[#6B7280] hover:text-[#1A2332] font-black text-xs uppercase tracking-widest transition-all"
                >
                  İPTAL
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-10 py-3.5 bg-[#1A2332] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#2A3444] transition-all shadow-xl shadow-[#E8ECF2] disabled:opacity-50 active:scale-95"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {editing ? 'GÜNCELLE' : 'KAYDET'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
