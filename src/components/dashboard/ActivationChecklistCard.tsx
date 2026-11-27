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
            <div className="space-y-2">
              <div className="bz-skeleton h-[20px] w-48 max-w-full rounded" />
              <div className="bz-skeleton h-[13px] w-32 rounded" />
            </div>
            <div className="bz-skeleton mt-4 h-2.5 w-full rounded-full" />
          </div>
          <ul className="flex min-w-0 flex-1 flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex min-h-[60px] items-center gap-3 rounded-[16px] bg-pn-canvas px-3 py-2.5">
                <div className="bz-skeleton h-10 w-10 shrink-0 rounded-full" />
                <div className="bz-skeleton h-[14px] flex-1 rounded" style={{ maxWidth: `${60 + ((i * 7) % 24)}%` }} />
                <div className="bz-skeleton h-9 w-16 shrink-0 rounded-full" />
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

  // 100% complete — white card, black icon circle, dismiss link.
  if (result.isComplete) {
    return (
      <div className="bz-card p-5 sm:p-6" role="status">
        <div className="flex items-start gap-3.5">
          <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pn-accent text-white">
            <PartyPopper size={19} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-medium leading-snug text-pn-ink sm:text-[18px]">
              {isTr
                ? "Kurulum tamamlandı. Artık geri bildirim toplamaya hazırsınız."
                : "Setup complete. You're ready to collect feedback."}
            </h2>
            <button
              type="button"
              onClick={() => performAction("dismiss")}
              disabled={busy !== null}
              className="mt-1 inline-flex min-h-[44px] items-center rounded-full text-[13px] font-medium text-[#737373] underline underline-offset-4 hover:text-pn-ink disabled:opacity-50 sm:min-h-[32px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent"
            >
              {isTr ? "Kapat" : "Dismiss"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active checklist — progress on the left (lg), the steps still to do on
  // the right as grey rows; finished steps stay one click away behind a toggle.
  const incompleteSteps = result.steps.filter((s) => !s.done);
  const doneCount = result.steps.length - incompleteSteps.length;
  const visibleSteps = showDone ? result.steps : incompleteSteps;
  // Dismiss only after meaningful progress (≥1 step done).
  const canDismiss = result.completedCount >= 1;
  const stepButtonClass =
    "inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1 rounded-full bg-pn-accent-soft px-3.5 text-[13px] font-medium text-pn-accent transition-colors duration-200 hover:bg-pn-accent hover:text-white disabled:opacity-50 sm:min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2";

  return (
    <div className="bz-card relative p-5 sm:p-6">
      {/* Dismiss sits in the card's top-right corner in both layouts; the
          title (and on lg the step list) keep clear of it. */}
      {canDismiss && (
        <button
          type="button"
          onClick={() => performAction("dismiss")}
          disabled={busy !== null}
          className="bz-btn-icon absolute right-2 top-2 h-11 w-11 sm:right-3 sm:top-3 sm:h-9 sm:w-9"
          aria-label={isTr ? "Kurulum kartını kapat" : "Dismiss setup card"}
          title={isTr ? "Kapat" : "Dismiss"}
        >
          <X size={15} aria-hidden="true" />
        </button>
      )}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
        <div className="lg:w-[260px] lg:shrink-0">
          <div className={`min-w-0 ${canDismiss ? "pr-10 lg:pr-0" : ""}`}>
            <h2 className="pn-card-title text-pn-ink">
              {isTr
                ? `Kurulum %${result.percentage} tamamlandı`
                : `Setup ${result.percentage}% complete`}
            </h2>
            <p className="mt-1 text-[13px] text-[#9A9A9A]">
              {isTr
                ? `${result.completedCount} / ${result.totalCount} adım · ${incompleteSteps.length} adım kaldı`
                : `${result.completedCount} / ${result.totalCount} steps · ${incompleteSteps.length} left`}
            </p>
          </div>

          <div
            className="pn-hatch mt-4 h-2.5 overflow-hidden rounded-full"
            role="progressbar"
            aria-label={isTr ? "Kurulum ilerlemesi" : "Setup progress"}
            aria-valuenow={result.percentage}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-pn-accent transition-[width] duration-500"
              style={{ width: `${result.percentage}%` }}
            />
          </div>

          {doneCount > 0 && (
            <button
              type="button"
              onClick={() => setShowDone((v) => !v)}
              aria-expanded={showDone}
              className="mt-2 inline-flex min-h-[44px] items-center rounded-full text-[13px] font-medium text-[#737373] hover:text-pn-ink sm:min-h-[32px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent"
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

        <ul className={`flex min-w-0 flex-1 flex-col gap-2 ${canDismiss ? "lg:pr-10" : ""}`}>
          {visibleSteps.map((s) => {
            const meta = STEP_META[s.step];
            const Icon = s.done ? Check : meta.icon;
            const label = isTr ? meta.tr : meta.en;
            const href = ctaHref(s.step, restaurantId, locale);
            const isManualPrint = s.step === "qr_printed_shared";

            return (
              <li key={s.step} className="pn-row min-h-[60px] py-2.5">
                <div
                  aria-hidden="true"
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    s.done ? "bg-pn-accent text-white" : "bg-pn-accent-soft text-pn-accent"
                  }`}
                >
                  <Icon size={17} strokeWidth={s.done ? 2.4 : undefined} />
                </div>
                <span
                  className={`min-w-0 flex-1 text-[14px] ${
                    s.done ? "text-[#9A9A9A] line-through" : "font-medium text-pn-ink"
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
                      <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Check size={13} aria-hidden="true" />
                    )}
                    {isTr ? "Bunu yaptım" : "I did this"}
                  </button>
                )}
                {!s.done && !isManualPrint && (
                  <Link href={href} className={stepButtonClass}>
                    {isTr ? "Aç" : "Go"}
                    <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {error && (
        <p className="mt-3 text-[13px] text-[#B42318]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
