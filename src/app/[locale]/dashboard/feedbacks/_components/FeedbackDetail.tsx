'use client';

import { ArrowLeft, Flag, Loader2, Mail, MessageSquare, Plus, Sparkles } from 'lucide-react';
import { AlertBanner, Avatar } from '@/components/ui';
import type { Locale } from '@/lib/translations';
import type {
  AiSource,
  AiTone,
  FeedbackRow,
  ReplyTone,
  SentReply,
} from './types';
import { initials, timeAgo } from './utils';
import { FeedbackReplyComposer } from './FeedbackReplyComposer';

interface FeedbackDetailProps {
  feedback: FeedbackRow;
  locale: Locale;

  /** Mobile push-route geri butonu (yalnız mobil görünümde göster). */
  showBackButton: boolean;
  onBack: () => void;

  /** Flag toggle */
  onFlag: () => void;

  /** Sent replies thread */
  sentReplies: SentReply[];
  sentLoading: boolean;

  /** AI block + reply composer */
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

  replyDraft: string;
  setReplyDraft: (v: string) => void;
  sendEmail: boolean;
  setSendEmail: (v: boolean) => void;
  sendingReply: boolean;
  onSendReply: () => void;
  replyNotice: { msg: string; tone: ReplyTone } | null;
}

const ASPECT_LABEL_TR = { service: 'Servis', food: 'Yemek', price: 'Fiyat', atmosphere: 'Atmosfer' };
const ASPECT_LABEL_EN = { service: 'Service', food: 'Food', price: 'Price', atmosphere: 'Atmosphere' };

