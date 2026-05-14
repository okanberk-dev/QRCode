"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Check,
  ArrowRight,
  Loader2,
  X,
  Building2,
  MapPin,
  QrCode,
  Printer,
  MessageSquareText,
  PartyPopper,
} from "lucide-react";
import type { ActivationResult, ActivationStep } from "@/lib/activation";

// Owner dashboard kurulum kontrol listesi (CLAUDE.md §19.5 + §23.7 Phase 11.29).
// 5 step: profile / google_link / qr_downloaded / qr_printed_shared / first_feedback.
// Mount'ta GET /api/restaurants/[id]/activation, manual aksiyonlar PATCH ile.

interface ActivationChecklistCardProps {
  restaurantId: string;
  locale: "tr" | "en";
}

const STEP_META: Record<
  ActivationStep,
  { icon: typeof Check; tr: string; en: string }
> = {
  profile: {
    icon: Building2,
    tr: "İşletme profilini tamamla",
    en: "Complete business profile",
  },
  google_link: {
    icon: MapPin,
    tr: "Google değerlendirme linkini ekle",
    en: "Add Google review link",
  },
  qr_downloaded: {
    icon: QrCode,
    tr: "İlk QR kodunu indir",
    en: "Download your first QR code",
  },
  qr_printed_shared: {
    icon: Printer,
    tr: "QR kartını yazdır veya paylaş",
    en: "Print or share your QR card",
  },
  first_feedback: {
    icon: MessageSquareText,
    tr: "İlk geri bildirimi topla",
    en: "Collect your first feedback",
  },
};

function ctaHref(step: ActivationStep, restaurantId: string, locale: string): string {
  switch (step) {
    case "profile":
      return `/${locale}/dashboard/restaurants/${restaurantId}/settings?section=general`;
    case "google_link":
      return `/${locale}/dashboard/platforms?restaurantId=${restaurantId}`;
    case "qr_downloaded":
      return `/${locale}/dashboard/qr`;
    case "qr_printed_shared":
      // Manuel mark — CTA yok, action button var
      return `/${locale}/dashboard/qr`;
    case "first_feedback":
      return `/${locale}/dashboard/feedbacks`;
  }
}

