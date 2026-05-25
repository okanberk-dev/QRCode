'use client';

import { useEffect, useState } from 'react';
import { Check, CreditCard, Download, FileText, Loader2, Lock, Receipt } from 'lucide-react';
import { AlertBanner, Badge, Eyebrow, Modal } from '@/components/ui';
import type { PublicPlan } from '@/lib/subscription-plans';

interface BillingReadOnlyCardProps {
  isTr: boolean;
}

interface BillingSummary {
  plan: string;
  planLabel: string;
  status: string;
  trialDaysLeft: number | null;
  renewsAt: string | null;
  quota: { used: number; limit: number };
  paymentMethod: { brand: string; last4: string } | null;
  amount: number | null;
  /** §15.2 canonical billing — yıllık toplam (tier'a bağlı subscription'da). */
  yearlyTotal?: number | null;
  currency: string | null;
  billingCycle: string | null;
  subscriptionPlanId?: string | null;
  tier?: { id: string; name: string | null; isFeatured: boolean } | null;
  /** §44 self-service provider signals — null/'manual' = manual admin flow.
   *  'dodo_payments' = self-service (Dodo customer portal + cancel via portal).
   *  Stage 149 §38.229 — eski 'iyzico' enum slot kaldırıldı (provider iptal). */
  source?: 'manual' | 'dodo_payments' | null;
  cancelAtPeriodEnd?: boolean;
  /** Dodo customer_id — needed for /customer-portal redirect. */
  providerCustomerId?: string | null;
  billingAddress: {
    companyName: string | null;
    taxNumber: string | null;
    address: string | null;
    city: string | null;
  } | null;
}

interface Invoice {
  id: string;
  invoiceNumber?: string | null;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  url?: string;
  currency?: string;
  description?: string | null;
}

const STATUS_LABELS_TR: Record<Invoice['status'], string> = {
  paid: 'ÖDENDİ',
  pending: 'BEKLİYOR',
  failed: 'BAŞARISIZ',
  refunded: 'İADE',
};
const STATUS_LABELS_EN: Record<Invoice['status'], string> = {
  paid: 'PAID',
  pending: 'PENDING',
  failed: 'FAILED',
  refunded: 'REFUNDED',
};

const STATUS_KIND: Record<Invoice['status'], 'lime' | 'ghost' | 'danger' | 'info'> = {
  paid: 'lime',
  pending: 'ghost',
  failed: 'danger',
  refunded: 'info',
};

