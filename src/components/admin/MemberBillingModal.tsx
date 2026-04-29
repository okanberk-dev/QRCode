'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, ShieldCheck } from 'lucide-react';
import { AlertBanner, Modal, Tabs, type TabItem } from '@/components/ui';
import MemberInvoicesPanel from './MemberInvoicesPanel';

interface MemberBillingModalProps {
  userId: string;
  email: string;
  name: string | null;
  onClose: () => void;
  onSaved: () => void;
}

interface BillingForm {
  plan: string;
  status: string;
  renewsAt: string;
  paymentBrand: string;
  paymentLast4: string;
  amount: string;
  currency: string;
  billingCycle: string;
  companyName: string;
  taxNumber: string;
  billingAddress: string;
  billingCity: string;
  adminNotes: string;
}

const EMPTY: BillingForm = {
  plan: 'trial',
  status: 'active',
  renewsAt: '',
  paymentBrand: '',
  paymentLast4: '',
  amount: '',
  currency: 'TRY',
  billingCycle: '',
  companyName: '',
  taxNumber: '',
  billingAddress: '',
  billingCity: '',
  adminNotes: '',
};

const PLAN_OPTIONS = [
  { v: 'trial', l: 'Deneme' },
  { v: 'monthly', l: 'Aylık' },
  { v: 'yearly', l: 'Yıllık' },
  { v: 'enterprise', l: 'Kurumsal' },
  { v: 'free', l: 'Ücretsiz' },
];
const STATUS_OPTIONS = [
  { v: 'active', l: 'Aktif' },
  { v: 'past_due', l: 'Ödeme bekliyor' },
  { v: 'canceled', l: 'İptal' },
];
const CURRENCY_OPTIONS = ['TRY', 'USD', 'EUR', 'GBP'];
const CYCLE_OPTIONS = [
  { v: '', l: '— Seçilmedi —' },
  { v: 'monthly', l: 'Aylık' },
  { v: 'yearly', l: 'Yıllık' },
];

const ERROR_LABELS: Record<string, string> = {
  invalid_plan: 'Geçersiz plan değeri.',
  invalid_status: 'Geçersiz durum değeri.',
  invalid_renews_at: 'Geçersiz yenileme tarihi.',
  invalid_payment_brand: 'Ödeme markası 50 karakteri aşamaz.',
  invalid_payment_last4: 'Kart son 4 hanesi tam 4 rakam olmalı.',
  invalid_amount: 'Geçersiz tutar (0 - 9.999.999,99 arası).',
  invalid_currency: 'Geçersiz para birimi.',
  invalid_billing_cycle: 'Geçersiz fatura periyodu.',
  invalid_company_name: 'Şirket adı 200 karakteri aşamaz.',
  invalid_tax_number: 'VKN/TCKN 10 veya 11 hanelik rakam olmalı.',
  invalid_billing_address: 'Adres 500 karakteri aşamaz.',
  invalid_billing_city: 'Şehir 100 karakteri aşamaz.',
  invalid_admin_notes: 'Admin notu 2000 karakteri aşamaz.',
  forbidden: 'Yetkisiz erişim.',
  user_not_found: 'Kullanıcı bulunamadı.',
};

