'use client';

import { useEffect, useState } from 'react';
import { paymentResultMessage } from '@/lib/billing/payment-result-copy';
import { Check, Download, FileText, Loader2, Receipt } from 'lucide-react';
import { AlertBanner, Badge, Eyebrow, Modal } from '@/components/ui';
import { SkBox } from '@/components/ui/skeletons/PageSkeleton';
import type { PublicPlan } from '@/lib/subscription-plans';
import { businessCountLabel } from '@/lib/plan-catalog';
import { PLAN_LABELS } from '@/lib/constants';
import { resolveDisplayTimeZone } from '@/lib/timezone';

/** Workspace counts the caller already has (no extra fetch here). */
export interface BillingUsageCounts {
  restaurantCount: number;
  teamCount: number;
}

interface BillingReadOnlyCardProps {
  isTr: boolean;
  /**
   * Optional "Kullanım" row: businesses + team members (+ this month's AI
   * replies from the summary). Omitted → the row is not rendered.
   */
  usage?: BillingUsageCounts;
}

interface BillingSummary {
  plan: string;
  planLabel: string;
  status: string;
  trialDaysLeft: number | null;
  renewsAt: string | null;
  quota: { used: number; limit: number };
  /** Pulse AI replies this month (FeedbackReply.source='ai_copilot'). */
  aiReplies?: { used: number; limit: number };
  paymentMethod: { brand: string; last4: string } | null;
  amount: number | null;
  /** §15.2 canonical billing — yıllık toplam (tier'a bağlı subscription'da). */
  yearlyTotal?: number | null;
  currency: string | null;
  billingCycle: string | null;
  subscriptionPlanId?: string | null;
  tier?: { id: string; name: string | null; isFeatured: boolean } | null;
  /** §44 self-service provider signals — null/'manual' = manual admin flow.
   *  'paynkolay' = owner paid a period by card (no auto-renewal).
   *  Stage 149 §38.229 — eski 'iyzico' enum slot kaldırıldı (provider iptal). */
  source?: string | null;
  cancelAtPeriodEnd?: boolean;
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
 * Card payments go through PayNKolay (§44): one payment buys one period and
 * the owner extends from this card; admin-managed plans stay manual (§44.5).
 */
export default function BillingReadOnlyCard({ isTr, usage }: BillingReadOnlyCardProps) {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // The summary's planLabel follows the user's saved language, not the page
  // URL — resolve the legacy plan bucket label for the language on screen.
  const planName = summary
    ? (summary.tier?.name ?? PLAN_LABELS[summary.plan]?.[isTr ? 'tr' : 'en'] ?? summary.planLabel)
    : isTr ? 'Deneme' : 'Trial';
  const [notice, setNotice] = useState<{ kind: 'success' | 'danger'; message: string } | null>(null);
  const paidByCard = summary?.source === 'paynkolay';

  // Result of a PayNKolay payment: the return route sends the owner back
  // with `?payment=<status>` (CLAUDE.md §44). Shown once, then dropped from
  // the URL so a reload does not repeat it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('payment');
    if (!status) return;
    const m = paymentResultMessage(status, isTr ? 'tr' : 'en');
    if (m) setNotice(m);
    params.delete('payment');
    const qs = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
  }, [isTr]);

  // §44 Stage 148 (§38.228) — Owner-side plan picker modal for self-service
  // upgrade. Triggered by "Planı yükselt" CTA in the dark hero. Fetches the
  // public plan catalog (/api/plans) lazily on open so the card mount stays
  // cheap. Each card-payable tier opens the PayNKolay checkout.
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
        timeZone: resolveDisplayTimeZone(),
      });
    } catch {
      return iso;
    }
  };

  if (loading) {
    // Shape-matching skeleton: plan hero + payment/address column + invoices.
    return (
      <section id="billing" className="space-y-4 scroll-mt-20" aria-busy="true">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-3.5">
          <div className="rounded-2xl bg-[#0A0A0A] p-5 sm:p-6 space-y-3">
            <div className="h-3 w-24 rounded bg-white/15" />
            <div className="h-9 w-40 rounded bg-white/15" />
            <div className="h-3 w-32 rounded bg-white/10" />
            <div className="h-10 w-36 rounded-full bg-white/15 mt-6" />
          </div>
          <div className="flex flex-col gap-3.5">
            <div className="bz-card p-5 space-y-3">
              <SkBox className="h-3 w-28" />
              <SkBox className="h-4 w-48 max-w-full" />
            </div>
            <div className="bz-card p-5 space-y-3">
              <SkBox className="h-3 w-24" />
              <SkBox className="h-4 w-44 max-w-full" />
            </div>
          </div>
        </div>
        <div className="bz-card p-5 space-y-3">
          <SkBox className="h-4 w-24" />
          <SkBox className="h-10 w-full" />
        </div>
      </section>
    );
  }

  const intLocale = isTr ? 'tr-TR' : 'en-US';
  const usageItems: Array<{ label: string; used: number; limit: number | null }> = usage
    ? [
        { label: isTr ? 'Toplam işletme' : 'Total businesses', used: usage.restaurantCount, limit: null },
        { label: isTr ? 'Ekip üyesi' : 'Team members', used: usage.teamCount, limit: null },
        {
          label: isTr ? 'AI yanıt (bu ay)' : 'AI replies (this month)',
          used: summary?.aiReplies?.used ?? 0,
          limit: summary?.aiReplies?.limit ?? null,
        },
      ]
    : [];

  // The settings section above already titles this block ("Plan ve
  // faturalama"), so the old in-card eyebrow + title + "contact us" caption
  // (which contradicted the self-service upgrade button) are gone.
  return (
    <section id="billing" className="space-y-4 scroll-mt-20">
      {error && (
        <AlertBanner kind="danger" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      )}
      {notice && (
        <AlertBanner
          kind={notice.kind === 'success' ? 'success' : 'danger'}
          onDismiss={() => setNotice(null)}
        >
          {notice.message}
        </AlertBanner>
      )}

      {/* ─── Top row: Plan hero (dark) + Payment method ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-3.5">
        {/* Plan hero — graphite bg */}
        <div className="rounded-2xl bg-[#0A0A0A] p-5 sm:p-6 text-white">
          <p className="bz-mono text-[11px] font-medium tracking-[0.18em] uppercase text-[#A3A3A3]">
            {isTr ? 'MEVCUT PLAN' : 'CURRENT PLAN'}
          </p>
          <h3 className="bz-h-tight-2 mt-1.5 text-[36px] sm:text-[40px] text-white">
            {planName}
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

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {/* §44 PayNKolay: each payment buys one period; there is no
                automatic charge, so a card subscriber extends from here. */}
            <button
              type="button"
              onClick={handleOpenPicker}
              className="bz-btn-lime inline-flex items-center"
            >
              {paidByCard
                ? isTr
                  ? 'Süreyi uzat'
                  : 'Extend period'
                : isTr
                  ? 'Planı yükselt'
                  : 'Upgrade plan'}
            </button>
            <span className="text-[11px] text-[#A3A3A3]">
              {paidByCard
                ? isTr
                  ? 'Kartınızdan otomatik çekim yapılmaz; dönem bitmeden uzatabilirsiniz.'
                  : 'Your card is never charged automatically; extend before the period ends.'
                : isTr
                  ? 'Paketinizi seçin, PayNKolay güvenli ödeme sayfasına geçin.'
                  : 'Pick a plan and continue to the secure PayNKolay page.'}
            </span>
          </div>
        </div>

        {/* Payment method + Billing address (right column stacked) */}
        <div className="flex flex-col gap-3.5">
          <div className="bz-card p-5">
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
              <Badge kind="ghost">{isTr ? 'Destek üzerinden' : 'Via support'}</Badge>
            </div>
          </div>

          <div className="bz-card p-5">
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

      {/* ─── Usage (businesses, team, AI replies this month) ─── */}
      {usageItems.length > 0 && (
        <div className="bz-card grid grid-cols-3 divide-x divide-[#EDEDED]">
          {usageItems.map((item) => {
            const pct =
              item.limit && item.limit > 0
                ? Math.min(100, Math.round((item.used / item.limit) * 100))
                : null;
            return (
              <div key={item.label} className="min-w-0 p-3 sm:p-5">
                <div className="text-[12px] leading-tight text-[#737373]">{item.label}</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="bz-h-tight tabular-nums text-[20px] text-[#0A0A0A]">
                    {item.used.toLocaleString(intLocale)}
                  </span>
                  {item.limit != null && (
                    <span className="tabular-nums text-[12px] text-[#737373]">
                      / {item.limit.toLocaleString(intLocale)}
                    </span>
                  )}
                </div>
                {pct != null && (
                  <div
                    className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#EDEDED]"
                    role="progressbar"
                    aria-label={item.label}
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: pct >= 90 ? '#DC2626' : pct >= 70 ? '#D97706' : '#A8D62E',
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Invoice list ─── */}
      <div className="bz-card">
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
              ? 'Henüz fatura yok. İlk faturan oluşturulduğunda burada görünür.'
              : 'No invoices yet. Your first invoice will appear here.'}
          </div>
        ) : (
          <>
            {/* Desktop table — scroll wrapper so a long description / invoice
                number can't push the row past the card at md–lg widths. */}
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr
                  className="bz-mono border-b border-[#EDEDED] bg-[#FAFAFA] text-[#737373]"
                  style={{ fontSize: 11, letterSpacing: '0.16em' }}
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
                    <td className="bz-mono px-5 py-3.5 text-[12px] text-[#525252]">
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
            </div>

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
                      <span className="bz-mono">
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

      {/* §44 — Cancel modal kaldırıldı (PayNKolay'da otomatik yenileme yok).
          customer portal içinde tam UI ile yapılır (renewsAt countdown,
          grace period info, payment method update — hepsi tek surface).
          "Aboneliği yönet" buton portal'a yönlendirir. */}

      {/* §44 Stage 148 (§38.228) — Plan picker modal. Owner panel'da inline
          tier seçimi yaparak marketing /pricing turunu atlatır. PayNKolay ile
          ödenebilen tier'lar "Kartla öde" CTA'sıyla checkout'a gider;
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
              // Card payment (PayNKolay, TRY): one month here; yearly is on /pricing.
              const checkoutTry = p.paymentProvider === 'paynkolay' ? p.checkout?.monthlyTry ?? null : null;
              const wired = checkoutTry != null && checkoutTry > 0;
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
                      className={`bz-h-tight text-[28px] font-medium leading-none tracking-[-0.03em] ${
                        isDark ? 'text-[#C6F24E]' : 'text-[#0A0A0A]'
                      }`}
                    >
                      {checkoutTry != null && checkoutTry > 0
                        ? new Intl.NumberFormat(isTr ? 'tr-TR' : 'en-US', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(checkoutTry)
                        : monthlyShown === 0
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
                  {p.maxBusinesses != null && (
                    <p className={`mt-2 text-[12px] font-medium ${isDark ? 'text-[#C6F24E]' : 'text-[#0A0A0A]'}`}>
                      {businessCountLabel(p.maxBusinesses, isTr ? 'tr' : 'en')}
                    </p>
                  )}
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
                      href={`/api/billing/paynkolay/checkout?planId=${encodeURIComponent(p.id)}&cycle=monthly&locale=${isTr ? 'tr' : 'en'}`}
                      rel="nofollow"
                      className={`block min-h-[40px] w-full rounded-full py-2.5 text-center text-[13px] font-medium transition-colors ${
                        isDark
                          ? 'bg-[#C6F24E] text-[#0A0A0A] hover:bg-[#A8D62E]'
                          : 'border border-[#0A0A0A] text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white'
                      }`}
                    >
                      {isTr ? 'Kartla öde' : 'Pay by card'} ·{' '}
                      {new Intl.NumberFormat(isTr ? 'tr-TR' : 'en-US', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(checkoutTry as number)}
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="block min-h-[40px] w-full rounded-full bg-[#FAFAFA] py-2.5 text-center text-[13px] font-medium text-[#A3A3A3] cursor-not-allowed"
                      title={
                        isTr
                          ? 'Bu paket için kartla ödeme henüz açılmadı.'
                          : 'Card payment is not set up for this plan yet.'
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
