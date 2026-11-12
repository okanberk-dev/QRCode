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
  /**
   * Server-side computed activation result. When supplied, the component
   * skips its initial fetch + loading skeleton — eliminates the "double
   * skeleton" flash where Next.js segment loading.tsx finishes and then
   * this client component's own `loading=true` state shows another
   * skeleton (CLAUDE.md §40.10).
   */
  initialResult?: ActivationResult;
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

// Every link carries this card's business (?restaurantId) so a step never
// opens another business than the one the checklist is about.
function ctaHref(step: ActivationStep, restaurantId: string, locale: string): string {
  const scope = `restaurantId=${encodeURIComponent(restaurantId)}`;
  switch (step) {
    case "profile":
      return `/${locale}/dashboard/restaurants/${restaurantId}/settings?section=general`;
    case "google_link":
      // Straight to the Google link page for this business (not the overview).
      return `/${locale}/dashboard/platforms/google?${scope}`;
    case "qr_downloaded":
      return `/${locale}/dashboard/qr?${scope}`;
    case "qr_printed_shared":
      // Manuel mark — CTA yok, action button var
      return `/${locale}/dashboard/qr?${scope}`;
    case "first_feedback":
      return `/${locale}/dashboard/feedbacks?${scope}`;
  }
}

export default function ActivationChecklistCard({
  restaurantId,
  locale,
  initialResult,
}: ActivationChecklistCardProps) {
  const isTr = locale === "tr";
  // Server hydration: parent server-component pre-computed activation; skip
  // own loading skeleton (CLAUDE.md §40.10 anti-double-skeleton pattern).
  const [result, setResult] = useState<ActivationResult | null>(
    initialResult ?? null,
  );
  const [loading, setLoading] = useState(initialResult === undefined);
  const [busy, setBusy] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
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
    // Only fetch when server didn't pre-hydrate. Patch actions still call
    // load() to refresh after mutations.
    if (initialResult === undefined) {
      load();
    }
  }, [load, initialResult]);

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

  // Loading state — structural clone of the loaded card (title + subline,
  // progress bar, step rows) so the swap is CLS=0. Rarely shown: the
  // dashboard passes a server-computed `initialResult`.
  if (loading && !result) {
    return (
      <div className="bz-card p-5 sm:p-6" aria-busy="true" aria-live="polite" role="status">
        <span className="sr-only">{isTr ? "Kurulum yükleniyor…" : "Loading setup…"}</span>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
          <div className="lg:w-[260px] lg:shrink-0">
            <div className="space-y-1.5">
              <div className="bz-skeleton h-[16px] w-48 max-w-full rounded" />
              <div className="bz-skeleton h-[12px] w-32 rounded" />
            </div>
            <div className="bz-skeleton mt-3 h-2 w-full rounded-full" />
          </div>
          <ul className="min-w-0 flex-1 space-y-1">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                <div className="bz-skeleton h-7 w-7 rounded-full shrink-0" />
                <div className="bz-skeleton h-[13.5px] flex-1 rounded" style={{ maxWidth: `${60 + ((i * 7) % 24)}%` }} />
                <div className="bz-skeleton h-8 w-20 rounded-full shrink-0" />
              </li>
            ))}
          </ul>
        </div>
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
        className="bz-card border-[#A8D62E] bg-[#F6FCE6] p-5 sm:p-6"
        role="status"
      >
        <div className="flex items-start gap-3">
          <div aria-hidden="true" className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-[#C6F24E] text-[#0A0A0A]">
            <PartyPopper size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="bz-h-tight text-[16px] sm:text-[18px] mb-1">
              {isTr
                ? "Kurulum tamamlandı. Artık geri bildirim toplamaya hazırsınız."
                : "Setup complete. You're ready to collect feedback."}
            </h2>
            <button
              type="button"
              onClick={() => performAction("dismiss")}
              disabled={busy !== null}
              className="mt-1 inline-flex min-h-[44px] items-center text-[12px] font-medium text-[#525252] underline hover:text-[#0A0A0A] disabled:opacity-50 sm:min-h-[32px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] rounded"
            >
              {isTr ? "Kapat" : "Dismiss"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active checklist — progress on the left (lg), the steps still to do on
  // the right; finished steps stay one click away behind a toggle.
  const incompleteSteps = result.steps.filter((s) => !s.done);
  const doneCount = result.steps.length - incompleteSteps.length;
  const visibleSteps = showDone ? result.steps : incompleteSteps;
  // Dismiss only after meaningful progress (≥1 step done).
  const canDismiss = result.completedCount >= 1;
  const stepButtonClass =
    "bz-btn-ghost shrink-0 inline-flex items-center justify-center gap-1 rounded-full text-[12px] min-h-[44px] px-3 sm:min-h-[32px] disabled:opacity-50";

  return (
    <div className="bz-card relative p-5 sm:p-6">
      {/* Dismiss sits in the card's top-right corner in both layouts; the
          title (and on lg the step list) keep clear of it. */}
      {canDismiss && (
        <button
          type="button"
          onClick={() => performAction("dismiss")}
          disabled={busy !== null}
          className="bz-btn-icon absolute right-1.5 top-1.5 h-11 w-11 sm:right-2 sm:top-2 sm:h-8 sm:w-8"
          aria-label={isTr ? "Kurulum kartını kapat" : "Dismiss setup card"}
          title={isTr ? "Kapat" : "Dismiss"}
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
        <div className="lg:w-[260px] lg:shrink-0">
          <div className={`min-w-0 ${canDismiss ? "pr-9 lg:pr-0" : ""}`}>
            <h2 className="bz-h-tight text-[15px] sm:text-[16px]">
              {isTr
                ? `Kurulum %${result.percentage} tamamlandı`
                : `Setup ${result.percentage}% complete`}
            </h2>
            <p className="text-[12px] text-[#737373] mt-0.5">
              {isTr
                ? `${result.completedCount} / ${result.totalCount} adım · ${incompleteSteps.length} adım kaldı`
                : `${result.completedCount} / ${result.totalCount} steps · ${incompleteSteps.length} left`}
            </p>
          </div>

          <div
            className="mt-3 h-2 rounded-full bg-[#F5F5F5] overflow-hidden"
            role="progressbar"
            aria-label={isTr ? "Kurulum ilerlemesi" : "Setup progress"}
            aria-valuenow={result.percentage}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-[#C6F24E] transition-[width] duration-500"
              style={{ width: `${result.percentage}%` }}
            />
          </div>

          {doneCount > 0 && (
            <button
              type="button"
              onClick={() => setShowDone((v) => !v)}
              aria-expanded={showDone}
              className="mt-2 inline-flex min-h-[44px] items-center text-[12px] font-medium text-[#525252] hover:text-[#0A0A0A] sm:min-h-[32px] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]"
            >
              {showDone
                ? isTr
                  ? "Tamamlananları gizle"
                  : "Hide completed"
                : isTr
                  ? `Tamamlanan ${doneCount} adımı göster`
                  : `Show ${doneCount} completed`}
            </button>
          )}
        </div>

        <ul className={`min-w-0 flex-1 space-y-1 ${canDismiss ? "lg:pr-8" : ""}`}>
          {visibleSteps.map((s) => {
            const meta = STEP_META[s.step];
            const Icon = s.done ? Check : meta.icon;
            const label = isTr ? meta.tr : meta.en;
            const href = ctaHref(s.step, restaurantId, locale);
            const isManualPrint = s.step === "qr_printed_shared";

            return (
              <li
                key={s.step}
                className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-[#FAFAFA] transition-colors"
              >
                <div
                  aria-hidden="true"
                  className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-full ${
                    s.done
                      ? "bg-[#C6F24E] text-[#0A0A0A]"
                      : "bg-[#F5F5F5] text-[#737373]"
                  }`}
                >
                  <Icon size={14} strokeWidth={s.done ? 2.5 : 2} />
                </div>
                <span
                  className={`flex-1 min-w-0 text-[13.5px] ${
                    s.done ? "text-[#737373] line-through" : "text-[#0A0A0A]"
                  }`}
                >
                  {s.done && <span className="sr-only">{isTr ? "Tamamlandı: " : "Done: "}</span>}
                  {label}
                </span>
                {!s.done && isManualPrint && (
                  <button
                    type="button"
                    onClick={() => performAction("mark_qr_printed")}
                    disabled={busy !== null}
                    className={stepButtonClass}
                  >
                    {busy === "mark_qr_printed" ? (
                      <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Check size={12} aria-hidden="true" />
                    )}
                    {isTr ? "Bunu yaptım" : "I did this"}
                  </button>
                )}
                {!s.done && !isManualPrint && (
                  <Link href={href} className={stepButtonClass}>
                    {isTr ? "Aç" : "Go"}
                    <ArrowRight size={12} aria-hidden="true" />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {error && (
        <p className="mt-3 text-[12px] text-[#991B1B]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
