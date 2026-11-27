"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  Loader2,
  MessageCircle,
  PencilLine,
  Phone,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";
import { APSwitch, Field, Modal } from "@/components/ui";
import {
  WHATSAPP_BRAND_GREEN,
  WHATSAPP_MESSAGE_MAX_CHARS,
  appendWhatsAppText,
  buildWhatsAppMessage,
  normalizeWhatsAppUrl,
} from "@/lib/whatsapp";

interface WhatsAppReviewWizardProps {
  /** Restaurant id — drives the PUT call. */
  restaurantId: string;
  /** Current WhatsApp URL (may be empty); seeded into step 1. */
  initialWhatsappUrl: string;
  /** Current message template (null → system default fallback in helper). */
  initialMessage: string | null | undefined;
  /** Current toggle state. */
  initialEnabled: boolean;
  /** Used in the live preview as the customer-facing brand label. */
  restaurantName: string;
  locale?: "tr" | "en";
  onClose: () => void;
  /**
   * Called after a successful PUT — parent merges the partial back into
   * its own form/restaurant state. Wizard owns its local state until
   * commit so closing mid-flow doesn't dirty the parent form.
   */
  onSaved: (partial: {
    whatsappUrl: string | null;
    whatsappReviewMessage: string | null;
    whatsappReviewEnabled: boolean;
  }) => void;
}

type StepId = "verify" | "message" | "preview";

interface StepDef {
  id: StepId;
  num: string;
  icon: ReactNode;
  labelTr: string;
  labelEn: string;
}

const STEPS: StepDef[] = [
  {
    id: "verify",
    num: "01",
    icon: <Phone size={14} strokeWidth={2.2} />,
    labelTr: "Numara",
    labelEn: "Number",
  },
  {
    id: "message",
    num: "02",
    icon: <PencilLine size={14} strokeWidth={2.2} />,
    labelTr: "Mesaj",
    labelEn: "Message",
  },
  {
    id: "preview",
    num: "03",
    icon: <Eye size={14} strokeWidth={2.2} />,
    labelTr: "Önizle & yayınla",
    labelEn: "Preview & publish",
  },
];

const TEMPLATE_PRESETS_TR = [
  {
    id: "default",
    label: "Sistem varsayılanı",
    value: null,
  },
  {
    id: "short",
    label: "Kısa",
    value: "Merhaba {restaurant_name}, {reference_number} hakkında konuşmak ister misiniz?",
  },
  {
    id: "warm",
    label: "Sıcak ton",
    value:
      "Merhaba {restaurant_name} ekibi, {stars} verdiğim deneyimimle ilgili sizinle paylaşmak istediğim birkaç şey var (Ref: {reference_number}). Müsait olduğunuzda yazabilir misiniz?",
  },
];

const TEMPLATE_PRESETS_EN = [
  { id: "default", label: "System default", value: null },
  {
    id: "short",
    label: "Short",
    value: "Hi {restaurant_name}, can we talk about {reference_number}?",
  },
  {
    id: "warm",
    label: "Warm",
    value:
      "Hi {restaurant_name} team, I left {stars} and wanted to share a few thoughts about my visit (ref: {reference_number}). Could you reach out when you have a moment?",
  },
];

const VARIABLE_CHIPS = [
  { token: "{restaurant_name}", labelTr: "İşletme adı", labelEn: "Restaurant name" },
  { token: "{rating}", labelTr: "Puan (1–5)", labelEn: "Rating (1–5)" },
  { token: "{stars}", labelTr: "Yıldızlar", labelEn: "Stars" },
  { token: "{reference_number}", labelTr: "Referans no", labelEn: "Reference no" },
];

const SAMPLE_RATING = 2;
const SAMPLE_REF = "BZ-DEMO";

