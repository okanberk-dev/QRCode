'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Download, FileText, Loader2, Lock, Receipt } from 'lucide-react';
import { AlertBanner, Badge, Eyebrow } from '@/components/ui';

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
  currency: string | null;
  billingCycle: string | null;
  billingAddress: {
    companyName: string | null;
    taxNumber: string | null;
    address: string | null;
    city: string | null;
  } | null;
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  url?: string;
  currency?: string;
}

const STATUS_LABELS_TR: Record<Invoice['status'], string> = {
  paid: 'ÖDENDİ',
  pending: 'BEKLİYOR',
  failed: 'BAŞARISIZ',
};
const STATUS_LABELS_EN: Record<Invoice['status'], string> = {
  paid: 'PAID',
  pending: 'PENDING',
  failed: 'FAILED',
};

const STATUS_KIND: Record<Invoice['status'], 'lime' | 'ghost' | 'danger'> = {
  paid: 'lime',
  pending: 'ghost',
  failed: 'danger',
};

function formatCurrency(amount: number, currency: string | null, locale: 'tr' | 'en') {
  const cur = currency || 'TRY';
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
 * All edit CTAs are disabled with a banner explaining management lives in
 * the admin panel (Iyzico provider wiring deferred to Wave 3.5 per
 * CLAUDE.md §18). Owner cannot self-serve billing changes.
 */
export default function BillingReadOnlyCard({ isTr }: BillingReadOnlyCardProps) {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          <h3
            className="mt-1.5 text-[36px] sm:text-[40px] font-medium leading-[1] tracking-[-0.025em] text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {summary?.planLabel || (isTr ? 'Trial' : 'Trial')}
          </h3>
          <p className="mt-1.5 text-[13px] text-[#A3A3A3]">
            {summary?.status === 'past_due'
              ? isTr ? 'Ödeme bekliyor' : 'Payment past due'
              : summary?.status === 'canceled'
                ? isTr ? 'İptal edildi' : 'Canceled'
                : isTr ? 'Aktif abonelik' : 'Active subscription'}
          </p>

          {summary?.amount ? (
            <div className="mt-4 flex items-baseline gap-2">
              <span
                className="text-[28px] sm:text-[32px] font-semibold text-[#C6F24E]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {formatCurrency(summary.amount, summary.currency, isTr ? 'tr' : 'en')}
              </span>
              <span className="text-[13px] text-[#A3A3A3]">
                {summary.billingCycle === 'yearly'
                  ? isTr ? '/ ay · yıllık ödeme' : '/ mo · billed yearly'
                  : isTr ? '/ ay' : '/ mo'}
              </span>
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

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled
              aria-disabled="true"
              title={
                isTr
                  ? 'Plan değişikliği admin panelinden yapılır'
                  : 'Plan changes are managed via the admin panel'
              }
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full bg-[#C6F24E]/40 px-4 py-2 text-[13px] font-medium text-[#0A0A0A]/50"
            >
              {isTr ? 'Planı yükselt' : 'Upgrade plan'}
            </button>
            <button
              type="button"
              disabled
              aria-disabled="true"
              title={
                isTr
                  ? 'Plan değişikliği admin panelinden yapılır'
                  : 'Plan changes are managed via the admin panel'
              }
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-white/20 bg-transparent px-4 py-2 text-[13px] font-medium text-white/50"
            >
              {isTr ? 'Planı değiştir' : 'Change plan'}
            </button>
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
                      {inv.id.startsWith('INV-') ? inv.id : inv.id.slice(0, 10).toUpperCase()}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-[#0A0A0A]">
                      {formatCurrency(inv.amount, inv.currency || null, isTr ? 'tr' : 'en')}
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
                        {inv.id.startsWith('INV-') ? inv.id : inv.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
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
    </section>
  );
}
