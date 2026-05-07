'use client';

import { Loader2, Mail, Send, Sparkles } from 'lucide-react';
import type { AiSource, AiTone, FeedbackRow, ReplyTone } from './types';

interface AdminFeedbackReplyComposerProps {
  feedback: FeedbackRow;
  isTr: boolean;
  locale: string;

  // AI block
  suggesting: boolean;
  aiSource: AiSource;
  aiTone: AiTone;
  setAiTone: (v: AiTone) => void;
  onSuggest: (tone?: AiTone) => void;

  // Composer
  draft: string;
  setDraft: (v: string) => void;
  sendEmail: boolean;
  setSendEmail: (v: boolean) => void;
  sending: boolean;
  onSend: () => void;
  notice: { msg: string; tone: ReplyTone } | null;
}

export function AdminFeedbackReplyComposer({
  feedback: active,
  isTr,
  suggesting,
  aiSource,
  aiTone,
  setAiTone,
  onSuggest,
  draft,
  setDraft,
  sendEmail,
  setSendEmail,
  sending,
  onSend,
  notice,
}: AdminFeedbackReplyComposerProps) {
  return (
    <>
      {/* Pulse AI block — graphite imza (owner ile parite §11) */}
      <div className="rounded-xl bg-[#0A0A0A] p-4 sm:p-5 text-white">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-[#C6F24E] text-[10px] font-bold text-[#0A0A0A] bz-h-tight">
            AI
          </span>
          <span className="pulse-eyebrow text-[#C6F24E]">
            {isTr ? 'BUAZE PULSE AI ÖNERİSİ' : 'BUAZE PULSE AI SUGGESTION'}
          </span>
          {!suggesting && aiSource === 'openai' && (
            <span className="pulse-eyebrow rounded-full bg-[#C6F24E] px-2 py-0.5 text-[#0A0A0A]">
              AI
            </span>
          )}
          {!suggesting && (aiSource === 'template' || aiSource === 'template-fallback') && (
            <span className="pulse-eyebrow rounded-full bg-white/10 px-2 py-0.5 text-white/70">
              {isTr ? 'ŞABLON' : 'TEMPLATE'}
            </span>
          )}
          {suggesting && (
            <span className="pulse-eyebrow inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-white/70">
              <Loader2 size={10} className="animate-spin" />
              {isTr ? 'HAZIRLANIYOR' : 'WORKING'}
            </span>
          )}
        </div>

        <p className="mt-3 text-[12px] leading-[1.55] text-white/70">
          {isTr
            ? 'Puan, yorum ve müşteri bağlamına göre Buaze tonunda kişiselleştirilmiş yanıt üretir. AI yanıt vermezse güvenli şablona düşer.'
            : 'Generates a personalized reply in your Buaze voice based on rating, comment and context. Falls back to a safe template when unavailable.'}
        </p>

        <div className="mt-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
          <button
            type="button"
            onClick={() => onSuggest(aiTone)}
            disabled={suggesting}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-full bg-[#C6F24E] px-4 py-2 sm:py-1.5 text-[12px] font-semibold text-[#0A0A0A] hover:bg-[#A8D62E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {suggesting ? (
              <Loader2 size={12} strokeWidth={2} className="animate-spin" />
            ) : (
              <Sparkles size={12} strokeWidth={2} />
            )}
            {isTr ? 'Taslak oluştur' : 'Generate draft'}
          </button>
          <select
            value={aiTone}
            onChange={(e) => setAiTone(e.target.value as AiTone)}
            disabled={suggesting}
            aria-label={isTr ? 'Pulse AI tonu' : 'Pulse AI tone'}
            className="w-full sm:w-auto rounded-full border border-white/20 bg-transparent px-3 py-2 sm:py-1.5 text-[12px] font-medium text-white hover:bg-white/10 transition-colors disabled:opacity-50 outline-none focus:border-[#C6F24E]"
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
        </div>
      </div>

      {/* Reply textarea */}
      <div className="mt-4 rounded-xl border border-[#EDEDED] p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="pulse-eyebrow text-[#737373]">
            {isTr ? 'YANIT YAZIN' : 'WRITE A REPLY'}
          </p>
          {notice && (
            <span
              className={`pulse-eyebrow rounded-full px-2.5 py-1 ${
                notice.tone === 'success'
                  ? 'bg-[#EAF9B8] text-[#0A0A0A]'
                  : notice.tone === 'error'
                    ? 'bg-[#FEF2F2] text-[#991B1B]'
                    : 'bg-[#F5F5F5] text-[#525252]'
              }`}
            >
              {notice.msg}
            </span>
          )}
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={5}
          placeholder={isTr ? 'Yanıtınızı yazın…' : 'Write your reply…'}
          className="mt-2.5 w-full resize-none bg-transparent text-[14px] sm:text-[13px] text-[#0A0A0A] placeholder:text-[#A3A3A3] outline-none"
        />

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
                ? `Müşteri e-posta bırakmamış${active.rating >= 4 ? ' (yüksek puanlılar yönlendirildiği için bu beklenir)' : ''} — yanıt sadece dahili olarak kaydedilir.`
                : `No customer email${active.rating >= 4 ? ' (expected for high-rating redirects)' : ''} — reply saved internally only.`}
            </p>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[11px] text-[#737373] tabular-nums">
            {draft.length} / 2000
          </span>
          <button
            type="button"
            onClick={onSend}
            disabled={sending || !draft.trim()}
            className="bz-btn-primary bz-btn-sm disabled:opacity-40"
          >
            {sending ? (
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

export default AdminFeedbackReplyComposer;
