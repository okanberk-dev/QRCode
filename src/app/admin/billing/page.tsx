'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Download, FileText, Loader2, Zap } from 'lucide-react';
import Link from 'next/link';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';

interface BillingSummary {
  plan: string;
  planLabel: string;
  trialDaysLeft: number | null;
  renewsAt: string | null;
  quota: { used: number; limit: number };
  paymentMethod: { brand: string; last4: string } | null;
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  url?: string;
}

export default function AdminBillingPage() {
  const { locale } = useAdminTranslation();
  const isTr = locale === 'tr';
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, i] = await Promise.all([fetch('/api/billing/summary'), fetch('/api/billing/invoices')]);
        if (s.ok) setSummary(await s.json());
        if (i.ok) {
          const data = await i.json();
          setInvoices((data.data as Invoice[]) ?? []);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, []);

  const usedPct = summary ? Math.min(100, Math.round((summary.quota.used / Math.max(1, summary.quota.limit)) * 100)) : 0;

  return (
    <div className="space-y-4">
      <header>
        <p className="pulse-eyebrow text-[#737373]">{isTr ? 'PANEL / FATURALANDIRMA' : 'PANEL / BILLING'}</p>
        <h1 className="mt-1 text-[22px] font-medium tracking-tight text-[#0A0A0A]" style={{ fontFamily: 'var(--font-heading)' }}>
          {isTr ? 'Plan & faturalar' : 'Plan & invoices'}
        </h1>
      </header>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-[#EDEDED] bg-white p-20 text-[#737373]">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-[#EDEDED] bg-white p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="pulse-eyebrow text-[#737373]">{isTr ? 'MEVCUT PLAN' : 'CURRENT PLAN'}</p>
                  <h2 className="mt-1 text-[24px] font-medium text-[#0A0A0A]" style={{ fontFamily: 'var(--font-heading)' }}>
                    {summary?.planLabel || (isTr ? 'Trial' : 'Trial')}
                  </h2>
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
              <button
                onClick={() => alert(isTr ? 'Yakında bağlanacak' : 'Coming soon')}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[#EDEDED] bg-white px-3.5 py-2 text-[12px] font-medium text-[#525252] hover:border-[#0A0A0A]"
              >
                {isTr ? 'Yöntem ekle' : 'Add method'}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-[#EDEDED] bg-white">
            <div className="flex items-center justify-between border-b border-[#EDEDED] p-5">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-[#0A0A0A]" />
                <h3 className="text-[16px] font-semibold text-[#0A0A0A]" style={{ fontFamily: 'var(--font-heading)' }}>
                  {isTr ? 'Fatura geçmişi' : 'Invoice history'}
                </h3>
              </div>
            </div>
            {invoices.length === 0 ? (
              <div className="p-10 text-center text-[13px] text-[#737373]">
                {isTr ? 'Henüz fatura yok.' : 'No invoices yet.'}
              </div>
            ) : (
              <table className="w-full text-left text-[13px]">
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
                      <td className="px-5 py-3">{new Date(inv.date).toLocaleDateString(isTr ? 'tr-TR' : 'en-US')}</td>
                      <td className="px-5 py-3 font-medium text-[#0A0A0A]">₺{inv.amount.toFixed(2)}</td>
                      <td className="px-5 py-3">
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
                      <td className="px-5 py-3 text-right">
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
            )}
          </section>
        </>
      )}
    </div>
  );
}
