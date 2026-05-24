'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Download, FileText, Zap } from 'lucide-react';
import Link from 'next/link';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';
import SuperadminBlock from '@/components/admin/SuperadminBlock';
import { AlertBanner, PageHeader, Badge } from '@/components/ui';

interface BillingSummary {
  plan: string;
  planLabel: string;
  trialDaysLeft: number | null;
  renewsAt: string | null;
  quota: { used: number; limit: number };
  paymentMethod: { brand: string; last4: string } | null;
  // §15.2 canonical billing — marketing /pricing parity.
  amount?: number | null;
  yearlyTotal?: number | null;
  currency?: string | null;
  billingCycle?: string | null;
  subscriptionPlanId?: string | null;
  tier?: { id: string; name: string | null; isFeatured: boolean } | null;
}

function formatCurrency(value: number | null | undefined, currency: string | null | undefined, isTr: boolean): string {
  if (value == null) return '';
  const cur = currency || 'TRY';
  try {
    return new Intl.NumberFormat(isTr ? 'tr-TR' : 'en-US', {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${cur} ${value.toFixed(0)}`;
  }
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  url?: string;
}

export default function AdminBillingPage() {
  return (
    <SuperadminBlock>
      <AdminBillingBody />
    </SuperadminBlock>
  );
}

function AdminBillingBody() {
  const { locale } = useAdminTranslation();
  const isTr = locale === 'tr';
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, i] = await Promise.all([fetch('/api/billing/summary'), fetch('/api/billing/invoices')]);
        if (s.ok) setSummary(await s.json());
        else setFetchError('Faturalama özeti getirilemedi.');
        if (i.ok) {
          const data = await i.json();
          setInvoices((data.data as Invoice[]) ?? []);
        }
      } catch (e) {
        console.error(e);
        setFetchError('Bağlantı hatası — faturalama bilgileri şu an gelmiyor.');
      }
      setLoading(false);
    })();
  }, []);

  const usedPct = summary ? Math.min(100, Math.round((summary.quota.used / Math.max(1, summary.quota.limit)) * 100)) : 0;

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8 space-y-4">
      <PageHeader
        eyebrow={isTr ? 'FATURALANDIRMA' : 'BILLING'}
        title={isTr ? 'Plan & faturalar' : 'Plan & invoices'}
        description={
          isTr
            ? 'Mevcut planını yönet, fatura geçmişini indir ve aylık kullanım metriklerini takip et.'
            : 'Manage your plan, download invoice history, and track monthly usage metrics.'
        }
      />

      {fetchError && (
        <AlertBanner kind="danger" onDismiss={() => setFetchError(null)}>
          {fetchError}
        </AlertBanner>
      )}

      {loading ? null : (
        <>
          <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-[#EDEDED] bg-white p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="pulse-eyebrow text-[#737373]">{isTr ? 'MEVCUT PLAN' : 'CURRENT PLAN'}</p>
                  <h2 className="mt-1 text-[24px] font-medium text-[#0A0A0A]">
                    {summary?.planLabel || (isTr ? 'Trial' : 'Trial')}
                  </h2>
                  {/* §15.2 canonical billing — marketing /pricing parity satırı.
                      Tier'a bağlı subscription'da ₺X/ay + cycle + yıllık toplam
                      gösterimi. Admin override varsa hep amount kullanılır. */}
                  {summary?.amount != null ? (
                    <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-[20px] font-medium text-[#0A0A0A]" style={{ fontFamily: 'var(--font-heading)' }}>
                        {formatCurrency(summary.amount, summary.currency, isTr)}
                      </span>
                      <span className="text-[12px] text-[#737373]">
                        {summary.billingCycle === 'yearly'
                          ? isTr ? '/ yıl' : '/ year'
                          : summary.billingCycle === 'monthly'
                            ? isTr ? '/ ay' : '/ mo'
                            : ''}
                      </span>
                      {summary.billingCycle === 'yearly' && summary.yearlyTotal != null && summary.tier ? (
                        <span className="text-[11px] text-[#737373]">
                          ·{' '}
                          {isTr
                            ? `aylık eş değer ${formatCurrency(Math.round(summary.yearlyTotal / 12), summary.currency, isTr)}`
                            : `≈ ${formatCurrency(Math.round(summary.yearlyTotal / 12), summary.currency, isTr)}/mo`}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <p className="mt-1 text-[13px] text-[#525252]">
                    {summary?.trialDaysLeft
                      ? isTr
                        ? `${summary.trialDaysLeft} günlük deneme süresi kaldı.`
                        : `${summary.trialDaysLeft} days left on your trial.`
                      : summary?.renewsAt
                        ? isTr
                          ? `Yenileme: ${new Date(summary.renewsAt).toLocaleDateString('tr-TR')}`
                          : `Renews: ${new Date(summary.renewsAt).toLocaleDateString('en-US')}`
                        : isTr
                          ? 'Yenileme planlaması yok.'
                          : 'No renewal scheduled.'}
                  </p>
                </div>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#C6F24E] px-4 py-2 text-[12px] font-semibold text-[#0A0A0A] hover:bg-[#A8D62E]"
                >
                  <Zap size={12} /> {isTr ? 'Planı yükselt' : 'Upgrade'}
                </Link>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <p className="pulse-eyebrow text-[#737373]">{isTr ? 'YORUM KOTASI' : 'REVIEW QUOTA'}</p>
                  <p className="text-[12px] text-[#525252]">
                    {summary?.quota.used ?? 0} / {summary?.quota.limit ?? 0}
                  </p>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#F5F5F5]">
                  <div className="h-full rounded-full bg-[#C6F24E]" style={{ width: `${usedPct}%` }} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#EDEDED] bg-white p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <CreditCard size={14} className="text-[#0A0A0A]" />
                <p className="pulse-eyebrow text-[#737373]">{isTr ? 'ÖDEME YÖNTEMİ' : 'PAYMENT METHOD'}</p>
              </div>
              {summary?.paymentMethod ? (
                <p className="mt-3 text-[15px] font-medium text-[#0A0A0A]">
                  {summary.paymentMethod.brand} •••• {summary.paymentMethod.last4}
                </p>
              ) : (
                <p className="mt-3 text-[13px] text-[#525252]">
                  {isTr ? 'Henüz ödeme yöntemi eklenmedi.' : 'No payment method added yet.'}
                </p>
              )}
              <div className="mt-4 flex items-center gap-2">
                <Badge kind="ghost">{isTr ? 'Yakında' : 'Coming soon'}</Badge>
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="bz-btn cursor-not-allowed opacity-50"
                  >
                  {isTr ? 'Yöntem ekle' : 'Add method'}
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#EDEDED] bg-white">
            <div className="flex items-center justify-between border-b border-[#EDEDED] p-5">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-[#0A0A0A]" />
                <h3 className="text-[16px] font-semibold text-[#0A0A0A]">
                  {isTr ? 'Fatura geçmişi' : 'Invoice history'}
                </h3>
              </div>
            </div>
            {invoices.length === 0 ? (
              <div className="p-10 text-center text-[13px] text-[#737373]">
                {isTr ? 'Henüz fatura yok.' : 'No invoices yet.'}
              </div>
            ) : (
              <>
              {/* Mobile card list */}
              <div className="flex flex-col gap-2.5 p-3 lg:hidden">
                {invoices.map((inv) => (
                  <div key={inv.id} className="bz-card p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-semibold text-[#0A0A0A]">
                          ₺{inv.amount.toFixed(2)}
                        </div>
                        <div className="mt-1 text-[11px] text-[#737373]">
                          {new Date(inv.date).toLocaleDateString(isTr ? 'tr-TR' : 'en-US')}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span
                          className={`pulse-eyebrow rounded px-2 py-1 ${
                            inv.status === 'paid'
                              ? 'bg-[#EAF9B8] text-[#0A0A0A]'
                              : inv.status === 'pending'
                                ? 'bg-[#F5F5F5] text-[#737373]'
                                : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {inv.status === 'paid'
                            ? isTr
                              ? 'ÖDENDİ'
                              : 'PAID'
                            : inv.status === 'pending'
                              ? isTr
                                ? 'BEKLİYOR'
                                : 'PENDING'
                              : isTr
                                ? 'BAŞARISIZ'
                                : 'FAILED'}
                        </span>
                        {inv.url ? (
                          <a
                            href={inv.url}
                            className="inline-flex items-center gap-1 text-[12px] text-[#525252] hover:text-[#0A0A0A]"
                          >
                            <Download size={12} /> PDF
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="overflow-x-auto hidden lg:block">
                <table className="w-full min-w-[480px] text-left text-[13px]">
                  <thead>
                    <tr className="pulse-eyebrow border-b border-[#EDEDED] bg-[#FAFAFA] text-[#737373]">
                      <th className="px-5 py-3 font-medium">{isTr ? 'TARİH' : 'DATE'}</th>
                      <th className="px-5 py-3 font-medium">{isTr ? 'TUTAR' : 'AMOUNT'}</th>
                      <th className="px-5 py-3 font-medium">{isTr ? 'DURUM' : 'STATUS'}</th>
                      <th className="px-5 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-[#EDEDED] last:border-0">
                        <td className="px-5 py-3 whitespace-nowrap">{new Date(inv.date).toLocaleDateString(isTr ? 'tr-TR' : 'en-US')}</td>
                        <td className="px-5 py-3 whitespace-nowrap font-medium text-[#0A0A0A]">₺{inv.amount.toFixed(2)}</td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span
                            className={`pulse-eyebrow rounded px-2 py-1 ${
                              inv.status === 'paid'
                                ? 'bg-[#EAF9B8] text-[#0A0A0A]'
                                : inv.status === 'pending'
                                  ? 'bg-[#F5F5F5] text-[#737373]'
                                  : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {inv.status === 'paid'
                              ? isTr
                                ? 'ÖDENDİ'
                                : 'PAID'
                              : inv.status === 'pending'
                                ? isTr
                                  ? 'BEKLİYOR'
                                  : 'PENDING'
                                : isTr
                                  ? 'BAŞARISIZ'
                                  : 'FAILED'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          {inv.url ? (
                            <a
                              href={inv.url}
                              className="inline-flex items-center gap-1 text-[12px] text-[#525252] hover:text-[#0A0A0A]"
                            >
                              <Download size={12} /> {isTr ? 'PDF' : 'PDF'}
                            </a>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
