"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, Receipt } from "lucide-react";
import { Eyebrow, Badge } from "@/components/ui";
import type { Locale } from "@/lib/translations";

// §38.37 — Hesabım sağ rail Recent invoices widget. Tasarım .design-owner-2026/
// page-account.jsx:207-225 birebir: 4 satır recent invoices, date + amount +
// status badge + download (varsa). Backend reuse: /api/billing/invoices.
//
// Empty state: hiç fatura yok → kart gizli (sade — owner trial'da fatura yok).
// Status mapping: paid → ok / pending → warn / failed → danger.

interface Invoice {
  id: string;
  invoiceNumber: string | null;
  date: string;
  amount: number;
  status: string;
  url?: string;
  currency: string;
  description?: string | null;
}

const TAKE = 4;

function statusBadge(status: string): { kind: "ok" | "warn" | "danger" | "ghost"; tr: string; en: string } {
  const s = status.toLowerCase();
  if (s === "paid" || s === "succeeded")
    return { kind: "ok", tr: "Ödendi", en: "Paid" };
  if (s === "pending" || s === "processing")
    return { kind: "warn", tr: "Bekliyor", en: "Pending" };
  if (s === "failed" || s === "canceled")
    return { kind: "danger", tr: "Başarısız", en: "Failed" };
  return { kind: "ghost", tr: status, en: status };
}

export interface AccountInvoicesWidgetProps {
  locale?: Locale;
}

export function AccountInvoicesWidget({ locale = "tr" }: AccountInvoicesWidgetProps) {
  const isTr = locale === "tr";
  const intLocale = isTr ? "tr-TR" : "en-US";
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/billing/invoices")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((res) => {
        if (cancelled) return;
        const list: Invoice[] = Array.isArray(res?.data) ? res.data : [];
        setInvoices(list.slice(0, TAKE));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="bz-card p-4 flex items-center justify-center text-[12px] text-[#737373]">
        <Loader2 size={14} className="animate-spin mr-2" />
        {isTr ? "Yükleniyor…" : "Loading…"}
      </div>
    );
  }

  if (invoices.length === 0) {
    return null;
  }

  return (
    <div className="bz-card p-5">
      <div className="flex items-center justify-between mb-3">
        <Eyebrow>{isTr ? "SON FATURALAR" : "RECENT INVOICES"}</Eyebrow>
        <Receipt size={13} strokeWidth={2} className="text-[#737373]" />
      </div>
      <ul className="space-y-2.5">
        {invoices.map((inv) => {
          const badge = statusBadge(inv.status);
          const date = new Date(inv.date).toLocaleDateString(intLocale, {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
          const currency = inv.currency === "TRY" ? "₺" : inv.currency === "USD" ? "$" : inv.currency;
          return (
            <li
              key={inv.id}
              className="flex items-center justify-between gap-2 text-[12px]"
            >
              <div className="min-w-0 flex-1">
                <div className="bz-mono tabular-nums text-[12px] text-[#0A0A0A] truncate">
                  {inv.invoiceNumber || `#${inv.id.slice(0, 8)}`}
                </div>
                <div className="bz-mono text-[10.5px] text-[#737373] tabular-nums">
                  {date}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="bz-mono tabular-nums text-[12px] font-semibold text-[#0A0A0A]">
                  {currency}
                  {inv.amount.toLocaleString(intLocale)}
                </span>
                <Badge kind={badge.kind}>{isTr ? badge.tr : badge.en}</Badge>
                {inv.url ? (
                  <a
                    href={inv.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bz-btn-icon"
                    aria-label={isTr ? "Faturayı indir" : "Download invoice"}
                  >
                    <Download size={12} strokeWidth={2} />
                  </a>
                ) : (
                  <span
                    className="bz-btn-icon opacity-30 cursor-not-allowed"
                    aria-hidden
                  >
                    <Download size={12} strokeWidth={2} />
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default AccountInvoicesWidget;
