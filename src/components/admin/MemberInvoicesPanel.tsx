'use client';

import { useEffect, useState } from 'react';
import { Check, Download, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { AlertBanner, Badge, type BadgeKind } from '@/components/ui';

interface Invoice {
  id: string;
  invoiceNumber: string | null;
  amount: number;
  currency: string;
  status: string;
  pdfUrl: string | null;
  description: string | null;
  adminNotes: string | null;
  issuedAt: string;
  updatedAt: string;
}

interface InvoiceForm {
  invoiceNumber: string;
  issuedAt: string;
  description: string;
  amount: string;
  currency: string;
  status: string;
  pdfUrl: string;
  adminNotes: string;
}

const EMPTY_FORM: InvoiceForm = {
  invoiceNumber: '',
  issuedAt: '',
  description: '',
  amount: '',
  currency: 'TRY',
  status: 'paid',
  pdfUrl: '',
  adminNotes: '',
};

const STATUS_OPTIONS = [
  { v: 'paid', l: 'Ödendi' },
  { v: 'pending', l: 'Bekliyor' },
  { v: 'failed', l: 'Başarısız' },
  { v: 'refunded', l: 'İade' },
];
const STATUS_KIND: Record<string, BadgeKind> = {
  paid: 'lime',
  pending: 'ghost',
  failed: 'danger',
  refunded: 'info',
};
const STATUS_LABEL: Record<string, string> = {
  paid: 'ÖDENDİ',
  pending: 'BEKLİYOR',
  failed: 'BAŞARISIZ',
  refunded: 'İADE',
};
const CURRENCY_OPTIONS = ['TRY', 'USD', 'EUR', 'GBP'];

const ERROR_LABELS: Record<string, string> = {
  invalid_amount: 'Geçersiz tutar.',
  invalid_currency: 'Geçersiz para birimi.',
  invalid_status: 'Geçersiz durum.',
  invalid_issued_at: 'Geçersiz tarih.',
  invalid_description: 'Açıklama 200 karakteri aşamaz.',
  invalid_admin_notes: 'Admin notu 2000 karakteri aşamaz.',
  invalid_pdf_url: 'Geçerli bir http(s) URL girin.',
  invalid_invoice_number: 'Fatura no 40 karakteri aşamaz.',
  invoice_number_taken: 'Bu fatura numarası zaten kullanılıyor.',
  invoice_not_found: 'Fatura bulunamadı.',
  forbidden: 'Yetkisiz erişim.',
};

function fmt(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(0)}`;
  }
}

function dateLabel(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

interface MemberInvoicesPanelProps {
  userId: string;
}

export default function MemberInvoicesPanel({ userId }: MemberInvoicesPanelProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // form state — used for both create and edit
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<InvoiceForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/members/${userId}/invoices`);
      if (!res.ok) throw new Error('load_failed');
      const data = await res.json();
      setInvoices(data.data || []);
    } catch {
      setError('Faturalar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, issuedAt: new Date().toISOString().split('T')[0] });
    setEditingId(null);
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const openEdit = (inv: Invoice) => {
    setForm({
      invoiceNumber: inv.invoiceNumber || '',
      issuedAt: inv.issuedAt.split('T')[0],
      description: inv.description || '',
      amount: String(inv.amount),
      currency: inv.currency,
      status: inv.status,
      pdfUrl: inv.pdfUrl || '',
      adminNotes: inv.adminNotes || '',
    });
    setEditingId(inv.id);
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const url = editingId
        ? `/api/admin/members/${userId}/invoices/${editingId}`
        : `/api/admin/members/${userId}/invoices`;
      const method = editingId ? 'PATCH' : 'POST';
      const body = {
        invoiceNumber: form.invoiceNumber || null,
        issuedAt: form.issuedAt,
        description: form.description || null,
        amount: form.amount,
        currency: form.currency,
        status: form.status,
        pdfUrl: form.pdfUrl || null,
        adminNotes: form.adminNotes || null,
      };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(ERROR_LABELS[data.error] || data.error || 'İşlem başarısız.');
      } else {
        setSuccess(editingId ? 'Fatura güncellendi.' : 'Fatura eklendi.');
        closeForm();
        fetchInvoices();
      }
    } catch {
      setError('Bağlantı hatası.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/members/${userId}/invoices/${deletingId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        setError(ERROR_LABELS[data.error] || data.error || 'Silme başarısız.');
      } else {
        setSuccess('Fatura silindi.');
        setDeletingId(null);
        fetchInvoices();
      }
    } catch {
      setError('Bağlantı hatası.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <AlertBanner kind="danger" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      )}
      {success && (
        <AlertBanner kind="success" onDismiss={() => setSuccess(null)}>
          {success}
        </AlertBanner>
      )}

      {!showForm && (
        <button type="button" onClick={openCreate} className="bz-btn-primary w-full sm:w-auto">
          <Plus size={14} strokeWidth={2} />
          Yeni fatura ekle
        </button>
      )}

      {showForm && (
        <div className="rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[14px] font-semibold text-[#0A0A0A]">
              {editingId ? 'Faturayı düzenle' : 'Yeni fatura'}
            </h4>
            <button
              type="button"
              onClick={closeForm}
              className="text-[#737373] hover:text-[#0A0A0A]"
              aria-label="Formu kapat"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fatura no" hint="Boş bırakılırsa otomatik (INV-YYYY-XX)">
              <input
                type="text"
                maxLength={40}
                value={form.invoiceNumber}
                onChange={(e) => setForm((f) => ({ ...f, invoiceNumber: e.target.value }))}
                placeholder="INV-2026-04"
                className="bz-input"
              />
            </Field>
            <Field label="Tarih">
              <input
                type="date"
                value={form.issuedAt}
                onChange={(e) => setForm((f) => ({ ...f, issuedAt: e.target.value }))}
                className="bz-input"
              />
            </Field>
          </div>

          <Field label="Açıklama" hint="Müşteriye görünür · 200 karakter">
            <input
              type="text"
              maxLength={200}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Yıllık abonelik · Mart 2026"
              className="bz-input"
            />
          </Field>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Field label="Tutar">
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="2400"
                className="bz-input"
              />
            </Field>
            <Field label="Para birimi">
              <select
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className="bz-input"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Durum">
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="bz-input"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.v} value={s.v}>
                    {s.l}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="PDF URL" hint="Opsiyonel · http(s) link">
            <input
              type="url"
              maxLength={1000}
              value={form.pdfUrl}
              onChange={(e) => setForm((f) => ({ ...f, pdfUrl: e.target.value }))}
              placeholder="https://drive.google.com/..."
              className="bz-input"
            />
          </Field>

          <Field label="Admin notu" hint="Sadece admin panelde görünür">
            <textarea
              rows={2}
              maxLength={2000}
              value={form.adminNotes}
              onChange={(e) => setForm((f) => ({ ...f, adminNotes: e.target.value }))}
              placeholder="Örn. Havale ile ödendi - Garanti BBVA #12345"
              className="bz-input"
              style={{ resize: 'vertical' }}
            />
          </Field>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={closeForm}
              className="flex-1 py-2.5 rounded-full border border-[#EDEDED] text-[12px] font-medium text-[#525252] hover:bg-white"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 rounded-full bg-[#0A0A0A] text-white text-[12px] font-semibold hover:bg-[#1A1A1A] disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} strokeWidth={2} />
              )}
              {editingId ? 'Güncelle' : 'Ekle'}
            </button>
          </div>
        </div>
      )}

      {/* Invoice list */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-[13px] text-[#737373]">
          <Loader2 size={14} className="animate-spin" />
          Yükleniyor…
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#EDEDED] py-8 text-center text-[13px] text-[#737373]">
          Henüz fatura yok. Müşteri tahsilat yaptığında manuel olarak ekleyebilirsin.
        </div>
      ) : (
        <div className="rounded-2xl border border-[#EDEDED] divide-y divide-[#EDEDED] overflow-hidden">
          {invoices.map((inv) => {
            const isDeleting = deletingId === inv.id;
            return (
              <div key={inv.id} className="p-3.5 sm:p-4 bg-white">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="text-[13px] font-semibold text-[#0A0A0A]"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {inv.invoiceNumber || inv.id.slice(0, 10).toUpperCase()}
                      </span>
                      <Badge kind={STATUS_KIND[inv.status] || 'ghost'}>
                        {STATUS_LABEL[inv.status] || inv.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="mt-1 text-[12px] text-[#525252]">
                      <span className="font-medium text-[#0A0A0A]">
                        {fmt(inv.amount, inv.currency)}
                      </span>
                      <span className="mx-2 text-[#A3A3A3]">·</span>
                      <span>{dateLabel(inv.issuedAt)}</span>
                    </div>
                    {inv.description && (
                      <p className="mt-1 text-[12px] text-[#737373]">{inv.description}</p>
                    )}
                    {inv.adminNotes && (
                      <p className="mt-1 text-[11px] text-[#A3A3A3] italic">
                        Admin notu: {inv.adminNotes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {inv.pdfUrl && (
                      <a
                        href={inv.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#EDEDED] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]"
                        title="PDF'i aç"
                      >
                        <Download size={13} strokeWidth={2} />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => openEdit(inv)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#EDEDED] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]"
                      title="Düzenle"
                    >
                      <Pencil size={13} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(inv.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#EDEDED] text-[#525252] hover:border-[#DC2626] hover:bg-red-50 hover:text-[#DC2626]"
                      title="Sil"
                    >
                      <Trash2 size={13} strokeWidth={2} />
                    </button>
                  </div>
                </div>

                {isDeleting && (
                  <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3 text-[12px]">
                    <p className="text-[#7F1D1D]">
                      Bu faturayı silmek istediğine emin misin? Geri alınamaz.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDeletingId(null)}
                        className="px-3 py-1.5 rounded-full border border-[#EDEDED] bg-white text-[11px] font-medium text-[#525252]"
                      >
                        Vazgeç
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="px-3 py-1.5 rounded-full bg-[#DC2626] text-white text-[11px] font-semibold hover:bg-[#B91C1C] disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {deleting ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <Trash2 size={11} strokeWidth={2} />
                        )}
                        Sil
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="pulse-eyebrow text-[#737373] block">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-[#A3A3A3] leading-[1.55]">{hint}</p>}
    </div>
  );
}
