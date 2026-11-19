'use client';

import { useLayoutEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowDownToLine, Loader2, Mail, RotateCw, Send, Sparkles } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { ReplyRiskNotice, useReplyRisk } from '@/components/reply/ReplyRiskNotice';
import { ReplyTemplatesMenu } from '@/components/reply/ReplyTemplatesMenu';
import type { AiSource, AiTone, FeedbackRow, ReplyTone } from './types';

/** API limit for a reply body (`/api/feedback/[id]/reply` → 413 body_too_long). */
export const REPLY_MAX_LENGTH = 2000;

export const REPLY_TEXTAREA_ID = 'reply-textarea-input';

/** Focus the reply textarea and put the caret at the end. */
export function focusReplyTextarea() {
  if (typeof window === 'undefined') return;
  window.requestAnimationFrame(() => {
    const textarea = document.getElementById(REPLY_TEXTAREA_ID) as HTMLTextAreaElement | null;
    if (!textarea) return;
    textarea.focus();
    textarea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const len = textarea.value.length;
    textarea.setSelectionRange(len, len);
  });
}

/* ============================================================================
 * Pulse AI suggestion card — lives in the scrollable detail body, right above
 * the docked reply composer.
 * ========================================================================== */

interface PulseAiSuggestionCardProps {
  feedback: FeedbackRow;
  locale: Locale;
  aiLoading: boolean;
  aiRegenerating: boolean;
  aiSuggestion: string;
  aiSource: AiSource;
  aiFromBackground: boolean;
  aiTone: AiTone;
  setAiTone: (v: AiTone) => void;
  /** Yönetici Pulse AI'yı bu işletme için kapattı — AI aksiyonları gizlenir. */
  aiDisabledByAdmin?: boolean;
  /** Pass the tone when it was just changed — the page's state is not updated yet. */
  onRegenerateAi: (tone?: AiTone) => void;
  onUseAiAndSend: () => void;
  onCopyAiToDraft: () => void;
  /** §45 — the one-click send needs the same per-message consent as Send. */
  confirmResponsibility: boolean;
  sendingReply: boolean;
}

