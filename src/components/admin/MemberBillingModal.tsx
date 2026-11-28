'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Loader2, RotateCcw, ShieldCheck } from 'lucide-react';
import { AlertBanner, Modal, Tabs, type TabItem } from '@/components/ui';
import MemberInvoicesPanel from './MemberInvoicesPanel';

interface MemberBillingModalProps {
  userId: string;
  email: string;
  name: string | null;
  onClose: () => void;
  onSaved: () => void;
}

interface TierCatalogRow {
  id: string;
  nameTr: string;
  nameEn: string;
  priceTry: number;
  priceUsd: number | null;
  priceYearlyTry: number | null;
  priceYearlyUsd: number | null;
  monthlyAmount: number | null;
  yearlyAmountTotal: number | null;
  yearlyAmountMonthly: number | null;
  isFeatured: boolean;
}

interface BillingForm {
  /** Canonical tier link (SubscriptionPlan.id veya '' = legacy/yok). */
  subscriptionPlanId: string;
  /** Legacy lifecycle bucket — `trial / monthly / yearly / enterprise / free`. */
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
  subscriptionPlanId: '',
  plan: 'trial',
  status: 'active',
  renewsAt: '',
  paymentBrand: '',
  paymentLast4: '',
  amount: '',
  // §38.225 Stage 145 — USD-only fiyatlandırma default. Legacy TRY override
  // dropdown'da hâlâ mevcut (mevcut subscription'ları düzenlerken).
  currency: 'USD',
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
  { v: 'canceled', l: 'İptal edildi' },
];
const CURRENCY_OPTIONS = ['TRY', 'USD', 'EUR', 'GBP'];
const CYCLE_OPTIONS = [
  { v: '', l: 'Seçilmedi' },
  { v: 'monthly', l: 'Aylık' },
  { v: 'yearly', l: 'Yıllık' },
];

const ERROR_LABELS: Record<string, string> = {
  invalid_plan: 'Plan türünü listeden seç.',
  invalid_subscription_plan_id: 'Seçili paket artık satışta değil. Listeden başka bir paket seç.',
  invalid_status: 'Durumu listeden seç.',
  invalid_renews_at: 'Yenileme tarihi geçerli değil. Takvimden bir gün seç.',
  invalid_payment_brand: 'Kart markası en çok 50 karakter olabilir.',
  invalid_payment_last4: 'Kartın son 4 hanesini 4 rakam olarak yaz.',
  invalid_amount: 'Tutar 0 ile 9.999.999,99 arasında olmalı.',
  invalid_currency: 'Para birimini listeden seç.',
  invalid_billing_cycle: 'Ödeme dönemini listeden seç.',
  invalid_company_name: 'Fatura unvanı en çok 200 karakter olabilir.',
  invalid_tax_number: 'Vergi no 10, TC kimlik no 11 rakam olmalı.',
  invalid_billing_address: 'Fatura adresi en çok 500 karakter olabilir.',
  invalid_billing_city: 'Şehir en çok 100 karakter olabilir.',
  invalid_admin_notes: 'Yönetici notu en çok 2000 karakter olabilir.',
  forbidden: 'Aboneliği düzenleme yetkin yok.',
  user_not_found: 'Hesap bulunamadı. Sayfayı yenileyip yeniden dene.',
};

function formatCurrency(value: number | null, currency: string): string {
  if (value == null) return '';
  if (currency === 'USD') return `$${value.toLocaleString('en-US')}`;
  if (currency === 'EUR') return `€${value.toLocaleString('en-US')}`;
  if (currency === 'GBP') return `£${value.toLocaleString('en-US')}`;
  return `₺${value.toLocaleString('tr-TR')}`;
}