export default function ActivationChecklistCard({
  restaurantId,
  locale,
}: ActivationChecklistCardProps) {
  const isTr = locale === "tr";
  const [result, setResult] = useState<ActivationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/activation`);
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as ActivationResult;
      setResult(data);
    } catch {
      setError(
        isTr ? "Kurulum durumu yüklenemedi." : "Failed to load setup state.",
      );
    } finally {
      setLoading(false);
    }
  }, [restaurantId, isTr]);

  useEffect(() => {
    load();
  }, [load]);

  const performAction = async (action: string) => {
    if (busy) return;
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/activation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("action failed");
      const data = (await res.json()) as ActivationResult;
      setResult(data);
    } catch {
      setError(isTr ? "İşlem başarısız." : "Action failed.");
    } finally {
      setBusy(null);
    }
  };

  // Loading state — structural clone of the loaded card so the transition
  // is CLS=0. Container, header (eyebrow + h3 + subline), progress bar,
  // and step rows (incl. right-side action button placeholder) all match
  // the final markup at the same dimensions.
  if (loading && !result) {
    return (
      <div className="bz-card p-5 sm:p-6" aria-busy="true" aria-live="polite" role="status">
        <span className="sr-only">{isTr ? "Kurulum yükleniyor…" : "Loading setup…"}</span>
        {/* Header: eyebrow (pulse-eyebrow ~10px) + h3 (15-16px) + subline (12px) */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="bz-skeleton h-[10px] w-16 rounded-sm" />
            <div className="bz-skeleton h-[16px] w-48 rounded" />
            <div className="bz-skeleton h-[12px] w-32 rounded" />
          </div>
          {/* Dismiss button placeholder (only renders when ≥1 step done; reserve space) */}
          <div className="bz-skeleton h-7 w-7 rounded-full shrink-0" />
        </div>
        {/* Progress bar — h-2 mb-5 (matches final) */}
        <div className="bz-skeleton h-2 w-full rounded-full mb-5" />
        {/* Step list — 5 rows with h-7 icon + label + action pill (32x80) */}
        <ul className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5"
            >
              <div className="bz-skeleton h-7 w-7 rounded-full shrink-0" />
              <div className="bz-skeleton h-[13.5px] flex-1 rounded" style={{ maxWidth: `${60 + ((i * 7) % 24)}%` }} />
              <div className="bz-skeleton h-8 w-20 rounded-full shrink-0" />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (!result) {
    return error ? (
      <div className="bz-card p-5 text-[13px] text-[#991B1B]">{error}</div>
    ) : null;
  }

  // Owner dismiss etmiş ise gizle (UI logic; backend zaten korunmuyor — owner
  // istediği zaman undismiss yapabilir ama burada görünmez kalır).
  if (result.dismissedAt) return null;

  // 100% complete success state — sade kutlama, dismiss CTA
  if (result.isComplete) {
    return (
      <div
        className="rounded-2xl border border-[#A8D62E] bg-[#EAF9B8]/40 p-5 sm:p-6"
        role="status"
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-[#C6F24E] text-[#0A0A0A]">
            <PartyPopper size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="pulse-eyebrow text-[#525252] mb-1">
              {isTr ? "KURULUM TAMAMLANDI" : "SETUP COMPLETE"}
            </p>
            <h3 className="bz-h-tight text-[16px] sm:text-[18px] mb-1">
              {isTr
                ? "Kurulum tamamlandı. Artık geri bildirim toplamaya hazırsınız."
                : "Setup complete. You're ready to collect feedback."}
            </h3>
            <button
              type="button"
              onClick={() => performAction("dismiss")}
              disabled={busy !== null}
              className="mt-2 text-[12px] font-medium text-[#525252] underline hover:text-[#0A0A0A] disabled:opacity-50"
            >
              {isTr ? "Kapat" : "Dismiss"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active checklist — header progress bar + 5 step list
  const incompleteSteps = result.steps.filter((s) => !s.done);
  // Dismiss izni: en az 1 step tamamlandıysa veya tüm step'ler boşsa
  // (ChatGPT: "Allow dismissing only after meaningful progress or 100%")
  const canDismiss = result.completedCount >= 1;

  return (
    <div className="bz-card p-5 sm:p-6">
      {/* Header — progress + dismiss */}
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <p className="pulse-eyebrow text-[#737373] mb-1.5">
            {isTr ? "KURULUM" : "SETUP"}
          </p>
          <h3 className="bz-h-tight text-[15px] sm:text-[16px]">
            {isTr
              ? `Kurulum %${result.percentage} tamamlandı`
              : `Setup ${result.percentage}% complete`}
          </h3>
          <p className="text-[12px] text-[#737373] mt-0.5">
            {result.completedCount} / {result.totalCount}{" "}
            {isTr ? "adım tamamlandı" : "steps complete"}
          </p>
        </div>
        {canDismiss && (
          <button
            type="button"
            onClick={() => performAction("dismiss")}
            disabled={busy !== null}
            className="bz-btn-icon shrink-0"
            aria-label={isTr ? "Kurulum kartını kapat" : "Dismiss setup card"}
            title={isTr ? "Kapat" : "Dismiss"}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div
        className="h-2 rounded-full bg-[#F5F5F5] overflow-hidden mb-5"
        role="progressbar"
        aria-valuenow={result.percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-[#C6F24E] transition-[width] duration-500"
          style={{ width: `${result.percentage}%` }}
        />
      </div>

      {/* Step list */}
      <ul className="space-y-2">
        {result.steps.map((s) => {
          const meta = STEP_META[s.step];
          const Icon = s.done ? Check : meta.icon;
          const label = isTr ? meta.tr : meta.en;
          const href = ctaHref(s.step, restaurantId, locale);
          const isManualPrint = s.step === "qr_printed_shared";

          return (
            <li
              key={s.step}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-[#FAFAFA] transition-colors"
            >
              <div
                className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-full ${
                  s.done
                    ? "bg-[#C6F24E] text-[#0A0A0A]"
                    : "bg-[#F5F5F5] text-[#737373]"
                }`}
              >
                <Icon size={14} strokeWidth={s.done ? 2.5 : 2} />
              </div>
              <span
                className={`flex-1 text-[13.5px] ${
                  s.done ? "text-[#737373] line-through" : "text-[#0A0A0A]"
                }`}
              >
                {label}
              </span>
              {!s.done && isManualPrint && (
                <button
                  type="button"
                  onClick={() => performAction("mark_qr_printed")}
                  disabled={busy !== null}
                  className="bz-btn-ghost shrink-0 inline-flex items-center justify-center gap-1 rounded-full text-[12px] disabled:opacity-50"
                  style={{ minHeight: 32, padding: "0 12px" }}
                >
                  {busy === "mark_qr_printed" ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Check size={12} />
                  )}
                  {isTr ? "Bunu yaptım" : "I did this"}
                </button>
              )}
              {!s.done && !isManualPrint && (
                <Link
                  href={href}
                  className="bz-btn-ghost shrink-0 inline-flex items-center justify-center gap-1 rounded-full text-[12px]"
                  style={{ minHeight: 32, padding: "0 12px" }}
                >
                  {isTr ? "Aç" : "Go"}
                  <ArrowRight size={12} />
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      {error && (
        <p className="mt-3 text-[12px] text-[#991B1B]" role="alert">
          {error}
        </p>
      )}

      {/* Footer hint — incomplete count */}
      {incompleteSteps.length > 0 && (
        <p className="mt-4 text-[11.5px] text-[#737373]">
          {isTr
            ? `Kalan ${incompleteSteps.length} adımı tamamlayınca geri bildirim akışınız tam çalışır.`
            : `Complete the remaining ${incompleteSteps.length} step${incompleteSteps.length > 1 ? "s" : ""} to get the full feedback flow.`}
        </p>
      )}
    </div>
  );
}