export function PulseAiSuggestionCard({
  feedback: active,
  locale,
  aiLoading,
  aiRegenerating,
  aiSuggestion,
  aiSource,
  aiFromBackground,
  aiTone,
  setAiTone,
  aiDisabledByAdmin = false,
  onRegenerateAi,
  onUseAiAndSend,
  onCopyAiToDraft,
  confirmResponsibility,
  sendingReply,
}: PulseAiSuggestionCardProps) {
  const isTr = locale === 'tr';
  const autoDraftEnabled = active.aiAutoDraftEnabled === true;
  const hasSuggestion = !aiLoading && Boolean(aiSuggestion);
  const isTemplate = aiSource === 'template' || aiSource === 'template-fallback';
  // §48 — an AI draft goes through the same gate as a typed reply.
  const suggestionRisk = useReplyRisk(hasSuggestion ? aiSuggestion : '');

  const toneSelect = (
    <select
      value={aiTone}
      onChange={(e) => {
        const next = e.target.value as AiTone;
        setAiTone(next);
        // Tone change auto-regenerates an existing draft (no extra click).
        if (aiSuggestion && !aiRegenerating && !aiLoading) {
          onRegenerateAi(next);
        }
      }}
      disabled={aiLoading || aiRegenerating}
      aria-label={isTr ? 'Pulse AI yanıt tonu' : 'Pulse AI reply tone'}
      title={
        isTr ? 'Tonu değiştirince taslak otomatik yenilenir' : 'Changing tone auto-regenerates the draft'
      }
      /* Documented dark native-select exception (§38.202). 16px + 44px on
         mobile (iOS zoom, touch target), compact from sm. */
      className="min-h-[44px] w-full rounded-full border border-white/20 bg-transparent px-3 py-2 text-[16px] font-medium text-white outline-none bz-motion-spring hover:bg-white/10 focus-visible:border-[#C6F24E] focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] disabled:opacity-50 sm:min-h-0 sm:w-auto sm:py-1.5 sm:text-[12px]"
      style={{ colorScheme: 'dark' }}
    >
      <option value="warm" className="text-[#0A0A0A]">
        {isTr ? 'Ton: Samimi' : 'Tone: Warm'}
      </option>
      <option value="formal" className="text-[#0A0A0A]">
        {isTr ? 'Ton: Resmi' : 'Tone: Formal'}
      </option>
      <option value="apologetic" className="text-[#0A0A0A]">
        {isTr ? 'Ton: Özür' : 'Tone: Apologetic'}
      </option>
    </select>
  );

  return (
    <div className="mt-5 rounded-2xl bg-[#0A0A0A] p-4 text-white sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          aria-hidden="true"
          className="flex h-6 w-6 items-center justify-center rounded-md bg-[#C6F24E] text-[#0A0A0A]"
        >
          <Sparkles size={13} strokeWidth={2.2} />
        </span>
        <span className="text-[13px] font-semibold text-[#C6F24E]">
          {isTr ? 'Pulse AI önerisi' : 'Pulse AI suggestion'}
        </span>
        {aiLoading ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/70">
            <Loader2 size={11} className="animate-spin" aria-hidden="true" />
            {isTr ? 'Hazırlanıyor' : 'Working'}
          </span>
        ) : (
          <>
            {aiSource === 'openai' && (
              <span className="rounded-full bg-[#C6F24E] px-2 py-0.5 text-[11px] font-medium text-[#0A0A0A]">
                AI
              </span>
            )}
            {isTemplate && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/70">
                {isTr ? 'Şablon' : 'Template'}
              </span>
            )}
            {aiFromBackground && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/70">
                {isTr ? 'Hazır' : 'Ready'}
              </span>
            )}
          </>
        )}
      </div>

      {aiDisabledByAdmin ? (
        // 403 eskiden yutuluyordu ve "Yeniden öner" boşuna sunuluyordu.
        <p className="mt-3 text-[13px] leading-[1.6] text-white/60">
          {isTr
            ? 'Pulse AI bu işletme için yönetici tarafından kapatıldı.'
            : 'Pulse AI has been turned off for this business by an administrator.'}
        </p>
      ) : aiLoading ? (
        <div className="mt-3 space-y-2" aria-hidden="true">
          <div className="h-3 w-full animate-pulse rounded bg-white/10" />
          <div className="h-3 w-[88%] animate-pulse rounded bg-white/10" />
          <div className="h-3 w-[60%] animate-pulse rounded bg-white/10" />
        </div>
      ) : (
        <p className="mt-3 whitespace-pre-line break-words text-[14px] leading-[1.65] text-white/85">
          {aiSuggestion
            ? aiSuggestion
            : autoDraftEnabled
              ? isTr
                ? 'Pulse AI henüz bir taslak üretmedi. "Taslak oluştur" ile hemen bir öneri alabilirsin.'
                : 'Pulse AI has not produced a draft yet. Use "Generate draft" to get one now.'
              : isTr
                ? 'Otomatik taslak kapalı. İstersen "Taslak oluştur" ile manuel taslak oluşturabilirsin.'
                : 'Auto-drafts are off. You can still create one manually with "Generate draft".'}
        </p>
      )}

      {!aiDisabledByAdmin && !aiLoading && isTemplate && aiSuggestion && (
        <p className="mt-3 inline-flex items-start gap-2 text-[12px] leading-[1.5] text-white/60">
          <span aria-hidden="true" className="mt-0.5">
            ⚠
          </span>
          <span>
            {isTr
              ? 'AI servisi şu an pasif; bu bir hazır şablon taslaktır. "Yeniden öner" ile tekrar deneyebilirsiniz.'
              : 'AI service is currently unavailable; this is a generic template. Click "Regenerate" to retry.'}
          </span>
        </p>
      )}

      {!aiDisabledByAdmin && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {hasSuggestion ? (
            <>
              <button
                type="button"
                onClick={() => {
                  onCopyAiToDraft();
                  focusReplyTextarea();
                }}
                className="bz-btn-lime w-full sm:w-auto"
              >
                <ArrowDownToLine size={13} strokeWidth={2.2} aria-hidden="true" />
                {isTr ? 'Yanıta aktar' : 'Copy to reply'}
              </button>
              <button
                type="button"
                onClick={onUseAiAndSend}
                disabled={sendingReply || !confirmResponsibility || suggestionRisk.blocked}
                className="bz-btn-on-dark bz-btn-sm w-full sm:w-auto"
                title={
                  !confirmResponsibility
                    ? isTr
                      ? 'Göndermeden önce sorumluluk onayını işaretleyin'
                      : 'Confirm the responsibility checkbox before sending'
                    : isTr
                      ? 'AI taslağını doğrudan gönder'
                      : 'Send the AI draft directly'
                }
              >
                {sendingReply ? (
                  <Loader2 size={12} strokeWidth={2} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Send size={12} strokeWidth={2} aria-hidden="true" />
                )}
                {isTr ? 'Olduğu gibi gönder' : 'Send as is'}
              </button>
              <button
                type="button"
                onClick={() => onRegenerateAi()}
                disabled={aiRegenerating}
                className="bz-btn-on-dark bz-btn-sm w-full sm:w-auto"
              >
                <RotateCw
                  size={12}
                  strokeWidth={2}
                  className={aiRegenerating ? 'animate-spin' : ''}
                  aria-hidden="true"
                />
                {isTr ? 'Yeniden öner' : 'Regenerate'}
              </button>
              {toneSelect}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onRegenerateAi()}
                disabled={aiLoading || aiRegenerating}
                className="bz-btn-lime w-full sm:w-auto"
              >
                {aiRegenerating ? (
                  <Loader2 size={13} strokeWidth={2.2} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles size={13} strokeWidth={2.2} aria-hidden="true" />
                )}
                {isTr ? 'Taslak oluştur' : 'Generate draft'}
              </button>
              {toneSelect}
            </>
          )}
        </div>
      )}
      {!aiDisabledByAdmin && hasSuggestion && suggestionRisk.blocked && (
        <ReplyRiskNotice risk={suggestionRisk} locale={isTr ? 'tr' : 'en'} tone="dark" className="mt-3" />
      )}
      {!aiDisabledByAdmin && hasSuggestion && !confirmResponsibility && (
        <p className="mt-2.5 text-[12px] leading-[1.5] text-white/55">
          {isTr
            ? '"Olduğu gibi gönder" için aşağıdaki sorumluluk onayını işaretleyin.'
            : 'To use "Send as is", tick the responsibility confirmation below.'}
        </p>
      )}
    </div>
  );
}

