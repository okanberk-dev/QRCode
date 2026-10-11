"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { Locale } from "@/lib/translations";
import { PLAN_LABELS } from "@/lib/constants";
import { resolveDisplayTimeZone } from "@/lib/timezone";

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
  /** null → no plan limit exists for this metric; render the count only. */
  limit: number | null;
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
  tier?: { id: string; name: string } | null;
}

export interface AccountPlanWidgetProps {
  locale?: Locale;
  /** Workspace-level usage: team count + restaurant count. Caller fetches. */
  teamCount?: number;
  restaurantCount?: number;
  /**
   * Optional real limits. Plans carry no location / team caps in the schema
   * (SubscriptionPlan has none), so by default only the counts are shown —
   * the old hard-coded "trial = 1 location" rendered "2 / 1" as a red
   * over-limit bar for owners who were never limited.
   */
  teamLimit?: number;
  restaurantLimit?: number;
  /** "Manage" action — the account hub opens its billing tab in place. */
  onManage?: () => void;
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
  onManage,
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

  // Location / team caps only when the caller passes a real limit — no
  // invented per-plan defaults (see AccountPlanWidgetProps).
  const teamMax = teamLimit ?? null;
  const restaurantMax = restaurantLimit ?? null;
  // The summary's planLabel follows the user's saved language, not the page
  // URL — resolve the legacy plan bucket label for the locale on screen.
  const planName =
    data.tier?.name ?? PLAN_LABELS[data.plan]?.[isTr ? "tr" : "en"] ?? data.planLabel;

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
      limit: data.aiReplies?.limit ?? null,
    },
  ];

  // §38.63 — Renews date format (tasarım: "Bir sonraki ödeme · 14 Mayıs 2026").
  const renewsText = data.renewsAt
    ? new Date(data.renewsAt).toLocaleDateString(intLocale, {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: resolveDisplayTimeZone(),
      })
    : null;

  // Hero price + cycle suffix ayrı tutuluyor (tasarımda 36px price + 12px /ay
  // muted ayrı element). Eski combined `priceText` artık sadece fallback.
  const priceMain = data.amount != null
    ? `${data.currency === "TRY" ? "₺" : "$"}${data.amount.toLocaleString(intLocale)}`
    : null;
  const priceCycleSuffix = data.billingCycle === "monthly" ? (isTr ? "/ay" : "/mo") : "";

  return (
    // §38.63 — Tasarım .design-owner-2026/page-account.jsx Plan widget parity:
    // (1) Eyebrow plan adı + lime + bz-pulse-dot (önceki "PLAN" + Crown drift'ti);
    // (2) 36px hero price + bz-mono /ay suffix muted; (3) renewsAt date
    // "Bir sonraki ödeme · ..."; (4) 2 button row (Yükselt lime + Yönet ghost),
    // önceki tek "Planı yönet" full-width drift'ti. Trial gün kalan badge
    // header sağına (sadece >0 ise), tasarımda yok ama §11.11 TrialBanner
    // entegrasyonu için faydalı sinyal.
    /* §38.66 — Plan dark hero shadow Apple-soft tier'a düşürüldü:
       0_4px_20px_0.18 (heavy graphite drop) → bz-elev-2 (0_4px_16px_0.06).
       Kart-internal mid-tier; aşırı drama yok, fonksiyonel depth. */
    <div className="rounded-2xl bg-[#0A0A0A] p-5 text-white bz-elev-2">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="inline-flex items-center gap-1.5">
          <span className="bz-pulse-dot" aria-hidden />
          {/* Plan name sits in the eyebrow only when the hero shows a price;
              otherwise the hero already is the plan name ("Deneme" twice). */}
          <span className="pulse-eyebrow text-[#C6F24E]">
            {priceMain ? planName : isTr ? "MEVCUT PLAN" : "CURRENT PLAN"}
          </span>
        </div>
        {data.trialDaysLeft != null && data.trialDaysLeft > 0 && (
          <span className="text-[10px] font-mono text-white/60 uppercase tracking-wider">
            {isTr
              ? `${data.trialDaysLeft} gün kaldı`
              : `${data.trialDaysLeft} days left`}
          </span>
        )}
      </div>

      {/* Hero price — tasarım 36px h-tight-2 + 12px mono suffix */}
      {priceMain ? (
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="bz-h-tight-2 text-white" style={{ fontSize: 36, lineHeight: 1 }}>
            {priceMain}
          </span>
          {priceCycleSuffix && (
            <span className="bz-mono text-[12px] text-white/50">{priceCycleSuffix}</span>
          )}
        </div>
      ) : (
        <div className="bz-h-tight text-[20px] leading-tight text-white mb-1">
          {planName}
        </div>
      )}

      {/* Renews date — tasarım pattern "Bir sonraki ödeme · 14 Mayıs 2026" */}
      {renewsText && (
        <div className="bz-mono text-[11px] text-white/55 mb-4">
          {isTr ? "Bir sonraki ödeme · " : "Next payment · "}
          {renewsText}
        </div>
      )}
      {!renewsText && <div className="mb-4" />}

      <div className="space-y-3">
        {usageBars.map((bar) => (
          <div key={bar.label}>
            <div className={`flex items-baseline justify-between ${bar.limit != null ? "mb-1.5" : ""}`}>
              <span className="text-[11px] text-white/70">{bar.label}</span>
              <span className="bz-mono tabular-nums text-[11px] text-white/90">
                {bar.used.toLocaleString(intLocale)}
                {bar.limit != null && (
                  <span className="text-white/40">
                    {" "}
                    / {bar.limit.toLocaleString(intLocale)}
                  </span>
                )}
              </span>
            </div>
            {bar.limit != null && <ProgressBar used={bar.used} limit={bar.limit} />}
          </div>
        ))}
      </div>

      {/* §38.63 — 2-button row: lime "Yükselt" (primary) + ghost "Yönet"
          (transparent border). Tasarım line 207: `style={{ flex: 1 }}` lime +
          `style={{ borderColor: 'rgba(255,255,255,0.18)', color: '#FFF' }}`
          ghost. Her ikisi de /pricing'e gider — placeholder subtree;
          gerçek "Yönet" Dodo customer portal (Stage 142 §38.222) üzerinden
          BillingReadOnlyCard CTA'sıyla ayrı yapılır. */}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Link
          href={`/${locale}/pricing`}
          className="inline-flex items-center justify-center rounded-full bg-[#C6F24E] hover:bg-[#A8D62E] active:scale-[0.98] px-3 py-2 text-[12px] font-semibold text-[#0A0A0A] transition-colors"
        >
          {isTr ? "Yükselt" : "Upgrade"}
        </Link>
        {/* "Yönet" used to link to /pricing too (same target as "Yükselt").
            It now opens the billing tab: plan details, invoices and the
            subscription portal live there. */}
        {onManage ? (
          <button type="button" onClick={onManage} className="bz-btn-on-dark bz-btn-sm">
            {isTr ? "Yönet" : "Manage"}
          </button>
        ) : (
          <Link
            href={`/${locale}/dashboard/account?section=billing`}
            className="bz-btn-on-dark bz-btn-sm"
          >
            {isTr ? "Yönet" : "Manage"}
          </Link>
        )}
      </div>
    </div>
  );
}

export default AccountPlanWidget;