export function FeedbackDetail(props: FeedbackDetailProps) {
  const { feedback: active, locale, showBackButton, onBack, onFlag, sentReplies, sentLoading } = props;
  const isTr = locale === 'tr';
  const aspectLabel = isTr ? ASPECT_LABEL_TR : ASPECT_LABEL_EN;
  const customerAspects = active.aspects ?? null;

  return (
    <section className="flex flex-col bg-white lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
      {/* Mobile sticky top — back button */}
      {showBackButton && (
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-[#EDEDED] bg-white/95 backdrop-blur px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#0A0A0A]"
            aria-label={isTr ? 'Yorumlar listesine dön' : 'Back to reviews'}
          >
            <ArrowLeft size={16} strokeWidth={2} />
            {isTr ? 'Yorumlar' : 'Reviews'}
          </button>
          <button
            type="button"
            onClick={onFlag}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#EDEDED] px-2.5 py-1.5 text-[11px] font-medium text-[#525252] hover:border-[#0A0A0A] transition-colors"
            title={isTr ? 'Bayrakla işaretle' : 'Flag'}
          >
            <Flag size={12} strokeWidth={2} />
            {isTr ? 'İşaretle' : 'Flag'}
          </button>
        </div>
      )}

      {/* Mobile alt padding: UserDashboardShell mobile bottom nav (~64px,
          z-40 lg:hidden) son button'u/composer'ı kapatmasın diye 80px
          ekstra alt boşluk. Desktop'ta nav yok, gereksiz padding gitsin. */}
      <div className="flex-1 p-5 pb-24 sm:p-8 sm:pb-24 lg:pb-8">
        {/* Header card */}
        <div className="flex items-start gap-4">
          <Avatar
            name={initials(active.customerName)}
            size={56}
            color={active.rating >= 4 ? '#0A0A0A' : active.rating <= 2 ? '#DC2626' : '#737373'}
            fg={active.rating >= 4 ? '#C6F24E' : '#FFFFFF'}
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-[22px] font-semibold text-[#0A0A0A] tracking-[-0.015em] bz-h-tight">
              {active.customerName || (isTr ? 'Anonim müşteri' : 'Anonymous customer')}
            </h2>
            <p className="pulse-eyebrow text-[#737373] mt-1">
              {(active.platform || 'BUAZE').toUpperCase()}
              {active.restaurant?.name ? ` · ${active.restaurant.name.toUpperCase()}` : ''}
              {` · ${timeAgo(active.createdAt, locale).toUpperCase()} ${isTr ? 'ÖNCE' : 'AGO'}`}
            </p>
            <div className="mt-2 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className={`${i <= active.rating ? 'text-[#C6F24E]' : 'text-[#EDEDED]'} text-[16px]`}
                >
                  ★
                </span>
              ))}
              <span className="ml-2 text-[13px] font-semibold text-[#0A0A0A]">
                {active.rating.toFixed(1)}
              </span>
            </div>
          </div>
          {/* Desktop flag button (mobile sticky-top'ta zaten var) */}
          {!showBackButton && (
            <div className="hidden lg:flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={onFlag}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#EDEDED] px-2.5 py-1.5 text-[11px] font-medium text-[#525252] hover:border-[#0A0A0A] transition-colors"
                title={isTr ? 'Bayrakla işaretle' : 'Flag'}
              >
                <Flag size={12} strokeWidth={2} />
                {isTr ? 'İşaretle' : 'Flag'}
              </button>
            </div>
          )}
        </div>

        {/* Comment */}
        <div className="mt-6 rounded-xl bg-[#FAFAFA] p-5 text-[15px] leading-[1.65] text-[#0A0A0A]">
          {active.comment ? `"${active.comment}"` : isTr ? 'Yorum bırakılmadı.' : 'No comment.'}
        </div>

        {/* Aspect tags */}
        {customerAspects && Object.entries(customerAspects).some(([, v]) => v) && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {Object.entries(customerAspects).map(([k, v]) =>
              v ? (
                <span
                  key={k}
                  className="rounded-full bg-[#EAF9B8] px-2.5 py-1 text-[11px] font-medium text-[#0A0A0A]"
                >
                  {aspectLabel[k as keyof typeof aspectLabel] ?? k} · +{v}
                </span>
              ) : null,
            )}
            <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#A3A3A3] px-2.5 py-1 text-[11px] text-[#737373]">
              <Plus size={10} strokeWidth={2} />
              {isTr ? 'Etiket' : 'Tag'}
            </span>
          </div>
        )}

        {/* Sent reply thread */}
        {sentReplies.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={13} className="text-[#525252]" strokeWidth={2} />
              <span className="pulse-eyebrow text-[#737373]">
                {isTr
                  ? `GÖNDERİLEN YANITLAR (${sentReplies.length})`
                  : `SENT REPLIES (${sentReplies.length})`}
              </span>
            </div>
            <ol className="flex flex-col gap-2.5">
              {sentReplies.map((rep) => {
                const channelLabel =
                  rep.channel === 'email'
                    ? isTr
                      ? 'E-posta'
                      : 'Email'
                    : isTr
                      ? 'Dahili'
                      : 'Internal';
                const tone =
                  rep.status === 'failed'
                    ? 'border-[#FCA5A5] bg-[#FFFBFB]'
                    : 'border-[#EDEDED] bg-white';
                return (
                  <li key={rep.id} className={`rounded-xl border ${tone} p-3.5`}>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="pulse-eyebrow text-[#737373] inline-flex items-center gap-1.5">
                        {rep.channel === 'email' && <Mail size={10} strokeWidth={2.2} />}
                        {channelLabel}
                        {rep.status === 'failed' && (
                          <span className="text-[#991B1B]">
                            · {isTr ? 'iletilemedi' : 'failed'}
                          </span>
                        )}
                      </span>
                      <span className="pulse-eyebrow text-[#A3A3A3] tabular-nums">
                        {timeAgo(rep.createdAt, locale)}
                      </span>
                    </div>
                    <p className="text-[13px] leading-[1.55] text-[#0A0A0A] whitespace-pre-line">
                      {rep.body}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {sentLoading && sentReplies.length === 0 && (
          <div className="mt-6 flex items-center gap-2 text-[12px] text-[#737373]">
            <Loader2 size={12} className="animate-spin" />
            {isTr ? 'Yanıtlar yükleniyor…' : 'Loading replies…'}
          </div>
        )}

        {/* High-rating reply gate (4-5★) */}
        {active.rating >= 4 ? (
          <div className="mt-6">
            <AlertBanner
              kind="lime"
              icon={<Sparkles size={14} className="text-[#0A0A0A] mt-1" strokeWidth={2} />}
            >
              <span className="block font-semibold text-[#0A0A0A]">
                {isTr ? 'Yanıt yazmaya gerek yok' : 'No reply needed'}
              </span>
              <span className="block mt-0.5 text-[#525252]">
                {isTr
                  ? `Yüksek puanlı yorum ${(active.platform || 'platform').toUpperCase()} üzerinden alındı; müşteri zaten platformda paylaşımını yaptı. İsterseniz İşaretle aksiyonuyla bu yorumu ekibinizle takip edebilirsiniz.`
                  : `High-rating review came in via ${(active.platform || 'platform').toUpperCase()}; the customer already posted on the platform. You can still flag this review to keep track with your team.`}
              </span>
            </AlertBanner>
          </div>
        ) : active.isReplied ? (
          /* Yanıtlanmış düşük puanlı yorumlar — AI yeniden öneri üretmesin
             (kullanıcı şikayeti: "AI iki defa cevap üretiyor"). Sent thread
             zaten yukarıda görünür; tekrar yanıt isterse "Yeni yanıt yaz"
             butonu ile manuel açar. */
          <div className="mt-6">
            <AlertBanner
              kind="info"
              icon={<Sparkles size={14} className="text-[#0A0A0A] mt-1" strokeWidth={2} />}
            >
              <span className="block font-semibold text-[#0A0A0A]">
                {isTr ? 'Yanıtlandı' : 'Replied'}
              </span>
              <span className="block mt-0.5 text-[#525252]">
                {isTr
                  ? 'Bu yoruma daha önce yanıt verildi. Yukarıdaki gönderilen yanıtı görebilirsin.'
                  : 'This review has already been replied to. See the sent reply above.'}
              </span>
            </AlertBanner>
          </div>
        ) : (
          <div className="mt-6">
            <FeedbackReplyComposer
              feedback={active}
              locale={locale}
              aiLoading={props.aiLoading}
              aiRegenerating={props.aiRegenerating}
              aiSuggestion={props.aiSuggestion}
              aiSource={props.aiSource}
              aiFromBackground={props.aiFromBackground}
              aiTone={props.aiTone}
              setAiTone={props.setAiTone}
              onRegenerateAi={props.onRegenerateAi}
              onUseAiAndSend={props.onUseAiAndSend}
              onCopyAiToDraft={props.onCopyAiToDraft}
              replyDraft={props.replyDraft}
              setReplyDraft={props.setReplyDraft}
              sendEmail={props.sendEmail}
              setSendEmail={props.setSendEmail}
              sendingReply={props.sendingReply}
              onSendReply={props.onSendReply}
              replyNotice={props.replyNotice}
            />
          </div>
        )}
      </div>
    </section>
  );
}

export default FeedbackDetail;
