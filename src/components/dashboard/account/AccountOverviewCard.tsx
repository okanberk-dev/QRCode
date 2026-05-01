"use client";

import { useEffect, useState } from "react";
import { Calendar, Crown, Loader2, MessageSquareText, Reply, Store } from "lucide-react";
import type { Locale } from "@/lib/translations";
import { Avatar, Badge, Eyebrow } from "@/components/ui";

interface OverviewData {
  email: string;
  name: string | null;
  plan: string | null;
  trialEndsAt: string | null;
  createdAt: string;
  restaurantsActive: number;
  totalReviews: number;
  reviews30d: number;
  reviews7d: number;
  repliesAll: number;
  replies30d: number;
}

interface AccountOverviewCardProps {
  locale: Locale;
}

const PLAN_TONE: Record<string, "lime" | "info" | "ghost" | "warn"> = {
  pro: "lime",
  growth: "info",
  starter: "ghost",
  trial: "warn",
};

const PLAN_LABEL: Record<string, { tr: string; en: string }> = {
  pro: { tr: "Pro", en: "Pro" },
  growth: { tr: "Growth", en: "Growth" },
  starter: { tr: "Starter", en: "Starter" },
  trial: { tr: "Deneme", en: "Trial" },
};

function initials(name: string | null, email: string): string {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .map((p) => p.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
  }
  return (email.charAt(0) || "?").toUpperCase();
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

/**
 * Account overview card — Hesabım sayfası başında, profile form'undan önce
 * mount'lanır. Owner için "tek bakışta hesap durumu":
 *   - Avatar + name + email + plan badge + trial countdown
 *   - 4 mini-stat: aktif işletme, toplam yorum, 30 gün yorum, 30 gün yanıt
 *   - "Üyelik tarihi" alt satırı
 *
 * Pulse design — bz-card, lime-soft accent. CLAUDE.md §11 token'ları + §23
 * panel scope.
 */
export function AccountOverviewCard({ locale }: AccountOverviewCardProps) {
  const isTr = locale === "tr";
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/overview");
        if (!cancelled && res.ok) {
          const json = (await res.json()) as OverviewData;
          setData(json);
        }
      } catch {
        /* fail silent — card hides */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="bz-card flex items-center justify-center gap-2 p-8 text-[13px] text-[#737373]">
        <Loader2 size={14} className="animate-spin" />
        {isTr ? "Hesap özeti yükleniyor…" : "Loading account overview…"}
      </div>
    );
  }

  if (!data) return null;

  const planKey = (data.plan ?? "trial").toLowerCase();
  const planTone = PLAN_TONE[planKey] ?? "ghost";
  const planLabel = (PLAN_LABEL[planKey] ?? PLAN_LABEL.trial)[isTr ? "tr" : "en"];
  const trialDays = daysUntil(data.trialEndsAt);
  const memberSince = new Date(data.createdAt).toLocaleDateString(isTr ? "tr-TR" : "en-US", {
    year: "numeric",
    month: "long",
  });
  const numberFmt = new Intl.NumberFormat(isTr ? "tr-TR" : "en-US");

  const stats: Array<{ label: string; value: string; icon: React.ReactNode; sublabel?: string }> = [
    {
      label: isTr ? "Aktif işletme" : "Active business",
      value: numberFmt.format(data.restaurantsActive),
      icon: <Store size={14} strokeWidth={2} />,
    },
    {
      label: isTr ? "Toplam yorum" : "Total reviews",
      value: numberFmt.format(data.totalReviews),
      icon: <MessageSquareText size={14} strokeWidth={2} />,
      sublabel: isTr ? `${numberFmt.format(data.reviews30d)} son 30 gün` : `${numberFmt.format(data.reviews30d)} last 30d`,
    },
    {
      label: isTr ? "30 gün yanıt" : "30d replies",
      value: numberFmt.format(data.replies30d),
      icon: <Reply size={14} strokeWidth={2} />,
      sublabel: isTr ? `${numberFmt.format(data.repliesAll)} toplam` : `${numberFmt.format(data.repliesAll)} total`,
    },
    {
      label: isTr ? "Üyelik" : "Member since",
      value: memberSince,
      icon: <Calendar size={14} strokeWidth={2} />,
    },
  ];

  return (
    <div className="bz-card overflow-hidden p-0">
      <div className="flex flex-col gap-4 border-b border-[#EDEDED] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-4 min-w-0">
          <Avatar size={52} name={initials(data.name, data.email)} />
          <div className="min-w-0">
            <Eyebrow>{isTr ? "HESAP SAHİBİ" : "ACCOUNT OWNER"}</Eyebrow>
            <h3 className="bz-h-tight mt-0.5 truncate text-[18px] text-[#0A0A0A]">
              {data.name || data.email}
            </h3>
            <p className="bz-mono mt-0.5 truncate text-[12px] text-[#737373]">{data.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <Badge kind={planTone}>
            <Crown size={11} strokeWidth={2.2} className="mr-1" />
            {planLabel}
          </Badge>
          {planKey === "trial" && trialDays !== null && (
            <Badge kind={trialDays <= 3 ? "danger" : trialDays <= 7 ? "warn" : "ghost"}>
              {isTr ? `${trialDays} gün kaldı` : `${trialDays} days left`}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`flex flex-col gap-1 p-4 sm:p-5 ${
              i < stats.length - 1 ? "border-b sm:border-b-0 sm:border-r" : ""
            } ${i % 2 === 1 ? "" : "border-r sm:border-r"} border-[#EDEDED]`}
          >
            <span className="pulse-eyebrow inline-flex items-center gap-1.5 text-[#737373]">
              <span className="text-[#A3A3A3]" aria-hidden="true">
                {s.icon}
              </span>
              {s.label}
            </span>
            <span className="bz-h-tight tabular-nums text-[20px] sm:text-[22px] text-[#0A0A0A]">
              {s.value}
            </span>
            {s.sublabel && (
              <span className="text-[11px] text-[#737373]">{s.sublabel}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default AccountOverviewCard;
