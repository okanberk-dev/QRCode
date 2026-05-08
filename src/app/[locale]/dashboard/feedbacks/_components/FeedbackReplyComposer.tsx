'use client';

import { Loader2, Mail, Pencil, RotateCw, Send, Sparkles } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import type { AiSource, AiTone, FeedbackRow, ReplyTone } from './types';

interface FeedbackReplyComposerProps {
  feedback: FeedbackRow;
  locale: Locale;

  // AI block
  aiLoading: boolean;
  aiRegenerating: boolean;
  aiSuggestion: string;
  aiSource: AiSource;
  aiFromBackground: boolean;
  aiTone: AiTone;
  setAiTone: (v: AiTone) => void;
  onRegenerateAi: () => void;
  onUseAiAndSend: () => void;
  onCopyAiToDraft: () => void;

  // Reply textarea
  replyDraft: string;
  setReplyDraft: (v: string) => void;
  sendEmail: boolean;
  setSendEmail: (v: boolean) => void;
  sendingReply: boolean;
  onSendReply: () => void;

  // Inline notice
  replyNotice: { msg: string; tone: ReplyTone } | null;
}

export function FeedbackReplyComposer({
  feedback: active,
  locale,
  aiLoading,
  aiRegenerating,
  aiSuggestion,
  aiSource,
  aiFromBackground,
  aiTone,
  setAiTone,
  onRegenerateAi,
  onUseAiAndSend,
  onCopyAiToDraft,
  replyDraft,
  setReplyDraft,
  sendEmail,
  setSendEmail,
  sendingReply,
  onSendReply,
  replyNotice,
}: FeedbackReplyComposerProps) {
  const isTr = locale === 'tr';
  const customerFirst = (active.customerName ?? (isTr ? 'müşteri' : 'customer')).split(' ')[0];
  const autoDraftEnabled = active.aiAutoDraftEnabled === true;

  return (
    <>
      {/* Buaze Pulse AI suggestion */}
      <div className="rounded-xl bg-[#0A0A0A] p-4 sm:p-5 text-white">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-[#C6F24E] text-[10px] font-bold text-[#0A0A0A] bz-h-tight">
            AI
          </span>
          <span className="pulse-eyebrow text-[#C6F24E]">
            {isTr ? 'BUAZE PULSE AI ÖNERİSİ' : 'BUAZE PULSE AI SUGGESTION'}
          </span>
          {!aiLoading && aiSource === 'openai' && (
            <span className="pulse-eyebrow rounded-full bg-[#C6F24E] px-2 py-0.5 text-[#0A0A0A]">
              AI
            </span>
          )}
          {!aiLoading && (aiSource === 'template' || aiSource === 'template-fallback') && (
            <span className="pulse-eyebrow rounded-full bg-white/10 px-2 py-0.5 text-white/70">
              {isTr ? 'ŞABLON' : 'TEMPLATE'}
            </span>
          )}
          {!aiLoading && aiFromBackground && (
            <span className="pulse-eyebrow rounded-full bg-white/10 px-2 py-0.5 text-white/70">
              {isTr ? 'HAZIR' : 'READY'}
            </span>
          )}
          {aiLoading && (
            <span className="pulse-eyebrow inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-white/70">
              <Loader2 size={10} className="animate-spin" />
              {isTr ? 'HAZIRLANIYOR' : 'WORKING'}
            </span>
          )}
        </div>

        {aiLoading ? (
          <div className="mt-3 space-y-2" aria-hidden="true">
            <div className="h-3 w-full rounded bg-white/10 animate-pulse" />
            <div className="h-3 w-[88%] rounded bg-white/10 animate-pulse" />
            <div className="h-3 w-[60%] rounded bg-white/10 animate-pulse" />
          </div>
        ) : (
          <p className="mt-3 text-[13px] leading-[1.65] text-white/80">
            {aiSuggestion
              ? `"${aiSuggestion}"`
              : autoDraftEnabled
                ? isTr
                  ? 'Pulse AI henüz bir taslak üretmedi.'
                  : 'Pulse AI has not produced a draft yet.'
                : isTr
                  ? 'Otomatik taslak kapalı. İstersen "Yeniden öner" ile manuel taslak oluşturabilirsin.'
                  : 'Auto-drafts are off. You can still create one manually with "Regenerate".'}
          </p>
        )}

        {!aiLoading && (aiSource === 'template' || aiSource === 'template-fallback') && aiSuggestion && (
          <p className="mt-3 inline-flex items-start gap-2 text-[11px] leading-[1.5] text-white/60">
            <span aria-hidden="true" className="mt-0.5">⚠</span>
            <span>
              {isTr
                ? 'AI servisi şu an pasif; aşağıdaki şablon hazır taslaktır. "Yeniden öner" ile tekrar deneyebilirsiniz.'
                : 'AI service is currently unavailable; this is a generic template. Click "Regenerate" to retry.'}
            </span>
          </p>
        )}

        {/* Action row — mobile stack, sm+ row.
            Stage 79 §38.159 — xl+ dar panel (~360px) için gap-1.5 kompakt
            (4 button: Use & send + Regenerate + Tone select + Edit). */}
        <div className="mt-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 xl:gap-1.5">
          <button
            type="button"
            onClick={onUseAiAndSend}
            disabled={aiLoading || !aiSuggestion || sendingReply}
            className="bz-btn-lime w-full disabled:opacity-50 sm:w-auto"
            title={isTr ? 'AI taslağını doğrudan gönder' : 'Send the AI draft directly'}
          >
            {sendingReply ? (
              <Loader2 size={12} strokeWidth={2} className="animate-spin" />
            ) : (
              <Sparkles size={12} strokeWidth={2} />
            )}
            {isTr ? 'Kullan & gönder' : 'Use & send'}
          </button>
          <button
            type="button"
            onClick={onRegenerateAi}
            disabled={aiLoading || aiRegenerating}
            className="bz-btn-on-dark bz-btn-sm w-full sm:w-auto disabled:opacity-50"
          >
            <RotateCw size={12} strokeWidth={2} className={aiRegenerating ? 'animate-spin' : ''} />
            {isTr ? 'Yeniden öner' : 'Regenerate'}
          </button>
          <select
            value={aiTone}
            onChange={(e) => {
              const next = e.target.value as AiTone;
              setAiTone(next);
              // UX: tone değişimi → otomatik AI regenerate. Kullanıcı "Yeniden
              // öner"e bastırmak zorunda kalmasın. aiSuggestion mevcut olmalı
              // (aksi halde kullanıcı ilk seçim yapıyor demektir, regenerate
              // gerekmez — onRegenerateAi içinde guard'lı).
              if (aiSuggestion && !aiRegenerating && !aiLoading) {
                onRegenerateAi();
              }
            }}
            disabled={aiLoading || aiRegenerating}
            aria-label={isTr ? 'Pulse AI yanıt tonu' : 'Pulse AI reply tone'}
            title={isTr ? 'Tonu değiştirince taslak otomatik yenilenir' : 'Changing tone auto-regenerates the draft'}
            className="w-full sm:w-auto rounded-full border border-white/20 bg-transparent px-3 py-2 sm:py-1.5 text-[12px] font-medium text-white hover:bg-white/10 bz-motion-spring disabled:opacity-50 outline-none focus-visible:border-[#C6F24E] focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
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
          <button
            type="button"
            onClick={onCopyAiToDraft}
            disabled={aiLoading || !aiSuggestion}
            className="bz-btn-on-dark bz-btn-sm w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            title={isTr ? 'Taslağı düzenleme alanına kopyala' : 'Copy draft to editor'}
          >
            <Pencil size={12} strokeWidth={2} />
            {isTr ? 'Düzenle' : 'Edit'}
          </button>
        </div>
      </div>

      {/*
        Reply textarea card.
        Stage 79 §38.159 — Desktop (lg+) composer'ı detail panel'in alt
        edge'ine sticky bağla. Body content (header/comment/AI summary/sent
        replies/metadata/timeline) scroll edebilir; reply card her zaman
        görünür kalır → kullanıcı yazınca Send button + KVKK consent +
        replyNotice scroll'un en altında kayıp gitmez (kullanıcı raporu
        "alta inilmiyor ne yazılacak görünmüyor" fix).
        Mobile (<lg): sticky aktif değil (parent overflow-y-auto yok).
        FeedbackDetail outer section `lg:overflow-y-auto` zaten scroll
        context sağlıyor (§38.62). Sticky `bottom-0` ile detail panel
        viewport bottom'una pin. Edge-to-edge styling: `lg:-mx-5 sm:lg:-mx-8`
        body wrapper padding'i nötralize, `lg:rounded-none + lg:border-x-0
        + lg:border-b-0 + lg:border-t` çerçeve sticky panel'e dönüşür.
        Apple-soft top shadow `0_-4px_12px_-6px_rgba(10,10,10,0.06)` body↔
        composer separation visual cue (CLAUDE.md §38.65 elev-2 paterni).
      */}
      <div className="mt-4 rounded-xl border border-[#EDEDED] p-4 lg:sticky lg:bottom-0 lg:z-10 lg:-mx-5 sm:lg:-mx-8 lg:px-5 sm:lg:px-8 lg:rounded-none lg:border-x-0 lg:border-b-0 lg:border-t lg:border-[#EDEDED] lg:bg-white lg:shadow-[0_-4px_12px_-6px_rgba(10,10,10,0.06)] lg:py-4">
        <div className="flex items-center justify-between gap-2">
          <label
            id="reply-textarea-label"
            htmlFor="reply-textarea-input"
            className="pulse-eyebrow text-[#737373] cursor-pointer"
          >
            {isTr ? 'YANIT YAZIN' : 'WRITE A REPLY'}
          </label>
          <div className="flex items-center gap-2">
            {replyDraft.length > 0 && (
              <span
                className="bz-mono text-[10px] tabular-nums text-[#A3A3A3]"
                aria-live="polite"
              >
                {replyDraft.length}
              </span>
            )}
            {replyNotice && (
              <span
                className={`pulse-eyebrow rounded-full px-2.5 py-1 ${
                  replyNotice.tone === 'success'
                    ? 'bg-[#EAF9B8] text-[#0A0A0A]'
                    : replyNotice.tone === 'error'
                      ? 'bg-[#FEF2F2] text-[#991B1B]'
                      : 'bg-[#F5F5F5] text-[#525252]'
                }`}
                role="status"
              >
                {replyNotice.msg}
              </span>
            )}
          </div>
        </div>
        <textarea
          id="reply-textarea-input"
          aria-labelledby="reply-textarea-label"
          aria-describedby="reply-textarea-hint"
          value={replyDraft}
          onChange={(e) => setReplyDraft(e.target.value)}
          onKeyDown={(e) => {
            // Klavye shortcut'ı: Cmd/Ctrl+Enter → gönder (composer odaklıyken).
            // Boş textarea + sendingReply state engellemesi onSendReply'da var.
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              if (replyDraft.trim() && !sendingReply) onSendReply();
            }
          }}
          onInput={(e) => {
            // UX: textarea auto-grow — viewport + breakpoint-aware max height.
            // Stage 79 §38.159 — Desktop (lg+, 1024+px) detail panel sticky
            // composer paterninde textarea cap 220px (composer alt edge'e
            // sticky'leniyor; textarea aşırı büyürse composer body content'in
            // çoğunu kapatır). Mobile push-route view: 50vh / 480px (full
            // screen, body içinde scroll OK).
            const el = e.currentTarget;
            el.style.height = 'auto';
            const isLg = typeof window !== 'undefined' && window.innerWidth >= 1024;
            const cap = isLg
              ? Math.min(220, Math.round(window.innerHeight * 0.32))
              : typeof window !== 'undefined'
                ? Math.min(480, Math.round(window.innerHeight * 0.5))
                : 480;
            el.style.height = `${Math.min(el.scrollHeight, cap)}px`;
          }}
          placeholder={isTr ? `Merhaba ${customerFirst},` : `Hi ${customerFirst},`}
          // §38.74 — Mobile keyboard hints (CLAUDE.md §25.5 paterni reuse).
          // inputMode="text" Safari soft-keyboard layout düzgün; enterKeyHint
          // "send" iOS Done butonunu Gönder olarak gösterir (Cmd+Enter shortcut
          // line 234 desktop'ta, mobile için soft keyboard hint).
          inputMode="text"
          enterKeyHint="send"
          autoCorrect="on"
          spellCheck={true}
          className="mt-2.5 w-full min-h-[120px] resize-none bg-transparent text-[16px] sm:text-[13px] text-[#0A0A0A] placeholder:text-[#A3A3A3] outline-none focus:placeholder:text-[#525252] transition-[height] duration-150 overflow-y-auto"
          maxLength={5000}
        />
        <p
          id="reply-textarea-hint"
          className="sr-only"
        >
          {isTr
            ? 'Cmd veya Ctrl + Enter ile gönderebilirsiniz. En fazla 5000 karakter.'
            : 'Press Cmd or Ctrl + Enter to send. Maximum 5000 characters.'}
        </p>

        <div className="mt-3 rounded-lg bg-[#FAFAFA] p-2.5">
          {active.customerEmail ? (
            <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[#0A0A0A]">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="h-4 w-4 accent-[#0A0A0A]"
              />
              <Mail size={12} className="text-current opacity-60" />
              <span>
                {isTr ? 'Müşteriye e-posta gönder' : 'Email the customer'}
                <span className="ml-1 text-[#737373]">· {active.customerEmail}</span>
              </span>
            </label>
          ) : (
            <p className="flex items-center gap-2 text-[11px] text-[#737373]">
              <Mail size={12} />
              {isTr
                ? `Müşteri e-posta bırakmamış${active.rating >= 4 ? " (yüksek puanlılar Google'a yönlendirildiği için bu beklenir)" : ''} — yanıt sadece dahili kayıt olarak saklanır.`
                : `No customer email${active.rating >= 4 ? ' (expected: high ratings are redirected to Google)' : ''} — reply saved internally only.`}
            </p>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          {/* Mobile: empty spacer (button right-aligned). Desktop: shortcut hint. */}
          <span
            className="hidden sm:inline-flex items-center gap-1.5 text-[10.5px] text-[#A3A3A3]"
            aria-hidden
          >
            <kbd className="bz-mono rounded border border-[#EDEDED] bg-[#FAFAFA] px-1.5 py-0.5 text-[9.5px] text-[#525252]">
              ⌘
            </kbd>
            <kbd className="bz-mono rounded border border-[#EDEDED] bg-[#FAFAFA] px-1.5 py-0.5 text-[9.5px] text-[#525252]">
              Enter
            </kbd>
            {isTr ? 'göndermek için' : 'to send'}
          </span>
          <button
            type="button"
            onClick={onSendReply}
            disabled={!replyDraft.trim() || sendingReply}
            aria-disabled={!replyDraft.trim() || sendingReply}
            title={
              !replyDraft.trim()
                ? isTr
                  ? 'Önce bir yanıt yazın'
                  : 'Write a reply first'
                : sendingReply
                  ? isTr
                    ? 'Gönderiliyor…'
                    : 'Sending…'
                  : undefined
            }
            className="bz-btn-primary bz-btn-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sendingReply ? (
              <Loader2 size={12} strokeWidth={2} className="animate-spin" />
            ) : sendEmail && active.customerEmail ? (
              <Mail size={12} strokeWidth={2} />
            ) : (
              <Send size={12} strokeWidth={2} />
            )}
            {sendEmail && active.customerEmail
              ? isTr
                ? 'E-posta ile gönder'
                : 'Send as email'
              : isTr
                ? 'Dahili kaydet'
                : 'Save internal'}
          </button>
        </div>
      </div>
    </>
  );
}

export default FeedbackReplyComposer;