export default function MemberBillingModal({
  userId,
  email,
  name,
  onClose,
  onSaved,
}: MemberBillingModalProps) {
  const [form, setForm] = useState<BillingForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'plan' | 'invoices'>('plan');

  const tabs: TabItem[] = [
    { id: 'plan', label: 'Plan & Adres' },
    { id: 'invoices', label: 'Faturalar' },
  ];

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/members/${userId}/billing`);
        if (!res.ok) throw new Error('load_failed');
        const data = await res.json();
        if (cancelled) return;
        const sub = data.subscription;
        setForm({
          plan: sub?.plan ?? data.user.planFromUser ?? 'trial',
          status: sub?.status ?? 'active',
          renewsAt: sub?.renewsAt ? sub.renewsAt.split('T')[0] : '',
          paymentBrand: sub?.paymentBrand ?? '',
          paymentLast4: sub?.paymentLast4 ?? '',
          amount: sub?.amount != null ? String(sub.amount) : '',
          currency: sub?.currency ?? 'TRY',
          billingCycle: sub?.billingCycle ?? '',
          companyName: sub?.companyName ?? '',
          taxNumber: sub?.taxNumber ?? '',
          billingAddress: sub?.billingAddress ?? '',
          billingCity: sub?.billingCity ?? '',
          adminNotes: sub?.adminNotes ?? '',
        });
      } catch {
        if (!cancelled) setError('Faturalandırma bilgileri yüklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/members/${userId}/billing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: form.plan,
          status: form.status,
          renewsAt: form.renewsAt || null,
          paymentBrand: form.paymentBrand || null,
          paymentLast4: form.paymentLast4 || null,
          amount: form.amount === '' ? null : form.amount,
          currency: form.currency,
          billingCycle: form.billingCycle || null,
          companyName: form.companyName || null,
          taxNumber: form.taxNumber || null,
          billingAddress: form.billingAddress || null,
          billingCity: form.billingCity || null,
          adminNotes: form.adminNotes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(ERROR_LABELS[data.error] || data.error || 'Kaydetme başarısız.');
      } else {
        setSuccess('Faturalandırma güncellendi.');
        onSaved();
        // Auto-close after a brief success flash
        setTimeout(onClose, 800);
      }
    } catch {
      setError('Bağlantı hatası.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      size={580}
      onClose={onClose}
      title={
        <div>
          <p className="pulse-eyebrow text-[#737373]">FATURALANDIRMA</p>
          <h2 className="mt-1 text-[20px] font-medium tracking-[-0.015em] text-[#0A0A0A]">
            {name || email}
          </h2>
          <p className="mt-1 text-[12px] text-[#525252]">{email}</p>
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center gap-2 py-10 justify-center text-[13px] text-[#737373]">
          <Loader2 size={14} className="animate-spin" />
          Yükleniyor…
        </div>
      ) : (
        <div className="space-y-5">
          <Tabs
            items={tabs}
            active={activeTab}
            onChange={(id) => setActiveTab(id as 'plan' | 'invoices')}
            ariaLabel="Faturalandırma sekmeleri"
          />

          {activeTab === 'invoices' ? (
            <MemberInvoicesPanel userId={userId} />
          ) : (
            <div className="space-y-5">
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

          {/* Plan + Status */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plan">
              <select
                value={form.plan}
                onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
                className="bz-input"
              >
                {PLAN_OPTIONS.map((p) => (
                  <option key={p.v} value={p.v}>
                    {p.l}
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

          {/* Amount + Currency + Cycle */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Field label="Tutar">
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
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
            <Field label="Periyot">
              <select
                value={form.billingCycle}
                onChange={(e) => setForm((f) => ({ ...f, billingCycle: e.target.value }))}
                className="bz-input"
              >
                {CYCLE_OPTIONS.map((c) => (
                  <option key={c.v} value={c.v}>
                    {c.l}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Yenileme tarihi">
            <input
              type="date"
              value={form.renewsAt}
              onChange={(e) => setForm((f) => ({ ...f, renewsAt: e.target.value }))}
              className="bz-input"
            />
          </Field>

          {/* Payment method */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kart markası" hint="Visa, Mastercard, Troy…">
              <input
                type="text"
                maxLength={50}
                value={form.paymentBrand}
                onChange={(e) => setForm((f) => ({ ...f, paymentBrand: e.target.value }))}
                placeholder="Visa"
                className="bz-input"
              />
            </Field>
            <Field label="Son 4 hane" hint="Sadece rakam">
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                pattern="[0-9]{4}"
                value={form.paymentLast4}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setForm((f) => ({ ...f, paymentLast4: v }));
                }}
                placeholder="4242"
                className="bz-input"
              />
            </Field>
          </div>

          {/* Billing address */}
          <Field label="Şirket / fatura unvanı">
            <input
              type="text"
              maxLength={200}
              value={form.companyName}
              onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
              placeholder="Ark Gıda A.Ş."
              className="bz-input"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="VKN / TCKN" hint="10 veya 11 hane">
              <input
                type="text"
                inputMode="numeric"
                maxLength={11}
                value={form.taxNumber}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 11);
                  setForm((f) => ({ ...f, taxNumber: v }));
                }}
                placeholder="1234567890"
                className="bz-input"
              />
            </Field>
            <Field label="Şehir">
              <input
                type="text"
                maxLength={100}
                value={form.billingCity}
                onChange={(e) => setForm((f) => ({ ...f, billingCity: e.target.value }))}
                placeholder="İstanbul"
                className="bz-input"
              />
            </Field>
          </div>

          <Field label="Adres">
            <textarea
              rows={2}
              maxLength={500}
              value={form.billingAddress}
              onChange={(e) => setForm((f) => ({ ...f, billingAddress: e.target.value }))}
              placeholder="Maslak Mah. Büyükdere Cad. No:255"
              className="bz-input"
              style={{ resize: 'vertical' }}
            />
          </Field>

          <Field label="Admin notu" hint="Sadece admin panelde görünür · 2000 karakter">
            <textarea
              rows={2}
              maxLength={2000}
              value={form.adminNotes}
              onChange={(e) => setForm((f) => ({ ...f, adminNotes: e.target.value }))}
              placeholder="Örn. yıllık 2 ay ücretsiz indirim uygulandı."
              className="bz-input"
              style={{ resize: 'vertical' }}
            />
          </Field>

          <div className="flex items-start gap-1.5 text-[11px] text-[#737373] leading-[1.55]">
            <ShieldCheck size={12} className="mt-0.5 shrink-0" strokeWidth={2} />
            <span>
              Değişiklikler audit log&apos;a kaydedilir (admin.billing.update). Müşteri yalnızca okuma erişimine sahiptir.
            </span>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-full border border-[#EDEDED] text-[13px] font-medium text-[#525252] hover:bg-[#FAFAFA] transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 rounded-full bg-[#0A0A0A] text-white text-[13px] font-semibold hover:bg-[#1A1A1A] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={2} />}
              Kaydet
            </button>
          </div>
            </div>
          )}
        </div>
      )}
    </Modal>
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
    <div className="space-y-1.5">
      <label className="pulse-eyebrow text-[#737373] block">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-[#A3A3A3] leading-[1.55]">{hint}</p>}
    </div>
  );
}
