'use client';

import { useLayoutEffect, useRef } from 'react';
import Link from 'next/link';
import { Loader2, Mail, RotateCw, Send, Sparkles } from 'lucide-react';
import { ReplyRiskNotice, useReplyRisk } from '@/components/reply/ReplyRiskNotice';
import type { AiSource, AiTone, FeedbackRow, ReplyTone } from './types';

/** API limit for a reply body (`/api/feedback/[id]/reply` → body_too_long). */
export const ADMIN_REPLY_MAX_LENGTH = 2000;

export const ADMIN_REPLY_TEXTAREA_ID = 'admin-reply-textarea';

/* ============================================================================
 * Pulse AI card — lives in the scrollable detail body, right above the docked
 * reply composer. Admin keeps its single `onSuggest(tone)` flow: the draft is
 * written straight into the reply box (no separate suggestion state).
 * ========================================================================== */

interface AdminPulseAiCardProps {
  isTr: boolean;
  suggesting: boolean;
  aiSource: AiSource;
  aiTone: AiTone;
  setAiTone: (v: AiTone) => void;
  onSuggest: (tone?: AiTone) => void;
}

export function AdminPulseAiCard({
  isTr,
  suggesting,
  aiSource,
  aiTone,
  setAiTone,
  onSuggest,
}: AdminPulseAiCardProps) {
  const isTemplate = aiSource === 'template' || aiSource === 'template-fallback';
  const hasDraft = aiSource !== null;

  return (
    // Fintora calm AI panel (owner parity): lavender surface, a small purple
    // sparkle circle, ink text — no dark fill, no gradient, no glow.
    <div className="mt-5 rounded-[20px] bg-pn-accent-soft p-4 text-pn-ink sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-pn-accent text-white"
        >
          <Sparkles size={15} strokeWidth={2} />
        </span>
        <span className="text-[14px] font-medium text-pn-ink">
          {isTr ? 'Pulse AI önerisi' : 'Pulse AI suggestion'}
        </span>
        {suggesting ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-[12px] font-medium text-[#737373]">
            <Loader2 size={11} className="animate-spin" aria-hidden="true" />
            {isTr ? 'Hazırlanıyor' : 'Working'}
          </span>
        ) : aiSource === 'openai' ? (
          <span className="rounded-full bg-white px-2.5 py-0.5 text-[12px] font-medium text-pn-accent">
            AI
          </span>
        ) : isTemplate ? (
          <span className="rounded-full bg-white px-2.5 py-0.5 text-[12px] font-medium text-[#737373]">
            {isTr ? 'Şablon' : 'Template'}
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-[14px] leading-[1.65] text-[#262626]">
        {hasDraft
          ? isTr
            ? 'Taslak aşağıdaki yanıt alanına eklendi. Göndermeden önce gözden geçirip düzenleyebilirsin.'
            : 'The draft is in the reply box below. Review and edit it before sending.'
          : isTr
            ? 'Puan, yorum ve müşteri bağlamına göre Buaze tonunda kişiselleştirilmiş yanıt üretir. AI yanıt vermezse güvenli şablona düşer.'
            : 'Generates a personalized reply in your Buaze voice based on rating, comment and context. Falls back to a safe template when unavailable.'}
      </p>

      {!suggesting && isTemplate && (
        <p className="mt-3 inline-flex items-start gap-2 text-[13px] leading-[1.5] text-[#8A5A00]">
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

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          onClick={() => onSuggest(aiTone)}
          disabled={suggesting}
          className="bz-btn-primary w-full sm:min-h-10 sm:w-auto sm:px-5 sm:text-[13px]"
        >
          {suggesting ? (
            <Loader2 size={15} strokeWidth={2} className="animate-spin" aria-hidden="true" />
          ) : hasDraft ? (
            <RotateCw size={15} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Sparkles size={15} strokeWidth={2} aria-hidden="true" />
          )}
          {hasDraft
            ? isTr
              ? 'Yeniden öner'
              : 'Regenerate'
            : isTr
              ? 'Taslak oluştur'
              : 'Generate draft'}
        </button>
        <select
          value={aiTone}
          onChange={(e) => setAiTone(e.target.value as AiTone)}
          disabled={suggesting}
          aria-label={isTr ? 'Pulse AI yanıt tonu' : 'Pulse AI reply tone'}
          /* Native select as a white pill on the lavender AI panel (owner
             parity). 16px + 44px on mobile (iOS zoom, touch target). */
          className="min-h-[44px] w-full cursor-pointer rounded-full border-0 bg-white px-4 py-2 text-[16px] font-medium text-pn-ink outline-none transition-colors duration-200 hover:bg-[#FBFAFE] focus-visible:ring-2 focus-visible:ring-pn-accent disabled:opacity-50 sm:min-h-10 sm:w-auto sm:py-0 sm:text-[13px]"
        >
          <option value="warm" className="text-pn-ink">
            {isTr ? 'Ton: Samimi' : 'Tone: Warm'}
          </option>
          <option value="formal" className="text-pn-ink">
            {isTr ? 'Ton: Resmi' : 'Tone: Formal'}
          </option>
          <option value="apologetic" className="text-pn-ink">
            {isTr ? 'Ton: Özür' : 'Tone: Apologetic'}
          </option>
        </select>
      </div>
    </div>
  );
}

/* ============================================================================
 * Reply composer card — docked at the bottom of the detail pane on lg (outside
 * the scroll area, so it can never cover content), inline on mobile.
 * ========================================================================== */

interface AdminReplyComposerCardProps {
  feedback: FeedbackRow;
  isTr: boolean;
  locale: string;
  draft: string;
  setDraft: (v: string) => void;
  sendEmail: boolean;
  setSendEmail: (v: boolean) => void;
  confirmResponsibility: boolean;
  setConfirmResponsibility: (v: boolean) => void;
  sending: boolean;
  onSend: () => void;
  notice: { msg: string; tone: ReplyTone } | null;
}

export function AdminReplyComposerCard({
  feedback: active,
  isTr,
  locale,
  draft,
  setDraft,
  sendEmail,
  setSendEmail,
  confirmResponsibility,
  setConfirmResponsibility,
  sending,
  onSend,
  notice,
}: AdminReplyComposerCardProps) {
  const willEmail = sendEmail && Boolean(active.customerEmail);
  // §48 — live risk preview; a risky draft can't be sent (server re-checks).
  const risk = useReplyRisk(draft);
  const canSend = Boolean(draft.trim()) && !sending && confirmResponsibility && !risk.blocked;

  // Auto-grow on every draft change (typing, an AI draft landing, the draft
  // clearing on a review switch). lg: capped at 200px so the docked composer
  // never eats the reading area; mobile: up to half the viewport.
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    if (!draft) return; // empty → back to the rows/min-height size
    const cap =
      window.innerWidth >= 1024 ? 200 : Math.min(480, Math.round(window.innerHeight * 0.5));
    el.style.height = `${Math.min(el.scrollHeight + 2, cap)}px`;
  }, [draft]);

  return (
    // lg: column flex item of the docked footer — only the textarea shrinks
    // (min 44px, it then scrolls internally), so Send stays visible however
    // long the draft gets.
    <div className="lg:flex lg:min-h-0 lg:flex-col">
      <div className="flex items-center justify-between gap-2 lg:shrink-0">
        <label htmlFor={ADMIN_REPLY_TEXTAREA_ID} className="text-[14px] font-medium text-pn-ink">
          {isTr ? 'Yanıtınız' : 'Your reply'}
        </label>
        <span className="text-[12px] tabular-nums text-[#9A9A9A]" aria-live="polite">
          {draft.length} / {ADMIN_REPLY_MAX_LENGTH}
        </span>
      </div>
      <textarea
        ref={textareaRef}
        id={ADMIN_REPLY_TEXTAREA_ID}
        rows={2}
        maxLength={ADMIN_REPLY_MAX_LENGTH}
        aria-describedby="admin-reply-textarea-hint"
        aria-invalid={risk.blocked || undefined}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          // Cmd/Ctrl+Enter → send (owner parity). onSend re-checks the
          // empty / consent / sending guards.
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            if (canSend) onSend();
          }
        }}
        placeholder={isTr ? 'Yanıtınızı yazın…' : 'Write your reply…'}
        inputMode="text"
        enterKeyHint="send"
        autoCorrect="on"
        spellCheck={true}
        className="mt-2 max-h-[480px] min-h-[96px] w-full resize-none overflow-y-auto rounded-[20px] border-0 bg-[#F6F6F6] px-4 py-3 text-[16px] leading-[1.55] text-pn-ink transition-shadow duration-200 placeholder:text-[#9A9A9A] focus:outline-none focus:shadow-[0_0_0_2px_#5D3EBC] sm:text-[14px] lg:max-h-[200px] lg:min-h-[48px] lg:shrink"
      />
      <ReplyRiskNotice risk={risk} locale={isTr ? 'tr' : 'en'} className="mt-2 lg:shrink-0" />
      <p id="admin-reply-textarea-hint" className="sr-only">
        {isTr
          ? 'Cmd veya Ctrl + Enter ile gönderebilirsiniz. En fazla 2000 karakter.'
          : 'Press Cmd or Ctrl + Enter to send. Up to 2,000 characters.'}
      </p>

      <div className="mt-2 rounded-[16px] bg-[#F6F6F6] px-3.5 py-2.5 text-[13px] lg:shrink-0 lg:py-2">
        {active.customerEmail ? (
          <label className="flex cursor-pointer items-start gap-2 text-pn-ink">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-pn-accent"
            />
            <Mail size={14} className="mt-0.5 shrink-0 text-[#737373]" aria-hidden="true" />
            <span className="min-w-0 break-words">
              {isTr ? 'Müşteriye e-posta gönder' : 'Email the customer'}
              <span className="ml-1 text-[#737373]">· {active.customerEmail}</span>
            </span>
          </label>
        ) : (
          <p className="flex items-start gap-2 text-[#737373]">
            <Mail size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              {isTr
                ? `Müşteri e-posta bırakmamış${active.rating >= 4 ? ' (yüksek puanlılar yönlendirildiği için bu beklenir)' : ''} — yanıt sadece dahili olarak kaydedilir.`
                : `No customer email${active.rating >= 4 ? ' (expected for high-rating redirects)' : ''} — reply saved internally only.`}
            </span>
          </p>
        )}
      </div>

      {/* §45 — Per-message responsibility acknowledgement. Must be ticked for
          every send (the page resets it after a successful send and on every
          review switch). Wording and link verbatim. */}
      <label className="mt-2.5 flex cursor-pointer items-start gap-2 px-0.5 text-[12px] leading-[1.5] text-[#737373] lg:shrink-0">
        <input
          type="checkbox"
          checked={confirmResponsibility}
          onChange={(e) => setConfirmResponsibility(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-pn-accent"
        />
        <span>
          {isTr ? (
            <>
              Bu yanıtın içeriğinden bizzat sorumlu olduğumu, tehdit, hakaret, iftira
              veya yasa dışı bir ifade içermediğini onaylıyorum ({' '}
              <Link
                href={`/${locale}/kabul-edilebilir-kullanim`}
                target="_blank"
                rel="noopener"
                className="font-medium text-pn-ink underline-offset-2 hover:underline"
              >
                Kabul Edilebilir Kullanım Politikası
              </Link>
              ).
            </>
          ) : (
            <>
              I confirm I am solely responsible for this reply and that it does not
              contain a threat, insult, defamation, or unlawful statement ({' '}
              <Link
                href={`/${locale}/kabul-edilebilir-kullanim`}
                target="_blank"
                rel="noopener"
                className="font-medium text-pn-ink underline-offset-2 hover:underline"
              >
                Acceptable Use Policy
              </Link>
              ).
            </>
          )}
        </span>
      </label>

      <div className="mt-3 flex items-center justify-between gap-3 lg:shrink-0">
        <p
          role="status"
          aria-live="polite"
          className={`min-w-0 text-[13px] leading-[1.45] ${
            notice?.tone === 'success'
              ? 'text-[#23863A]'
              : notice?.tone === 'error'
                ? 'text-[#D92D20]'
                : 'text-[#737373]'
          }`}
        >
          {notice?.msg}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-[12px] text-[#9A9A9A] sm:inline" aria-hidden="true">
            ⌘ Enter
          </span>
          <button
            type="button"
            onClick={onSend}
            disabled={!canSend}
            title={
              !draft.trim()
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
                  : sending
                    ? isTr
                      ? 'Gönderiliyor…'
                      : 'Sending…'
                    : undefined
            }
            className="bz-btn-primary sm:min-h-10 sm:px-5"
          >
            {sending ? (
              <Loader2 size={15} strokeWidth={2} className="animate-spin" aria-hidden="true" />
            ) : willEmail ? (
              <Mail size={15} strokeWidth={2} aria-hidden="true" />
            ) : (
              <Send size={15} strokeWidth={2} aria-hidden="true" />
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