export function WhatsAppReviewWizard({
  restaurantId,
  initialWhatsappUrl,
  initialMessage,
  initialEnabled,
  restaurantName,
  locale = "tr",
  onClose,
  onSaved,
}: WhatsAppReviewWizardProps) {
  const isTr = locale === "tr";
  const presets = isTr ? TEMPLATE_PRESETS_TR : TEMPLATE_PRESETS_EN;

  // ─── Wizard state ──────────────────────────────────────────────────────
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = STEPS[stepIndex];

  const [whatsappInput, setWhatsappInput] = useState(initialWhatsappUrl ?? "");
  const [message, setMessage] = useState(initialMessage ?? "");
  const [enabled, setEnabled] = useState(initialEnabled);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messageRef = useRef<HTMLTextAreaElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    headerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [stepIndex]);

  // ─── Derived state ─────────────────────────────────────────────────────
  const normalized = useMemo(() => normalizeWhatsAppUrl(whatsappInput), [whatsappInput]);
  const canAdvanceFromVerify = normalized.ok;
  const canAdvanceFromMessage =
    message.length === 0 || message.length <= WHATSAPP_MESSAGE_MAX_CHARS;

  const previewMessage = useMemo(
    () =>
      buildWhatsAppMessage({
        template: message,
        restaurantName: restaurantName || (isTr ? "Demo Restoran" : "Demo Restaurant"),
        rating: SAMPLE_RATING,
        referenceNumber: SAMPLE_REF,
        locale,
      }),
    [message, restaurantName, locale, isTr],
  );

  const previewUrl = useMemo(() => {
    if (!normalized.ok) return "";
    return appendWhatsAppText(normalized.url, previewMessage);
  }, [normalized, previewMessage]);

  // ─── Step navigation ───────────────────────────────────────────────────
  const goNext = useCallback(() => {
    if (currentStep.id === "verify" && !canAdvanceFromVerify) return;
    if (currentStep.id === "message" && !canAdvanceFromMessage) return;
    if (stepIndex < STEPS.length - 1) setStepIndex(stepIndex + 1);
  }, [currentStep.id, canAdvanceFromVerify, canAdvanceFromMessage, stepIndex]);

  const goBack = useCallback(() => {
    setError(null);
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  }, [stepIndex]);

  const jumpTo = useCallback(
    (idx: number) => {
      if (idx < stepIndex) {
        setStepIndex(idx);
        setError(null);
        return;
      }
      if (idx > stepIndex) {
        if (idx >= 1 && !canAdvanceFromVerify) return;
        if (idx >= 2 && !canAdvanceFromMessage) return;
        setStepIndex(idx);
      }
    },
    [stepIndex, canAdvanceFromVerify, canAdvanceFromMessage],
  );

  // ─── Variable insertion (caret-aware) ─────────────────────────────────
  const insertVariable = useCallback(
    (token: string) => {
      const ta = messageRef.current;
      if (!ta) {
        setMessage((m) => `${m}${token}`);
        return;
      }
      const start = ta.selectionStart ?? message.length;
      const end = ta.selectionEnd ?? message.length;
      const before = message.slice(0, start);
      const after = message.slice(end);
      const next = `${before}${token}${after}`;
      if (next.length > WHATSAPP_MESSAGE_MAX_CHARS) return;
      setMessage(next);
      // Restore caret after React paints.
      requestAnimationFrame(() => {
        if (!messageRef.current) return;
        const pos = before.length + token.length;
        messageRef.current.focus();
        messageRef.current.setSelectionRange(pos, pos);
      });
    },
    [message],
  );

  const applyPreset = useCallback((value: string | null) => {
    setMessage(value ?? "");
  }, []);

  // ─── Submit ────────────────────────────────────────────────────────────
  const submit = useCallback(async () => {
    if (!normalized.ok) {
      setError(
        isTr
          ? "WhatsApp numarası geçerli değil. 1. adıma dön."
          : "Invalid WhatsApp number. Go back to step 1.",
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const trimmedMessage = message.trim();
      const res = await fetch(`/api/restaurants/${restaurantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappUrl: normalized.url,
          whatsappReviewMessage: trimmedMessage.length > 0 ? trimmedMessage : null,
          whatsappReviewEnabled: enabled,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 400 && data?.error === "INVALID_WHATSAPP_TOGGLE") {
          setError(
            isTr
              ? "WhatsApp linki olmadan bu özellik açılamaz."
              : "Cannot enable without a valid WhatsApp link.",
          );
        } else if (res.status === 401) {
          setError(isTr ? "Oturumunuz sona erdi." : "Session expired.");
        } else {
          setError(data?.error || (isTr ? "Kaydedilemedi." : "Save failed."));
        }
        return;
      }
      onSaved({
        whatsappUrl: normalized.url,
        whatsappReviewMessage: trimmedMessage.length > 0 ? trimmedMessage : null,
        whatsappReviewEnabled: enabled,
      });
      onClose();
    } catch {
      setError(isTr ? "Bağlantı hatası." : "Network error.");
    } finally {
      setSubmitting(false);
    }
  }, [normalized, message, enabled, restaurantId, onSaved, onClose, isTr]);

  // ─── Render ────────────────────────────────────────────────────────────
  const charCount = message.length;
  const charClass =
    charCount > WHATSAPP_MESSAGE_MAX_CHARS
      ? "text-[#DC2626]"
      : charCount > WHATSAPP_MESSAGE_MAX_CHARS * 0.9
        ? "text-[#D97706]"
        : "text-[#A3A3A3]";

  return (
    <Modal
      title={
        <span className="inline-flex items-center gap-1.5">
          <Wand2 size={14} strokeWidth={2.2} />
          {isTr ? "WhatsApp sihirbazı" : "WhatsApp wizard"}
        </span>
      }
      onClose={onClose}
      size={620}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={stepIndex === 0 ? onClose : goBack}
              className="bz-btn-ghost inline-flex items-center justify-center gap-1.5"
              disabled={submitting}
            >
              {stepIndex === 0 ? (
                isTr ? "İptal" : "Cancel"
              ) : (
                <>
                  <ArrowLeft size={13} strokeWidth={2.2} />
                  {isTr ? "Geri" : "Back"}
                </>
              )}
            </button>
            <span className="tabular-nums hidden text-[12px] text-[#737373] sm:inline">
              {stepIndex + 1} / {STEPS.length}
            </span>
          </div>
          {stepIndex < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={
                (currentStep.id === "verify" && !canAdvanceFromVerify) ||
                (currentStep.id === "message" && !canAdvanceFromMessage)
              }
              className="bz-btn-primary inline-flex items-center justify-center gap-1.5 w-full sm:w-auto"
            >
              {isTr ? "Devam et" : "Continue"}
              <ArrowRight size={13} strokeWidth={2.2} />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !canAdvanceFromVerify}
              className="bz-btn-primary inline-flex items-center justify-center gap-1.5 w-full sm:w-auto"
            >
              {submitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} strokeWidth={2.2} />
              )}
              {submitting
                ? isTr
                  ? "Kaydediliyor…"
                  : "Saving…"
                : isTr
                  ? "Kaydet"
                  : "Save"}
            </button>
          )}
        </div>
      }
    >
      <div ref={headerRef} className="flex flex-col gap-5">
        {/* Stepper */}
        <div className="bz-card-soft flex items-center gap-1 p-1.5 sm:p-2" role="tablist">
          {STEPS.map((s, idx) => {
            const active = idx === stepIndex;
            const done = idx < stepIndex;
            const reachable =
              idx <= stepIndex ||
              (idx === 1 && canAdvanceFromVerify) ||
              (idx === 2 && canAdvanceFromVerify && canAdvanceFromMessage);
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                onClick={() => jumpTo(idx)}
                disabled={!reachable}
                aria-selected={active}
                className="group flex flex-1 min-w-0 items-center justify-center gap-1.5 rounded-[14px] px-2 py-2 text-[12px] font-medium transition-colors disabled:cursor-not-allowed"
                style={{
                  background: active ? "#000000" : "transparent",
                  color: active ? "#FFFFFF" : done ? "#000000" : reachable ? "#525252" : "#A3A3A3",
                }}
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[12px] font-medium"
                  style={{
                    background: active ? "#78FC90" : done ? "#E6FDEA" : "#F6F6F6",
                    color: "#000000",
                    border: !active && !done ? "1px solid #EBEBEB" : "none",
                  }}
                >
                  {done ? <Check size={11} strokeWidth={2.6} /> : s.icon}
                </span>
                <span className="truncate">{isTr ? s.labelTr : s.labelEn}</span>
              </button>
            );
          })}
        </div>

        {/* ───── STEP 1 — VERIFY ───────────────────────────────────────── */}
        {currentStep.id === "verify" && (
          <div className="flex flex-col gap-4">
            <Field
              label={isTr ? "WhatsApp numarası veya linki" : "WhatsApp number or link"}
              hint={
                isTr
                  ? "Telefon (+90 555 111 22 33), wa.me linki, veya whatsapp.com/{num}"
                  : "Phone (+1 415 555 2671), wa.me link, or whatsapp.com/{num}"
              }
            >
              <input
                className="bz-input"
                value={whatsappInput}
                onChange={(e) => setWhatsappInput(e.target.value)}
                placeholder="+90 555 111 22 33"
                inputMode="tel"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={120}
              />
            </Field>

            {whatsappInput.trim().length > 0 && (
              <div
                className="rounded-[20px] border p-3 text-[13px]"
                style={{
                  borderColor: normalized.ok ? "#D1FAE5" : "#FECACA",
                  background: normalized.ok ? "#F0FDF4" : "#FEF2F2",
                  color: normalized.ok ? "#000000" : "#991B1B",
                }}
              >
                {normalized.ok ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Check size={13} strokeWidth={2.4} className="text-[#16A34A]" />
                    {isTr ? "Geçerli" : "Valid"}:{" "}
                    <span className="tabular-nums font-medium">{normalized.url}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <AlertTriangle size={13} strokeWidth={2.2} className="text-[#DC2626]" />
                    {normalized.reason === "EMPTY"
                      ? isTr
                        ? "Numara boş."
                        : "Empty number."
                      : normalized.reason === "TOO_SHORT"
                        ? isTr
                          ? "Numara çok kısa (en az 8 hane)."
                          : "Number too short (min 8 digits)."
                        : isTr
                          ? "Geçersiz numara. Ülke kodu ile yazın (ör. +90)."
                          : "Invalid number. Include country code (e.g. +90)."}
                  </span>
                )}
              </div>
            )}

            <p className="text-[12px] leading-[1.55] text-[#737373]">
              {isTr
                ? "Bu numara müşterinin değerlendirme sayfasında WhatsApp butonuna tıklayınca açılır. Otomatik mesaj gönderilmez — müşteri kendi mesajını da düzenleyebilir."
                : "This number opens when the customer taps the WhatsApp button on the review surface. No auto-send — the customer can edit the prefilled message before sending."}
            </p>
          </div>
        )}

        {/* ───── STEP 2 — MESSAGE ──────────────────────────────────────── */}
        {currentStep.id === "message" && (
          <div className="flex flex-col gap-4">
            <Field
              label={isTr ? "Hazır şablon" : "Preset"}
              hint={isTr ? "İstediğin şablonu seç veya kendin yaz." : "Pick a preset or write your own."}
            >
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => {
                  const isActive =
                    (p.value === null && message.trim().length === 0) ||
                    (p.value !== null && message === p.value);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p.value)}
                      aria-pressed={isActive}
                      className="rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors"
                      style={{
                        borderColor: isActive ? "#000000" : "#EBEBEB",
                        background: isActive ? "#F6F6F6" : "#FFFFFF",
                        color: "#000000",
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field
              label={isTr ? "Mesaj şablonu" : "Message template"}
              hint={
                isTr
                  ? "Müşteri WhatsApp butonuna basınca bu mesaj otomatik dolu gelir."
                  : "Pre-fills when the customer taps the WhatsApp button."
              }
            >
              <textarea
                ref={messageRef}
                className="bz-input"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, WHATSAPP_MESSAGE_MAX_CHARS))}
                rows={5}
                placeholder={
                  isTr
                    ? "Sistem varsayılanı boş bırakırsan kullanılır."
                    : "System default applies when left empty."
                }
                style={{ minHeight: 110, fontSize: 16 }}
                maxLength={WHATSAPP_MESSAGE_MAX_CHARS}
              />
            </Field>

            <div className="flex items-center justify-between gap-2 -mt-2">
              <span className="text-[13px] font-medium text-[#737373]">
                {isTr ? "DEĞİŞKEN EKLE" : "INSERT VARIABLE"}
              </span>
              <span aria-live="polite" className={`tabular-nums text-[12px] tabular-nums ${charClass}`}>
                {charCount} / {WHATSAPP_MESSAGE_MAX_CHARS}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLE_CHIPS.map((v) => (
                <button
                  key={v.token}
                  type="button"
                  onClick={() => insertVariable(v.token)}
                  className="inline-flex items-center gap-1 rounded-full border border-pn-line bg-white px-2.5 py-1 text-[12px] font-medium text-pn-ink transition-colors hover:border-pn-ink hover:bg-pn-canvas"
                  title={isTr ? v.labelTr : v.labelEn}
                >
                  <span className="bz-mono">{v.token}</span>
                </button>
              ))}
            </div>

            {/* Live preview */}
            <div className="rounded-[20px] border border-pn-line bg-pn-canvas p-3.5">
              <div className="flex items-center gap-1.5">
                <Sparkles size={11} strokeWidth={2.2} className="text-pn-accent-ink" />
                <span className="text-[13px] font-medium text-[#737373]">
                  {isTr ? "ÖRNEK MESAJ" : "SAMPLE MESSAGE"}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[13px] leading-[1.55] text-pn-ink">
                {previewMessage}
              </p>
            </div>
          </div>
        )}

        {/* ───── STEP 3 — PREVIEW + ENABLE ─────────────────────────────── */}
        {currentStep.id === "preview" && (
          <div className="flex flex-col gap-4">
            {/* Customer-side mock card (matches /r/[slug] thanks step language) */}
            <div className="rounded-[24px] bg-pn-ink p-5 sm:p-6">
              <span className="tabular-nums text-[12px] font-medium text-[#A3A3A3]">
                {isTr ? "MÜŞTERİYE GÖRÜNECEK" : "CUSTOMER PREVIEW"}
              </span>
              <p className="mt-2 text-[13px] text-white/80">
                {isTr
                  ? "1–3 yıldız veren müşteri değerlendirme sayfası sonunda şu butonu görür:"
                  : "Customers giving 1–3★ see this button at the end of the review page:"}
              </p>
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="inline-flex w-full max-w-[280px] items-center justify-center gap-2 rounded-[14px] bg-pn-ink px-4 py-3 text-[13px] font-medium text-white border border-white/10"
                >
                  <MessageCircle
                    size={14}
                    strokeWidth={2.2}
                    style={{ color: WHATSAPP_BRAND_GREEN }}
                  />
                  {isTr ? "WhatsApp ile iletişime geç" : "Message us on WhatsApp"}
                </button>
              </div>
              {previewUrl && (
                <p className="mt-3 text-center tabular-nums text-[12px] text-white/40 truncate">
                  {previewUrl}
                </p>
              )}
            </div>

            {/* Enable toggle */}
            <div
              className="flex items-start gap-3 rounded-[24px] border border-pn-line bg-white p-4"
            >
              {/* Canonical panel switch (§23.3) — the hand-rolled one was graphite
                  when on and had no accessible name. */}
              <APSwitch
                checked={enabled}
                onChange={setEnabled}
                ariaLabel={isTr ? "WhatsApp geri bildirim butonunu aç" : "Enable the WhatsApp feedback button"}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-pn-ink">
                  {isTr ? "Bu özelliği aç" : "Enable this feature"}
                </p>
                <p className="mt-0.5 text-[12px] leading-[1.5] text-[#525252]">
                  {isTr
                    ? "Açıkken 1–3 yıldız müşteriler değerlendirme sayfası sonunda WhatsApp butonu görür."
                    : "When on, customers giving 1–3★ see the WhatsApp button on the review thanks step."}
                </p>
                <p className="mt-1.5 text-[12px] leading-[1.5] text-[#737373]">
                  {isTr
                    ? "KVKK: Müşteri butona tıklamadan WhatsApp açılmaz; otomatik yönlendirme yoktur."
                    : "KVKK / GDPR: WhatsApp opens only on customer tap; no auto-redirect."}
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#991B1B]">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default WhatsAppReviewWizard;
