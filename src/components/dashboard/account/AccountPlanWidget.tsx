"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Crown, Loader2 } from "lucide-react";
import type { Locale } from "@/lib/translations";

// §38.37 — Hesabım sağ rail Plan widget. Tasarım .design-owner-2026/
// page-account.jsx:169-205 birebir: graphite dark hero + lime accent + plan
// name + price + usage progress bars (Yorum + Ekip + Lokasyon).
//
// Backend reuse: /api/billing/summary (CLAUDE.md §38.14 mevcut). Owner-scoped
// IDOR. Quota: feedback count month-to-date / plan limit. Ek metric'ler
// (team + restaurant) caller-side fetch (workspace-scoped).
//
// Pure presentational + data-fetch (client component). Empty state: API fail
// → loader fallback, owner panel zaten plan-aware (TrialBanner §11.11 paraller).

interface UsageBar {
  label: string;
  used: number;
  limit: number;
  unit?: string;
}

interface BillingSummary {
  plan: string;
  planLabel: string;
  trialDaysLeft: number | null;
  renewsAt: string | null;
  quota: { used: number; limit: number };
  // §38.51 — AI yanıt aylık quota (FeedbackReply.source='ai_copilot' count).
  aiReplies?: { used: number; limit: number };
  amount: number | null;
  currency: string;
  billingCycle: string | null;
}

export interface AccountPlanWidgetProps {
  locale?: Locale;
  /** Workspace-level usage: team count + restaurant count. Caller fetches. */
  teamCount?: number;
  restaurantCount?: number;
  // Plan tier'ına göre limit (UI runtime — schema'da yok). Pulse Pro 8 ekip,
  // Growth 4, Starter 2, Trial 2.
  teamLimit?: number;
  restaurantLimit?: number;
}

function ProgressBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const tone = pct >= 90 ? "#FCA5A5" : pct >= 70 ? "#FBBF24" : "#C6F24E";
  return (
    <div
      className="h-1.5 w-full rounded-full overflow-hidden bg-white/10"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full transition-[width] duration-300"
        style={{ width: `${pct}%`, backgroundColor: tone }}
      />
    </div>
  );
}

export function AccountPlanWidget({
  locale = "tr",
  teamCount = 0,
  restaurantCount = 0,
  teamLimit,
  restaurantLimit,
}: AccountPlanWidgetProps) {
  const isTr = locale === "tr";
  const intLocale = isTr ? "tr-TR" : "en-US";
  const [data, setData] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/billing/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d && d.plan) setData(d);
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
      <div className="rounded-2xl bg-[#0A0A0A] p-5 flex items-center justify-center text-white/60 text-[12px]">
        <Loader2 size={14} className="animate-spin mr-2" />
        {isTr ? "Yükleniyor…" : "Loading…"}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Plan tier defaults (UI runtime — schema'da yok). Caller override edebilir.
  const teamMax = teamLimit ?? (data.plan === "yearly" ? 8 : data.plan === "monthly" ? 4 : 2);
  const restaurantMax =
    restaurantLimit ?? (data.plan === "yearly" ? 5 : data.plan === "monthly" ? 3 : 1);

  // §38.51 — Tasarım birebir 3 bar: Konum + Ekip + AI yanıt (Yorum bar silindi,
  // AI yanıt eklendi). Kullanıcı kararı (CLAUDE.md §38.51): API çağrısı bar skip.
  // .design-owner-2026/page-account.jsx Plan widget line 175-198 paterni.
  const usageBars: UsageBar[] = [
    {
      label: isTr ? "Lokasyon" : "Locations",
      used: restaurantCount,
      limit: restaurantMax,
    },
    {
      label: isTr ? "Ekip üyesi" : "Team members",
      used: teamCount,
      limit: teamMax,
    },
    {
      label: isTr ? "AI yanıt / ay" : "AI replies / mo",
      used: data.aiReplies?.used ?? 0,
      limit: data.aiReplies?.limit ?? 500,
    },
  ];

  const priceText =
    data.amount != null
      ? `${data.currency === "TRY" ? "₺" : "$"}${data.amount.toLocaleString(intLocale)}${data.billingCycle === "monthly" ? (isTr ? " /ay" : " /mo") : ""}`
      : null;

  return (
    <div className="rounded-2xl bg-[#0A0A0A] p-5 text-white shadow-[0_4px_20px_rgba(10,10,10,0.18)]">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#C6F24E]/30 bg-[#C6F24E]/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.18em] text-[#C6F24E]">
          <Crown size={11} strokeWidth={2} />
          {isTr ? "PLAN" : "PLAN"}
        </div>
        {data.trialDaysLeft != null && data.trialDaysLeft > 0 && (
          <span className="text-[10px] font-mono text-white/60 uppercase tracking-wider">
            {isTr
              ? `${data.trialDaysLeft} gün deneme`
              : `${data.trialDaysLeft}d trial`}
          </span>
        )}
      </div>

      <div className="mb-1">
        <div className="bz-h-tight text-[20px] leading-tight text-white">
          {data.planLabel}
        </div>
        {priceText && (
          <div className="bz-mono mt-0.5 text-[12px] text-white/60">{priceText}</div>
        )}
      </div>

      <div className="mt-5 space-y-3">
        {usageBars.map((bar) => (
          <div key={bar.label}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-[11px] text-white/70">{bar.label}</span>
              <span className="bz-mono tabular-nums text-[11px] text-white/90">
                {bar.used.toLocaleString(intLocale)}
                <span className="text-white/40">
                  {" "}
                  / {bar.limit.toLocaleString(intLocale)}
                </span>
              </span>
            </div>
            <ProgressBar used={bar.used} limit={bar.limit} />
          </div>
        ))}
      </div>

      <Link
        href={`/${locale}/pricing`}
        className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[#C6F24E] hover:bg-[#A8D62E] active:scale-[0.98] px-3 py-2 text-[12px] font-semibold text-[#0A0A0A] transition-colors"
      >
        {isTr ? "Planı yönet" : "Manage plan"}
      </Link>
    </div>
  );
}

export default AccountPlanWidget;