function formatCurrency(amount: number, currency: string | null, locale: 'tr' | 'en') {
  // §38.225 Stage 145 — USD-only fiyatlandırma. Mevcut TRY subscription'lar
  // (legacy) tutarlarını korumaya devam eder; yeni hesaplar USD ile gelir.
  const cur = currency || 'USD';
  try {
    return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${cur} ${amount.toFixed(0)}`;
  }
}

/**
 * Owner panel "Faturalandırma" card — read-only mirror of admin-managed
 * subscription state. Mirrors `.design-pulse-2026/...Faturalandirma`
 * screenshot: dark "Mevcut Plan" hero + payment method + billing address +
 * invoice table.
 *
 * Self-service via Dodo Payments customer portal (Stage 142 §38.222) when
 * `summary.source === 'dodo_payments'`; otherwise admin-managed (manual
 * override hybrid §44.5). Owner sees "Aboneliği yönet" → Dodo portal redirect.
 */
export default function BillingReadOnlyCard({ isTr }: BillingReadOnlyCardProps) {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // §44 Dodo Payments self-service — portal redirect is the only inline
  // action; cancel + reactivate are handled inside Dodo's customer portal
  // (subscription management UI is full-featured there). This keeps Buaze
  // tarafını basit + Dodo'nun kendi UX'ine güvenir.
  const [busyAction, setBusyAction] = useState<'portal' | null>(null);
  const [notice, setNotice] = useState<{ kind: 'success' | 'danger'; message: string } | null>(null);

  // §44 Stage 148 (§38.228) — Owner-side plan picker modal for self-service
  // upgrade. Triggered by "Planı yükselt" CTA in the dark hero. Fetches the
  // public plan catalog (/api/plans) lazily on open so the card mount stays
  // cheap. Each tier card opens Dodo static checkout via /api/checkout?productId=X.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPlans, setPickerPlans] = useState<PublicPlan[] | null>(null);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [sumRes, invRes] = await Promise.all([
          fetch('/api/billing/summary'),
          fetch('/api/billing/invoices'),
        ]);
        if (cancelled) return;
        if (sumRes.ok) {
          setSummary(await sumRes.json());
        } else {
          throw new Error('summary_failed');
        }
        if (invRes.ok) {
          const data = await invRes.json();
          setInvoices((data.data as Invoice[]) ?? []);
        }
      } catch {
        if (!cancelled) {
          setError(isTr ? 'Faturalandırma bilgileri yüklenemedi.' : 'Could not load billing info.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isTr]);

  useEffect(() => {
    if (!notice || notice.kind !== 'success') return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  // §44 Stage 142 — Dodo customer portal redirect.
  // /api/customer-portal SDK route handler signed portal URL döndürür ve
  // 302 redirect yapar. customer_id query param zorunlu (Dodo customer ID,
  // BillingSubscription.providerCustomerId'den geliyor — webhook'ta set
  // edilir). Stage 142'de route /api/ altına taşındı (Stage 141 stub
  // sonrası, top-level /customer-portal Vercel adapter finalize çakışması
  // olası kök neden).
  const handlePortal = () => {
    if (!summary?.providerCustomerId) {
      setNotice({
        kind: 'danger',
        message: isTr
          ? 'Müşteri ID bulunamadı. Abonelik henüz aktif değil olabilir.'
          : 'Customer ID not found. The subscription may not be active yet.',
      });
      return;
    }
    setBusyAction('portal');
    // Dodo SDK GET handler signed URL üretir + 302 dön. window.location
    // redirect chain'i otomatik takip eder.
    window.location.href = `/api/customer-portal?customer_id=${encodeURIComponent(summary.providerCustomerId)}`;
  };

  // §44 Stage 148 — open plan picker modal + lazy-load /api/plans.
  // Cache plans across re-opens (DB değişikliği nadir, owner aynı modal'ı
  // birkaç kez açabilir). 10s fresh + 60s SWR header (/api/plans, §38.219)
  // browser cache'inde zaten korunuyor; bu state mount-scope cache.
  const handleOpenPicker = async () => {
    setPickerOpen(true);
    if (pickerPlans !== null || pickerLoading) return;
    setPickerLoading(true);
    setPickerError(null);
    try {
      const localeParam = isTr ? 'tr' : 'en';
      const res = await fetch(`/api/plans?locale=${localeParam}`);
      if (!res.ok) throw new Error('plans_failed');
      const json = (await res.json()) as { data?: PublicPlan[] };
      setPickerPlans(json.data ?? []);
    } catch {
      setPickerError(isTr ? 'Paketler yüklenemedi.' : 'Plans could not load.');
    } finally {
      setPickerLoading(false);
    }
  };

  const dateFormat = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  if (loading) {
    return (
      <section id="billing" className="bz-card p-6 sm:p-7 scroll-mt-20">
        <div className="flex items-center gap-2 mb-1">
          <CreditCard size={14} strokeWidth={2} className="text-[#0A0A0A]" />
          <Eyebrow>{isTr ? 'FATURALANDIRMA' : 'BILLING'}</Eyebrow>
        </div>
        <div className="bz-h-tight mt-1 mb-3" style={{ fontSize: 18 }}>
          {isTr ? 'Plan ve faturalar' : 'Plan & invoices'}
        </div>
        <div className="flex items-center gap-2 text-[13px] text-[#737373]">
          <Loader2 size={14} className="animate-spin" />
          {isTr ? 'Yükleniyor…' : 'Loading…'}
        </div>
      </section>
    );
  }

  return (
    <section id="billing" className="bz-card p-6 sm:p-7 scroll-mt-20">
      <div className="flex items-center gap-2 mb-1">
        <CreditCard size={14} strokeWidth={2} className="text-[#0A0A0A]" />
        <Eyebrow>{isTr ? 'FATURALANDIRMA' : 'BILLING'}</Eyebrow>
      </div>
      <div className="bz-h-tight mt-1" style={{ fontSize: 18 }}>
        {isTr ? 'Plan ve faturalar' : 'Plan & invoices'}
      </div>
      <p className="mt-1 mb-5 text-[13px] text-[#737373] leading-[1.55] flex items-center gap-1.5">
        <Lock size={12} className="text-[#737373]" strokeWidth={2} />
        {isTr
          ? 'Faturalandırma bilgileri şu anda yalnızca admin panelinden yönetilmektedir.'
          : 'Billing information is currently managed only from the admin panel.'}
      </p>

      {error && (
        <div className="mb-4">
          <AlertBanner kind="danger" onDismiss={() => setError(null)}>
            {error}
          </AlertBanner>
        </div>
      )}
      {notice && (
        <div className="mb-4">
          <AlertBanner
            kind={notice.kind === 'success' ? 'success' : 'danger'}
            onDismiss={() => setNotice(null)}
          >
            {notice.message}
          </AlertBanner>
        </div>
      )}

      {/* ─── Top row: Plan hero (dark) + Payment method ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-3.5">
        {/* Plan hero — graphite bg */}
        <div className="rounded-2xl bg-[#0A0A0A] p-5 sm:p-6 text-white">
          <p
            className="text-[11px] font-medium tracking-[0.18em] uppercase text-[#A3A3A3]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {isTr ? 'MEVCUT PLAN' : 'CURRENT PLAN'}
          </p>
          <h3 className="bz-h-tight-2 mt-1.5 text-[36px] sm:text-[40px] text-white">
            {summary?.planLabel || (isTr ? 'Trial' : 'Trial')}
          </h3>
          <p className="mt-1.5 text-[13px] text-[#A3A3A3]">
            {summary?.status === 'past_due'
              ? isTr ? 'Ödeme bekliyor' : 'Payment past due'
              : summary?.status === 'canceled'
                ? isTr ? 'İptal edildi' : 'Canceled'
                : isTr ? 'Aktif abonelik' : 'Active subscription'}
          </p>

          {/* §15.2 canonical hero — yıllık döngüde marketing /pricing
              kartlarına benzer: yıllık toplam + aylık-eşdeğer subtitle;
              aylık döngüde sade ₺X/ay. Admin override ise `amount`
              hangi cycle'a aitse onu gösterir. */}
          {summary?.amount != null ? (
            <div className="mt-4">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="bz-h-tight-2 text-[28px] sm:text-[32px] text-[#C6F24E]">
                  {formatCurrency(summary.amount, summary.currency, isTr ? 'tr' : 'en')}
                </span>
                <span className="text-[13px] text-[#A3A3A3]">
                  {summary.billingCycle === 'yearly'
                    ? isTr ? '/ yıl' : '/ year'
                    : summary.billingCycle === 'monthly'
                      ? isTr ? '/ ay' : '/ mo'
                      : ''}
                </span>
              </div>
              {summary.billingCycle === 'yearly' && summary.yearlyTotal != null ? (
                <div className="mt-1 text-[12px] text-[#A3A3A3]">
                  {isTr
                    ? `≈ ${formatCurrency(Math.round(summary.yearlyTotal / 12), summary.currency, 'tr')} / ay`
                    : `≈ ${formatCurrency(Math.round(summary.yearlyTotal / 12), summary.currency, 'en')} / mo`}
                </div>
              ) : null}
              {summary.tier?.name ? (
                <div className="mt-1 text-[11px] text-[#A3A3A3]">
                  {isTr ? 'Paket' : 'Plan'}:{' '}
                  <span className="text-white font-medium">{summary.tier.name}</span>
                </div>
              ) : null}
            </div>
          ) : null}

          <p className="mt-4 text-[12px] text-[#A3A3A3]">
            {summary?.trialDaysLeft
              ? isTr
                ? `${summary.trialDaysLeft} günlük deneme kaldı`
                : `${summary.trialDaysLeft} trial days left`
              : summary?.renewsAt
                ? isTr
                  ? `Bir sonraki fatura: ${dateFormat(summary.renewsAt)}`
                  : `Next bill: ${dateFormat(summary.renewsAt)}`
                : isTr
                  ? 'Yenileme planlaması yok'
                  : 'No renewal scheduled'}
          </p>

          {/* §44 Stage 140 — Dodo Payments self-service CTAs. Two states:
              (a) no Dodo sub → "Planı yükselt" link to /pricing
              (b) active Dodo sub → "Aboneliği yönet" → customer portal
              Cancel + reactivate Dodo'nun customer portal'unda yapılır
              (full-featured UI orada; Buaze tarafı basit tek-CTA). */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {summary?.source === 'dodo_payments' ? (
              <>
                <button
                  type="button"
                  onClick={handlePortal}
                  disabled={busyAction !== null}
                  className="bz-btn-lime disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busyAction === 'portal' && (
                    <Loader2 size={14} className="animate-spin" aria-hidden />
                  )}
                  {isTr ? 'Aboneliği yönet' : 'Manage subscription'}
                </button>
                <span className="text-[11px] text-[#A3A3A3]">
                  {summary?.cancelAtPeriodEnd
                    ? isTr
                      ? 'İptal planlandı — dönem sonuna kadar aktif. Portaldan yeniden başlatabilirsiniz.'
                      : 'Cancellation scheduled — active until period end. Reactivate from the portal.'
                    : isTr
                      ? 'Fatura, ödeme yöntemi, iptal ve yeniden başlatma için müşteri portalı.'
                      : 'Invoices, payment method, cancel & reactivate via customer portal.'}
                </span>
              </>
            ) : (
              <>
                {/* §44 Stage 148 (§38.228) — Inline plan picker modal yerine
                    /pricing'e link atılıyordu (kullanıcı raporu: "yükselt
                    deyince checkout ekranına gitmiyor"). Modal Dodo product ID
                    wired tier'ları gösterir, owner tek tıkla static checkout'a
                    gider — marketing pricing turunu tamamen atlar. */}
                <button
                  type="button"
                  onClick={handleOpenPicker}
                  className="bz-btn-lime inline-flex items-center"
                >
                  {isTr ? 'Planı yükselt' : 'Upgrade plan'}
                </button>
                <span className="text-[11px] text-[#A3A3A3]">
                  {isTr
                    ? 'Paket seç ve Dodo Payments ile güvenli ödemeye geç.'
                    : 'Pick a plan and continue to secure checkout via Dodo Payments.'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Payment method + Billing address (right column stacked) */}
        <div className="flex flex-col gap-3.5">
          <div className="rounded-2xl border border-[#EDEDED] bg-white p-5">
            <Eyebrow>{isTr ? 'ÖDEME YÖNTEMİ' : 'PAYMENT METHOD'}</Eyebrow>
            {summary?.paymentMethod ? (
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-9 w-12 items-center justify-center rounded-md bg-[#1A1F71] text-[10px] font-bold text-white tracking-wider">
                  {summary.paymentMethod.brand.toUpperCase().slice(0, 4)}
                </div>
                <div>
                  <div className="text-[14px] font-medium text-[#0A0A0A]">
                    •••• {summary.paymentMethod.last4}
                  </div>
                  <div className="text-[11px] text-[#737373] mt-0.5">
                    {isTr ? 'Admin tarafından yönetilir' : 'Managed by admin'}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-[13px] text-[#737373]">
                {isTr ? 'Henüz ödeme yöntemi eklenmedi.' : 'No payment method on file.'}
              </p>
            )}
            <div className="mt-3">
              <Badge kind="ghost">{isTr ? 'Yalnızca admin' : 'Admin only'}</Badge>
            </div>
          </div>

          <div className="rounded-2xl border border-[#EDEDED] bg-white p-5">
            <Eyebrow>{isTr ? 'FATURA ADRESİ' : 'BILLING ADDRESS'}</Eyebrow>
            {summary?.billingAddress?.companyName ||
            summary?.billingAddress?.address ||
            summary?.billingAddress?.city ? (
              <div className="mt-2.5 text-[13px] text-[#0A0A0A] leading-[1.6]">
                {summary.billingAddress.companyName && (
                  <div className="font-semibold">{summary.billingAddress.companyName}</div>
                )}
                {summary.billingAddress.taxNumber && (
                  <div className="text-[12px] text-[#737373]">
                    {isTr ? 'VKN' : 'Tax No'}: {summary.billingAddress.taxNumber}
                  </div>
                )}
                {summary.billingAddress.address && (
                  <div className="text-[#525252] mt-1 whitespace-pre-line">
                    {summary.billingAddress.address}
                  </div>
                )}
                {summary.billingAddress.city && (
                  <div className="text-[#525252]">{summary.billingAddress.city}</div>
                )}
              </div>
            ) : (
              <p className="mt-3 text-[13px] text-[#737373]">
                {isTr ? 'Henüz fatura adresi eklenmedi.' : 'No billing address on file.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Invoice list ─── */}
      <div className="mt-6 rounded-2xl border border-[#EDEDED] bg-white">
        <div className="flex items-center gap-2 border-b border-[#EDEDED] px-5 py-4">
          <Receipt size={14} className="text-[#0A0A0A]" strokeWidth={2} />
          <h3 className="text-[15px] font-semibold text-[#0A0A0A]">
            {isTr ? 'Faturalar' : 'Invoices'}
          </h3>
        </div>
        {invoices.length === 0 ? (
          <div className="flex items-center justify-center gap-2 p-8 text-[13px] text-[#737373]">
            <FileText size={14} className="text-[#A3A3A3]" strokeWidth={2} />
            {isTr
              ? 'Henüz fatura yok. İlk faturanız oluşturulduğunda burada görünür.'
              : 'No invoices yet. Your first invoice will appear here.'}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden md:table w-full text-left text-[13px]">
              <thead>
                <tr
                  className="border-b border-[#EDEDED] bg-[#FAFAFA] text-[#737373]"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.16em' }}
                >
                  <th className="px-5 py-3 font-medium uppercase">
                    {isTr ? 'TARİH' : 'DATE'}
                  </th>
                  <th className="px-5 py-3 font-medium uppercase">
                    {isTr ? 'FATURA NO' : 'INVOICE'}
                  </th>
                  <th className="px-5 py-3 font-medium uppercase">
                    {isTr ? 'TUTAR' : 'AMOUNT'}
                  </th>
                  <th className="px-5 py-3 font-medium uppercase">
                    {isTr ? 'DURUM' : 'STATUS'}
                  </th>
                  <th className="px-5 py-3 text-right" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-[#EDEDED] last:border-0 hover:bg-[#FAFAFA]/50"
                  >
                    <td className="px-5 py-3.5 text-[#525252]">{dateFormat(inv.date)}</td>
                    <td
                      className="px-5 py-3.5 text-[#525252]"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                    >
                      {inv.invoiceNumber || inv.id.slice(0, 10).toUpperCase()}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-[#0A0A0A]">
                        {formatCurrency(inv.amount, inv.currency || null, isTr ? 'tr' : 'en')}
                      </div>
                      {inv.description && (
                        <div className="text-[11px] text-[#737373] mt-0.5">{inv.description}</div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge kind={STATUS_KIND[inv.status]}>
                        {(isTr ? STATUS_LABELS_TR : STATUS_LABELS_EN)[inv.status]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {inv.url ? (
                        <a
                          href={inv.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[12px] text-[#525252] hover:text-[#0A0A0A]"
                        >
                          {isTr ? 'PDF indir' : 'Download PDF'}
                          <Download size={12} aria-hidden />
                        </a>
                      ) : (
                        <span className="text-[12px] text-[#A3A3A3]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-[#EDEDED]">
              {invoices.map((inv) => (
                <div key={inv.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-[#0A0A0A]">
                        {formatCurrency(inv.amount, inv.currency || null, isTr ? 'tr' : 'en')}
                      </span>
                      <Badge kind={STATUS_KIND[inv.status]}>
                        {(isTr ? STATUS_LABELS_TR : STATUS_LABELS_EN)[inv.status]}
                      </Badge>
                    </div>
                    <div className="mt-1 text-[11px] text-[#737373] flex items-center gap-2">
                      <span>{dateFormat(inv.date)}</span>
                      <span>·</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>
                        {inv.invoiceNumber || inv.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    {inv.description && (
                      <div className="mt-0.5 text-[11px] text-[#737373]">{inv.description}</div>
                    )}
                  </div>
                  {inv.url && (
                    <a
                      href={inv.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#EDEDED] px-3 py-1.5 text-[11px] text-[#525252] hover:text-[#0A0A0A] hover:border-[#0A0A0A]"
                    >
                      <Download size={11} aria-hidden />
                      PDF
                    </a>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* §44 Stage 140 — Cancel modal kaldırıldı. Dodo'da cancel/reactivate
          customer portal içinde tam UI ile yapılır (renewsAt countdown,
          grace period info, payment method update — hepsi tek surface).
          "Aboneliği yönet" buton portal'a yönlendirir. */}

      {/* §44 Stage 148 (§38.228) — Plan picker modal. Owner panel'da inline
          tier seçimi yaparak marketing /pricing turunu atlatır. Dodo product
          ID wired tier'lar "Yükselt" CTA'sıyla Dodo static checkout'a gider;
          wired olmayan tier'lar "Yakında" badge + disabled state gösterir
          (admin paneli üzerinden product ID set edilince otomatik aktif).

          Modal primitive `open` prop almıyor — conditional render kullanılır
          (CLAUDE.md §23.3, mevcut customer + restaurants + menu callsite
          paterni). `description` field'ı da yok; children içinde subtitle. */}
      {pickerOpen && (
      <Modal
        onClose={() => setPickerOpen(false)}
        size={780}
        title={isTr ? 'Paket seç' : 'Pick a plan'}
      >
        <p className="-mt-1 mb-4 text-[13px] text-[#737373] leading-snug">
          {isTr
            ? 'Tek tıkla güvenli ödemeye geç. İptal istediğiniz zaman müşteri portalından yapılır.'
            : 'Continue to secure checkout in one click. Cancel anytime via the customer portal.'}
        </p>
        {pickerLoading && (
          <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-[#737373]">
            <Loader2 size={14} className="animate-spin" />
            {isTr ? 'Paketler yükleniyor…' : 'Loading plans…'}
          </div>
        )}
        {pickerError && (
          <div className="my-4">
            <AlertBanner kind="danger">{pickerError}</AlertBanner>
          </div>
        )}
        {!pickerLoading && !pickerError && pickerPlans && pickerPlans.length === 0 && (
          <p className="py-10 text-center text-[13px] text-[#737373]">
            {isTr
              ? 'Henüz aktif paket bulunmuyor. Lütfen daha sonra tekrar deneyin.'
              : 'No active plans yet. Please try again later.'}
          </p>
        )}
        {!pickerLoading && !pickerError && pickerPlans && pickerPlans.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pickerPlans.map((p) => {
              const wired = p.paymentProvider === 'dodo_payments' && Boolean(p.dodoProductId);
              const isDark = p.isFeatured;
              const monthlyShown = p.discount.active ? p.discount.discountedMonthly : p.priceMonthly;
              return (
                <div
                  key={p.id}
                  className={`flex flex-col rounded-2xl p-5 ${
                    isDark
                      ? 'bg-[#0A0A0A] text-white'
                      : 'border border-[#EDEDED] bg-white'
                  }`}
                >
                  {isDark && (
                    <div className="mb-2">
                      <span className="pulse-eyebrow inline-block rounded-full bg-[#C6F24E] px-3 py-1 text-[#0A0A0A]">
                        {isTr ? 'EN POPÜLER' : 'MOST POPULAR'}
                      </span>
                    </div>
                  )}
                  <h3
                    className={`text-[18px] font-medium tracking-[-0.02em] ${
                      isDark ? 'text-white' : 'text-[#0A0A0A]'
                    }`}
                  >
                    {p.name}
                  </h3>
                  <p
                    className={`mt-1 text-[12px] leading-snug ${
                      isDark ? 'text-white/70' : 'text-[#525252]'
                    }`}
                  >
                    {p.description}
                  </p>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span
                      className={`text-[28px] font-medium leading-none tracking-[-0.03em] ${
                        isDark ? 'text-[#C6F24E]' : 'text-[#0A0A0A]'
                      }`}
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {monthlyShown === 0
                        ? isTr ? 'Ücretsiz' : 'Free'
                        : `$${monthlyShown.toLocaleString('en-US')}`}
                    </span>
                    {monthlyShown > 0 && (
                      <span
                        className={`pulse-eyebrow ${isDark ? 'text-white/60' : 'text-[#737373]'}`}
                      >
                        {isTr ? '/ AY' : '/ MO'}
                      </span>
                    )}
                  </div>
                  <ul className="mt-3 mb-4 flex-1 space-y-1.5">
                    {p.features.slice(0, 4).map((feat) => (
                      <li
                        key={feat}
                        className={`flex items-start gap-2 text-[12px] ${
                          isDark ? 'text-white/90' : 'text-[#0A0A0A]'
                        }`}
                      >
                        <Check
                          size={11}
                          strokeWidth={2.5}
                          className={`mt-0.5 shrink-0 ${
                            isDark ? 'text-[#C6F24E]' : 'text-[#A8D62E]'
                          }`}
                        />
                        {feat}
                      </li>
                    ))}
                    {p.features.length > 4 && (
                      <li
                        className={`pl-5 text-[11px] ${
                          isDark ? 'text-white/50' : 'text-[#737373]'
                        }`}
                      >
                        {isTr
                          ? `+ ${p.features.length - 4} özellik daha`
                          : `+ ${p.features.length - 4} more`}
                      </li>
                    )}
                  </ul>
                  {wired ? (
                    <a
                      href={`/api/checkout?productId=${encodeURIComponent(p.dodoProductId!)}`}
                      className={`block min-h-[40px] w-full rounded-full py-2.5 text-center text-[13px] font-medium transition-colors ${
                        isDark
                          ? 'bg-[#C6F24E] text-[#0A0A0A] hover:bg-[#A8D62E]'
                          : 'border border-[#0A0A0A] text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white'
                      }`}
                    >
                      {isTr ? 'Bu paketle devam et' : 'Continue with this plan'}
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="block min-h-[40px] w-full rounded-full bg-[#FAFAFA] py-2.5 text-center text-[13px] font-medium text-[#A3A3A3] cursor-not-allowed"
                      title={
                        isTr
                          ? 'Bu paketin Dodo ürün ID\'si henüz set edilmedi.'
                          : 'Dodo product ID is not yet set for this plan.'
                      }
                    >
                      {isTr ? 'Yakında' : 'Coming soon'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <p className="pulse-eyebrow mt-6 text-center text-[#737373]">
          {isTr
            ? 'GÜVENLİ ÖDEME · İSTEDİĞİNDE İPTAL · TAAHHÜTSÜZ'
            : 'SECURE PAYMENT · CANCEL ANYTIME · NO COMMITMENT'}
        </p>
      </Modal>
      )}
    </section>
  );
}