/* ============================================================================
 * Reply composer card — docked at the bottom of the detail pane on lg (outside
 * the scroll area, so it can never cover content), inline on mobile.
 * ========================================================================== */

interface ReplyComposerCardProps {
  feedback: FeedbackRow;
  locale: Locale;
  replyDraft: string;
  setReplyDraft: (v: string) => void;
  sendEmail: boolean;
  setSendEmail: (v: boolean) => void;
  confirmResponsibility: boolean;
  setConfirmResponsibility: (v: boolean) => void;
  sendingReply: boolean;
  onSendReply: () => void;
  replyNotice: { msg: string; tone: ReplyTone } | null;
}

export function ReplyComposerCard({
  feedback: active,
  locale,
  replyDraft,
  setReplyDraft,
  sendEmail,
  setSendEmail,
  confirmResponsibility,
  setConfirmResponsibility,
  sendingReply,
  onSendReply,
  replyNotice,
}: ReplyComposerCardProps) {
  const isTr = locale === 'tr';
  const customerFirst = (active.customerName ?? (isTr ? 'müşteri' : 'customer')).split(' ')[0];
  const willEmail = sendEmail && Boolean(active.customerEmail);
  // §48 — live risk preview; a risky draft can't be sent (server re-checks).
  const risk = useReplyRisk(replyDraft);
  const canSend = Boolean(replyDraft.trim()) && !sendingReply && confirmResponsibility && !risk.blocked;

  // Auto-grow on every draft change — typing, but also "Yanıta aktar", the
  // failed-reply retry refill and the draft clearing when another review is
  // selected (an onInput-only resize left a tall empty box behind). lg:
  // capped at 200px (the docked composer must not eat the reading area);
  // mobile: up to half the viewport.
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    if (!replyDraft) return; // empty → back to the rows/min-height size
    const cap =
      window.innerWidth >= 1024 ? 200 : Math.min(480, Math.round(window.innerHeight * 0.5));
    el.style.height = `${Math.min(el.scrollHeight + 2, cap)}px`;
  }, [replyDraft]);

  return (
    // lg: column flex item of the docked footer — only the textarea shrinks
    // (min 44px, it then scrolls internally), every other row keeps its
    // height, so Send stays visible however long the draft gets.
    <div className="lg:flex lg:min-h-0 lg:flex-col">
      <div className="flex items-center justify-between gap-2 lg:shrink-0">
        <label htmlFor={REPLY_TEXTAREA_ID} className="text-[13px] font-semibold text-[#0A0A0A]">
          {isTr ? 'Yanıtınız' : 'Your reply'}
        </label>
        <span className="flex items-center gap-2">
          <ReplyTemplatesMenu
            locale={isTr ? 'tr' : 'en'}
            draft={replyDraft}
            onInsert={(text) => {
              setReplyDraft(replyDraft.trim() ? `${replyDraft.trimEnd()}\n\n${text}` : text);
              focusReplyTextarea();
            }}
          />
          <span className="text-[11px] tabular-nums text-[#A3A3A3]" aria-live="polite">
            {replyDraft.length} / {REPLY_MAX_LENGTH}
          </span>
        </span>
      </div>
      <textarea
        ref={textareaRef}
        id={REPLY_TEXTAREA_ID}
        rows={2}
        maxLength={REPLY_MAX_LENGTH}
        aria-describedby="reply-textarea-hint"
        aria-invalid={risk.blocked || undefined}
        value={replyDraft}
        onChange={(e) => setReplyDraft(e.target.value)}
        onKeyDown={(e) => {
          // Cmd/Ctrl+Enter → gönder. Empty / consent / sending guards live in
          // onSendReply too.
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            if (canSend) onSendReply();
          }
        }}
        placeholder={isTr ? `Merhaba ${customerFirst}, …` : `Hi ${customerFirst}, …`}
        inputMode="text"
        enterKeyHint="send"
        autoCorrect="on"
        spellCheck={true}
        className="mt-2 max-h-[480px] min-h-[84px] w-full resize-none overflow-y-auto rounded-xl border border-[#EDEDED] bg-white px-3.5 py-2.5 text-[16px] leading-[1.55] text-[#0A0A0A] placeholder:text-[#A3A3A3] focus:border-[#0A0A0A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] sm:text-[14px] lg:max-h-[200px] lg:min-h-[44px] lg:shrink"
      />
      <ReplyRiskNotice risk={risk} locale={isTr ? 'tr' : 'en'} className="mt-2 lg:shrink-0" />
      <p id="reply-textarea-hint" className="sr-only">
        {isTr
          ? 'Cmd veya Ctrl + Enter ile gönderebilirsiniz. En fazla 2000 karakter.'
          : 'Press Cmd or Ctrl + Enter to send. Up to 2,000 characters.'}
      </p>

      <div className="mt-2 rounded-lg bg-[#FAFAFA] px-3 py-2 text-[12px] lg:shrink-0 lg:py-1.5">
        {active.customerEmail ? (
          /* §38.238 — uzun e-posta checkbox'ı ezmesin: items-start + shrink-0
             + min-w-0 break-words. */
          <label className="flex cursor-pointer items-start gap-2 text-[#0A0A0A]">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#0A0A0A]"
            />
            <Mail size={12} className="mt-0.5 shrink-0 text-current opacity-60" aria-hidden="true" />
            <span className="min-w-0 break-words">
              {isTr ? 'Müşteriye e-posta gönder' : 'Email the customer'}
              <span className="ml-1 text-[#737373]">· {active.customerEmail}</span>
            </span>
          </label>
        ) : (
          <p className="flex items-start gap-2 text-[#737373]">
            <Mail size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              {isTr
                ? `Müşteri e-posta bırakmamış${active.rating >= 4 ? " (yüksek puanlılar Google'a yönlendirildiği için bu beklenir)" : ''} — yanıt sadece dahili kayıt olarak saklanır.`
                : `No customer email${active.rating >= 4 ? ' (expected: high ratings are redirected to Google)' : ''} — reply saved internally only.`}
            </span>
          </p>
        )}
      </div>

      {/* §45 — Per-message sorumluluk onayı. Her gönderimde yeniden
          işaretlenmeli (başarılı gönderim + yorum değişiminde parent
          sıfırlar). Metin ve link aynen korunur. */}
      <label className="mt-2 flex cursor-pointer items-start gap-2 text-[12px] leading-[1.5] text-[#525252] lg:shrink-0">
        <input
          type="checkbox"
          checked={confirmResponsibility}
          onChange={(e) => setConfirmResponsibility(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#0A0A0A]"
        />
        <span>
          {isTr ? (
            <>
              Bu yanıtın içeriğinden bizzat sorumlu olduğumu, tehdit, hakaret, iftira
              veya yasa dışı bir ifade içermediğini onaylıyorum (
              <Link
                href={`/${locale}/kabul-edilebilir-kullanim`}
                target="_blank"
                rel="noopener"
                className="font-semibold text-[#0A0A0A] underline-offset-2 hover:underline"
              >
                Kabul Edilebilir Kullanım Politikası
              </Link>
              ).
            </>
          ) : (
            <>
              I confirm I am solely responsible for this reply and that it does not
              contain a threat, insult, defamation, or unlawful statement (
              <Link
                href={`/${locale}/kabul-edilebilir-kullanim`}
                target="_blank"
                rel="noopener"
                className="font-semibold text-[#0A0A0A] underline-offset-2 hover:underline"
              >
                Acceptable Use Policy
              </Link>
              ).
            </>
          )}
        </span>
      </label>

      <div className="mt-2.5 flex items-center justify-between gap-3 lg:shrink-0">
        <p
          role="status"
          aria-live="polite"
          className={`min-w-0 text-[12px] leading-[1.45] ${
            replyNotice?.tone === 'success'
              ? 'text-[#166534]'
              : replyNotice?.tone === 'error'
                ? 'text-[#991B1B]'
                : 'text-[#525252]'
          }`}
        >
          {replyNotice?.msg}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-[11px] text-[#A3A3A3] sm:inline" aria-hidden="true">
            ⌘ Enter
          </span>
          <button
            type="button"
            onClick={onSendReply}
            disabled={!canSend}
            title={
              !replyDraft.trim()
                ? isTr
                  ? 'Önce bir yanıt yazın'
                  : 'Write a reply first'
                : risk.blocked
                  ? isTr
                    ? 'Bu yanıt gönderilemez — kırmızı uyarıya bakın'
                    : "This reply can't be sent — see the red warning"
                : !confirmResponsibility
                  ? isTr
                    ? 'Göndermeden önce sorumluluk onayını işaretleyin'
                    : 'Confirm the responsibility checkbox before sending'
                  : sendingReply
                    ? isTr
                      ? 'Gönderiliyor…'
                      : 'Sending…'
                    : undefined
            }
            className="bz-btn-primary bz-btn-sm"
          >
            {sendingReply ? (
              <Loader2 size={12} strokeWidth={2} className="animate-spin" aria-hidden="true" />
            ) : willEmail ? (
              <Mail size={12} strokeWidth={2} aria-hidden="true" />
            ) : (
              <Send size={12} strokeWidth={2} aria-hidden="true" />
            )}
            {willEmail
              ? isTr
                ? 'E-posta ile gönder'
                : 'Send as email'
              : isTr
                ? 'Dahili kaydet'
                : 'Save internal'}
          </button>
        </div>
      </div>
    </div>
  );
}