export default function MemberBillingModal({
  userId,
  email,
  name,
  onClose,
  onSaved,
}: MemberBillingModalProps) {
  const [form, setForm] = useState<BillingForm>(EMPTY);
  const [catalog, setCatalog] = useState<TierCatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'plan' | 'invoices'>('plan');
  // Admin tutar kutusuna dokunduysa tier/cycle değişikliği auto-fill yapmaz
  // (CLAUDE.md §15.2 stale-override koruması).
  const amountTouchedRef = useRef(false);

  const tabs: TabItem[] = [
    { id: 'plan', label: 'Abonelik ve fatura bilgisi' },
    { id: 'invoices', label: 'Faturalar' },
  ];

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // §38.224 — Modal her açıldığında fresh catalog fetch (Stage 139
        // PlansManager inline price edit sonrası /admin/plans sayfasındaki
        // tier fiyatları güncellenmiş olabilir). `cache: 'no-store'` ile
        // browser cache + Vercel edge cache bypass; modal canonical billing
        // amount'u her zaman fresh /admin/plans state'inden alır.
        const res = await fetch(`/api/admin/members/${userId}/billing`, {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('load_failed');
        const data = await res.json();
        if (cancelled) return;
        const sub = data.subscription;
        setCatalog(Array.isArray(data.catalog) ? data.catalog : []);
        setForm({
          subscriptionPlanId: sub?.subscriptionPlanId ?? '',
          plan: sub?.plan ?? data.user.planFromUser ?? 'trial',
          status: sub?.status ?? 'active',
          renewsAt: sub?.renewsAt ? sub.renewsAt.split('T')[0] : '',
          paymentBrand: sub?.paymentBrand ?? '',
          paymentLast4: sub?.paymentLast4 ?? '',
          amount: sub?.amount != null ? String(sub.amount) : '',
          currency: sub?.currency ?? 'USD',
          billingCycle: sub?.billingCycle ?? '',
          companyName: sub?.companyName ?? '',
          taxNumber: sub?.taxNumber ?? '',
          billingAddress: sub?.billingAddress ?? '',
          billingCity: sub?.billingCity ?? '',
          adminNotes: sub?.adminNotes ?? '',
        });
        amountTouchedRef.current = sub?.amount != null;
      } catch {
        if (!cancelled) setError('Abonelik bilgileri yüklenemedi. Pencereyi kapatıp yeniden aç.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // §15.2 canonical resolver — admin tier+cycle seçince auto-fill için
  // expected amount hesaplama. Backend `resolveBillingAmount` ile aynı
  // mantık (USD/TRY × monthly/yearly), DB-validated input → rounding-safe.
  const selectedTier = useMemo(
    () =>
      form.subscriptionPlanId
        ? catalog.find((c) => c.id === form.subscriptionPlanId) ?? null
        : null,
    [form.subscriptionPlanId, catalog],
  );
  // Catalog amounts are resolved in USD (`resolveBillingAmount` defaults to USD
  // — CLAUDE.md §15.2 / §38.225 single-currency migration). Offering that
  // number while another currency is selected auto-filled a USD figure and
  // rendered it with the wrong symbol: picking Growth + TRY showed "₺40" for a
  // $40 tier, and accepting the autofill stored 40 TRY. No FX source exists, so
  // a non-USD subscription simply has no canonical amount — the admin types it.
  const canonicalCurrency = 'USD';
  const expectedAmount = useMemo<number | null>(() => {
    if (!selectedTier) return null;
    if (form.currency !== canonicalCurrency) return null;
    if (form.billingCycle === 'yearly') return selectedTier.yearlyAmountTotal;
    if (form.billingCycle === 'monthly') return selectedTier.monthlyAmount;
    return null;
  }, [selectedTier, form.billingCycle, form.currency]);

  const applyTier = (id: string) => {
    setForm((f) => {
      const tier = id ? catalog.find((c) => c.id === id) ?? null : null;
      // Tier seçilirken cycle yoksa 'monthly' default (en yaygın). Legacy
      // plan field'ı (lifecycle bucket) cycle ile aynı tutulur — kullanıcı
      // tier+yearly seçtiğinde plan='yearly' otomatik set.
      const nextCycle = f.billingCycle || (tier ? 'monthly' : f.billingCycle);
      const nextPlan = nextCycle === 'yearly' || nextCycle === 'monthly' ? nextCycle : f.plan;
      const nextAmount =
        amountTouchedRef.current && f.amount
          ? f.amount
          : tier
            ? String(
                (nextCycle === 'yearly' ? tier.yearlyAmountTotal : tier.monthlyAmount) ?? '',
              )
            : f.amount;
      return {
        ...f,
        subscriptionPlanId: id,
        billingCycle: nextCycle,
        plan: nextPlan,
        amount: nextAmount,
      };
    });
  };

  const applyCycle = (cycle: string) => {
    setForm((f) => {
      const nextPlan = cycle === 'yearly' || cycle === 'monthly' ? cycle : f.plan;
      const tier = f.subscriptionPlanId
        ? catalog.find((c) => c.id === f.subscriptionPlanId) ?? null
        : null;
      const nextAmount =
        amountTouchedRef.current && f.amount
          ? f.amount
          : tier
            ? String(
                (cycle === 'yearly' ? tier.yearlyAmountTotal : tier.monthlyAmount) ?? '',
              )
            : f.amount;
      return { ...f, billingCycle: cycle, plan: nextPlan, amount: nextAmount };
    });
  };

  const resetAmountToCanonical = () => {
    amountTouchedRef.current = false;
    setForm((f) => ({
      ...f,
      amount: expectedAmount != null ? String(expectedAmount) : '',
    }));
  };

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
          subscriptionPlanId: form.subscriptionPlanId || null,
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
        setError(ERROR_LABELS[data.error] || data.error || 'Kaydedilemedi. Biraz sonra yeniden dene.');
      } else {
        setSuccess('Abonelik kaydedildi.');
        onSaved();
        // Auto-close after a brief success flash
        setTimeout(onClose, 800);
      }
    } catch {
      setError('Bağlantı kurulamadı. İnternetini kontrol edip yeniden dene.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      size={580}
      onClose={onClose}
      title="Aboneliği düzenle"
      description={
        <>
          <strong className="break-words font-medium text-pn-ink">{name || email}</strong>
          {name ? ` (${email})` : ''} hesabının paketini, tutarını ve fatura bilgilerini elle düzenlersin.
          Hesap sahibi bunları panelinde görür ama değiştiremez.
        </>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-[#737373]" role="status">
          <Loader2 size={14} className="animate-spin" />
          Abonelik bilgileri yükleniyor…
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

          {/* §15.2 canonical tier link — marketing /pricing kart tier'larıyla
              parity. Tier seçilince cycle + amount otomatik doldurulur; admin
              elle override edebilir (RotateCcw → kanonik tutara dön).
              Boş = legacy/enterprise/free → manuel akış. */}
          <Field
            label="Paket"
            hint="Fiyat sayfasındaki paketlerden birini seçersen tutar kendiliğinden dolar."
          >
            <select
              value={form.subscriptionPlanId}
              onChange={(e) => applyTier(e.target.value)}
              className="bz-input"
            >
              <option value="">Paket seçilmedi (tutarı elle yaz)</option>
              {catalog.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nameTr || t.nameEn}
                  {t.isFeatured ? ' · En popüler' : ''}
                </option>
              ))}
            </select>
          </Field>

          {/* Plan + Status — legacy bucket */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
            <Field label="Plan türü" hint="Hesabın deneme, ücretli ya da ücretsiz olduğunu belirler.">
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

          {/* Amount + Currency + Cycle — tier bağlı ise canonical auto-fill */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3">
            <div className="col-span-2 sm:col-span-1">
            <Field
              label="Tutar"
              hint={
                expectedAmount != null && !amountTouchedRef.current
                  ? `Paket fiyatı (${form.billingCycle === 'yearly' ? 'yıllık toplam' : 'aylık'}): ${formatCurrency(expectedAmount, form.currency)}`
                  : expectedAmount != null && amountTouchedRef.current
                    ? `Paket fiyatı ${formatCurrency(expectedAmount, form.currency)}. Sen farklı bir tutar yazdın.`
                    : selectedTier && form.currency !== canonicalCurrency
                      ? `Paket fiyatları ${canonicalCurrency}. ${form.currency} için tutarı elle yaz.`
                      : undefined
              }
            >
              <div className="flex items-stretch gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) => {
                    amountTouchedRef.current = true;
                    setForm((f) => ({ ...f, amount: e.target.value }));
                  }}
                  placeholder={
                    expectedAmount != null
                      ? String(expectedAmount)
                      : '0.00'
                  }
                  className="bz-input min-w-0 flex-1"
                />
                {selectedTier && expectedAmount != null && amountTouchedRef.current ? (
                  <button
                    type="button"
                    onClick={resetAmountToCanonical}
                    title="Paket fiyatına dön"
                    aria-label="Paket fiyatına dön"
                    className="bz-btn-ghost shrink-0 px-3"
                  >
                    <RotateCcw size={13} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </Field>
            </div>
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
            <Field label="Ödeme dönemi">
              <select
                value={form.billingCycle}
                onChange={(e) => applyCycle(e.target.value)}
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

          {/* Canonical preview — tier+cycle seçildiğinde marketing /pricing'de
              gözükecek tutarı admin'e göster (parity reassurance). */}
          {selectedTier && form.billingCycle ? (
            <div className="flex items-start gap-2 rounded-[16px] bg-pn-canvas px-3 py-2.5 text-[13px] leading-[1.45] text-[#525252]">
              <ShieldCheck size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-pn-ink" aria-hidden="true" />
              <span className="min-w-0">
                Fiyat sayfasındaki karşılığı:{' '}
                <strong className="text-pn-ink">
                  {selectedTier.nameTr || selectedTier.nameEn}
                </strong>{' '}
                ·{' '}
                {form.billingCycle === 'yearly' ? 'Yıllık' : 'Aylık'}
                {form.billingCycle === 'yearly' && selectedTier.yearlyAmountMonthly != null
                  ? ` · ${formatCurrency(selectedTier.yearlyAmountMonthly, form.currency)}/ay`
                  : null}
                {form.billingCycle === 'yearly' && selectedTier.yearlyAmountTotal != null
                  ? ` (yıllık toplam ${formatCurrency(selectedTier.yearlyAmountTotal, form.currency)})`
                  : null}
                {form.billingCycle === 'monthly' && selectedTier.monthlyAmount != null
                  ? ` · ${formatCurrency(selectedTier.monthlyAmount, form.currency)}/ay`
                  : null}
              </span>
            </div>
          ) : null}

          <Field label="Yenileme tarihi" hint="Mevcut dönemin biteceği gün. Boş bırakabilirsin.">
            <input
              type="date"
              value={form.renewsAt}
              onChange={(e) => setForm((f) => ({ ...f, renewsAt: e.target.value }))}
              className="bz-input"
            />
          </Field>

          {/* Payment method */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kart markası">
              <input
                type="text"
                maxLength={50}
                value={form.paymentBrand}
                onChange={(e) => setForm((f) => ({ ...f, paymentBrand: e.target.value }))}
                placeholder="Visa, Mastercard, Troy…"
                className="bz-input"
              />
            </Field>
            <Field label="Kartın son 4 hanesi">
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
          <Field label="Fatura unvanı">
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
            <Field label="Vergi no / TC kimlik no" hint="10 ya da 11 rakam">
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

          <Field label="Fatura adresi">
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

          <Field label="Yönetici notu" hint="Yalnız yöneticiler görür. En çok 2000 karakter.">
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

          <p className="text-[12px] leading-[1.5] text-[#737373]">
            Kaydettiğin değişiklik işlem kaydına yazılır.
          </p>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="bz-btn-ghost flex-1"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bz-btn-primary flex-1 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={2} />}
              {saving ? 'Kaydediliyor…' : 'Aboneliği kaydet'}
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
    <label className="block space-y-1.5">
      <span className="block text-[13px] font-medium text-pn-ink">{label}</span>
      {children}
      {hint && <span className="block text-[12px] leading-[1.5] text-[#737373]">{hint}</span>}
    </label>
  );
}
