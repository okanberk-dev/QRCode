'use client';

import { ArrowLeft, Bookmark, Check, Flag, Loader2, Mail, MessageSquare, QrCode, Sparkles } from 'lucide-react';
import { AlertBanner, PlatformChip } from '@/components/ui';
import { SkBox } from '@/components/ui/skeletons/PageSkeleton';
import type { Locale } from '@/lib/translations';
import { RatingBadge } from '@/components/dashboard/feedbacks/RatingBadge';
import { FeedbackStatusChips } from '@/components/dashboard/feedbacks/FeedbackStatusChips';
import type { AiSource, AiTone, FeedbackRow, ReplyTone, SentReply } from './types';
import {
  formatDateTime,
  formatStamp,
  platformIconId,
  platformLabel,
  timeAgoLabel,
} from './utils';
import { PulseAiSuggestionCard, ReplyComposerCard, focusReplyTextarea } from './FeedbackReplyComposer';
import { AiSummaryCard } from './AiSummaryCard';

interface FeedbackDetailProps {
  feedback: FeedbackRow;
  locale: Locale;

  /** Mobile push-route geri butonu (yalnız mobil görünümde göster). */
  showBackButton: boolean;
  /**
   * Show the business name in the header. Off when the inbox is scoped to a
   * single business — the business switcher already names it.
   */
  showBusiness?: boolean;
  onBack: () => void;

  /** Flag toggle */
  onFlag: () => void;
  /** Stage 13 (§38.83) — Beklemede toggle (optimistic + revert in the page). */
  onTogglePending: () => void;

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
  /** Admin master flag `pulseAiEnabled=false` (API 403 `pulse_ai_disabled_by_admin`). */
  aiDisabledByAdmin?: boolean;
  onRegenerateAi: (tone?: AiTone) => void;
  onUseAiAndSend: () => void;
  onCopyAiToDraft: () => void;

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

/** Detail-pane placeholder while the list loads (rating box, title, comment). */
export function FeedbackDetailSkeleton() {
  return (
    <div className="px-5 py-5 sm:px-8 sm:py-6" aria-hidden="true">
      <div className="flex items-start gap-4">
        <SkBox className="h-12 w-12 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-2 pt-1">
          <SkBox className="h-6 w-48 max-w-full" />
          <SkBox className="h-4 w-64 max-w-full" />
          <SkBox className="h-3 w-36" />
        </div>
      </div>
      <SkBox className="mt-5 h-24 w-full rounded-2xl" />
      <SkBox className="mt-5 h-32 w-full rounded-2xl" />
    </div>
  );
}

export function FeedbackDetail(props: FeedbackDetailProps) {
  const {
    feedback: active,
    locale,
    showBackButton,
    showBusiness = true,
    onBack,
    onFlag,
    onTogglePending,
    sentReplies,
    sentLoading,
  } = props;
  const isTr = locale === 'tr';
  const titleId = `feedback-detail-title-${active.id}`;
  const pLabel = platformLabel(active.platform, isTr);
  const iconId = platformIconId(active.platform);
  const isPending = active.isPending === true;
  const isFlagged = active.isFlagged === true;

  // A failed e-mail still creates a reply row (isReplied = true). Keep the
  // composer available so "Yeniden dene" can refill and resend.
  const lastReplyFailed =
    sentReplies.length > 0 && sentReplies[sentReplies.length - 1]?.status === 'failed';
  const isHigh = active.rating >= 4;
  const canReply = !isHigh && (!active.isReplied || lastReplyFailed);
  const showAiCard = !isHigh && !active.isReplied;

  const aspects = [
    { key: 'food', label: isTr ? 'Yemek' : 'Food', value: active.foodRating },
    { key: 'service', label: isTr ? 'Servis' : 'Service', value: active.serviceRating },
    { key: 'atmosphere', label: isTr ? 'Atmosfer' : 'Atmosphere', value: active.atmosphereRating },
  ].filter((a): a is { key: string; label: string; value: number } => typeof a.value === 'number');

  const pendingLabel = isTr
    ? isPending
      ? 'Beklemeden çıkar'
      : 'Beklemeye al'
    : isPending
      ? 'Remove from pending'
      : 'Mark pending';
  const flagLabel = isTr
    ? isFlagged
      ? 'İşareti kaldır'
      : 'İşaretle'
    : isFlagged
      ? 'Unflag'
      : 'Flag';

  return (
    <section
      className="flex flex-col bg-white lg:min-h-0 lg:flex-1"
      role="region"
      aria-labelledby={titleId}
    >
      {/* Mobile sticky back bar — under the 61px shell topbar. */}
      {showBackButton && (
        <div className="sticky top-[61px] z-10 flex items-center justify-between gap-2 border-b border-[#EDEDED] bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={onBack}
            className="bz-btn bz-btn-sm max-sm:min-h-[44px]"
            aria-label={isTr ? 'Yorumlar listesine dön' : 'Back to reviews'}
          >
            <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
            {isTr ? 'Yorumlar' : 'Reviews'}
          </button>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onTogglePending}
              className={`${isPending ? 'bz-btn-warn' : 'bz-btn'} bz-btn-sm max-sm:min-h-[44px] max-sm:min-w-[44px]`}
              aria-pressed={isPending}
              aria-label={pendingLabel}
              title={pendingLabel}
            >
              <Bookmark
                size={14}
                strokeWidth={2}
                fill={isPending ? '#92400E' : 'none'}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">{pendingLabel}</span>
            </button>
            <button
              type="button"
              onClick={onFlag}
              className={`${isFlagged ? 'bz-btn-danger' : 'bz-btn'} bz-btn-sm max-sm:min-h-[44px] max-sm:min-w-[44px]`}
              aria-pressed={isFlagged}
              aria-label={flagLabel}
              title={flagLabel}
            >
              <Flag size={14} strokeWidth={2} fill={isFlagged ? 'currentColor' : 'none'} aria-hidden="true" />
              <span className="hidden sm:inline">{flagLabel}</span>
            </button>
          </div>
        </div>
      )}

      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        <div className="px-5 py-5 sm:px-8 sm:py-6 lg:pb-8">
          {/* Header. The badge + text block keeps at least 260px; when the
              pane is narrower than that plus the desktop actions (lg–xl, ~340px
              detail pane at 1024), the actions wrap onto their own line
              instead of squeezing the name into a one-letter column. */}
          <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
            <div className="flex min-w-0 flex-[1_1_260px] items-start gap-4">
              <RatingBadge rating={active.rating} isTr={isTr} size="lg" />
              <div className="min-w-0 flex-1">
                <h2
                  id={titleId}
                  tabIndex={-1}
                  className="bz-h-tight break-words text-[20px] text-[#0A0A0A] outline-none sm:text-[22px]"
                >
                  {active.customerName || (isTr ? 'Anonim müşteri' : 'Anonymous customer')}
                </h2>
                <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-[#525252]">
                  <span className="inline-flex items-center gap-1.5">
                    {iconId ? (
                      <span aria-hidden="true" className="inline-flex">
                        <PlatformChip id={iconId} size={16} />
                      </span>
                    ) : (
                      <QrCode size={14} strokeWidth={2} aria-hidden="true" />
                    )}
                    {pLabel}
                  </span>
                  {showBusiness && active.restaurant?.name && (
                    <>
                      <span aria-hidden="true" className="text-[#D4D4D4]">
                        ·
                      </span>
                      <span className="min-w-0 break-words">{active.restaurant.name}</span>
                    </>
                  )}
                  <span aria-hidden="true" className="text-[#D4D4D4]">
                    ·
                  </span>
                  <time dateTime={active.createdAt} title={formatDateTime(active.createdAt, locale)}>
                    {timeAgoLabel(active.createdAt, locale)}
                  </time>
                </p>
                {/* §38.237 / §46 — exact stamp in the business timezone. */}
                <p className="mt-0.5 text-[12px] tabular-nums text-[#737373]">
                  <time dateTime={active.createdAt}>{formatDateTime(active.createdAt, locale)}</time>
                </p>
                {/* Status chips. The rating itself is the badge on the left
                    (it has a spoken "N / 5" label), so no second star strip. */}
                <FeedbackStatusChips feedback={active} isTr={isTr} className="mt-2" />
              </div>
            </div>
            {/* Desktop actions (mobile copies live in the sticky back bar). */}
            <div className="hidden shrink-0 flex-wrap justify-end gap-1.5 lg:flex">
              <button
                type="button"
                onClick={onTogglePending}
                className={`${isPending ? 'bz-btn-warn' : 'bz-btn'} bz-btn-sm`}
                aria-pressed={isPending}
              >
                <Bookmark
                  size={12}
                  strokeWidth={2}
                  fill={isPending ? '#92400E' : 'none'}
                  aria-hidden="true"
                />
                {pendingLabel}
              </button>
              <button
                type="button"
                onClick={onFlag}
                className={`${isFlagged ? 'bz-btn-danger' : 'bz-btn'} bz-btn-sm`}
                aria-pressed={isFlagged}
              >
                <Flag size={12} strokeWidth={2} fill={isFlagged ? 'currentColor' : 'none'} aria-hidden="true" />
                {flagLabel}
              </button>
            </div>
          </div>

          {/* Comment */}
          {active.comment ? (
            <blockquote className="mt-5 whitespace-pre-line break-words rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] px-5 py-4 text-[15px] leading-[1.7] text-[#0A0A0A]">
              {active.comment}
            </blockquote>
          ) : (
            <p className="mt-5 text-[14px] italic text-[#737373]">
              {isTr
                ? 'Müşteri yorum yazmadı, yalnızca puan verdi.'
                : 'The customer left a rating without a comment.'}
            </p>
          )}

          {/* §38.53 — AI özet (fallback / kısa yorumda kart gizlenir). */}
          {active.comment && active.comment.trim().length >= 10 && (
            <div className="mt-3">
              <AiSummaryCard
                key={active.id}
                feedbackId={active.id}
                isTr={isTr}
                locale={isTr ? 'tr' : 'en'}
              />
            </div>
          )}

          {/* Aspect ratings the customer gave on the public form. */}
          {aspects.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-1.5" aria-label={isTr ? 'Detaylı puanlar' : 'Detailed ratings'}>
              {aspects.map((a) => (
                <li
                  key={a.key}
                  className="rounded-full bg-[#F5F5F5] px-2.5 py-1 text-[12px] text-[#0A0A0A]"
                >
                  {a.label} {a.value}/5
                </li>
              ))}
            </ul>
          )}

          {/* Sent reply thread */}
          {sentReplies.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 flex items-center gap-2">
                <MessageSquare size={13} className="text-[#525252]" strokeWidth={2} aria-hidden="true" />
                <span className="text-[12px] font-semibold text-[#525252]">
                  {isTr
                    ? `Gönderilen yanıtlar (${sentReplies.length})`
                    : `Sent replies (${sentReplies.length})`}
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
                        ? 'Dahili kayıt'
                        : 'Internal note';
                  const tone =
                    rep.status === 'failed'
                      ? 'border-[#FCA5A5] bg-[#FFFBFB]'
                      : 'border-[#EDEDED] bg-white';
                  return (
                    <li key={rep.id} className={`rounded-xl border ${tone} p-3.5`}>
                      <div className="mb-1.5 flex items-center justify-between gap-2 text-[12px]">
                        <span className="inline-flex items-center gap-1.5 font-medium text-[#525252]">
                          {rep.channel === 'email' && <Mail size={11} strokeWidth={2.2} aria-hidden="true" />}
                          {channelLabel}
                          {rep.status === 'failed' && (
                            <span className="text-[#991B1B]">· {isTr ? 'iletilemedi' : 'failed'}</span>
                          )}
                        </span>
                        <time
                          dateTime={rep.createdAt}
                          className="tabular-nums text-[#A3A3A3]"
                          title={formatDateTime(rep.createdAt, locale)}
                        >
                          {formatStamp(rep.createdAt, locale)}
                        </time>
                      </div>
                      <p className="whitespace-pre-line break-words text-[13px] leading-[1.55] text-[#0A0A0A]">
                        {rep.body}
                      </p>
                      {rep.status === 'failed' && (
                        <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-1.5 text-[12px] text-[#991B1B]">
                          <span>
                            {isTr
                              ? 'Bu yanıt iletilemedi. Düzenleyip yeniden göndermek ister misiniz?'
                              : 'This reply could not be sent. Edit and re-send?'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              props.setReplyDraft(rep.body);
                              focusReplyTextarea();
                            }}
                            className="bz-btn-primary bz-btn-sm shrink-0"
                          >
                            {isTr ? 'Yeniden dene' : 'Retry'}
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {/* Only reviews that have a reply can have a thread to load (a
              failed send also sets isReplied), so no loader flash otherwise. */}
          {sentLoading && sentReplies.length === 0 && active.isReplied && (
            <div className="mt-6 flex items-center gap-2 text-[12px] text-[#737373]">
              <Loader2 size={12} className="animate-spin" aria-hidden="true" />
              {isTr ? 'Yanıtlar yükleniyor…' : 'Loading replies…'}
            </div>
          )}

          {/* Pulse AI suggestion (low rating, not replied) or a gate. */}
          {showAiCard ? (
            <PulseAiSuggestionCard
              feedback={active}
              locale={locale}
              aiLoading={props.aiLoading}
              aiRegenerating={props.aiRegenerating}
              aiSuggestion={props.aiSuggestion}
              aiSource={props.aiSource}
              aiFromBackground={props.aiFromBackground}
              aiTone={props.aiTone}
              setAiTone={props.setAiTone}
              aiDisabledByAdmin={props.aiDisabledByAdmin}
              onRegenerateAi={props.onRegenerateAi}
              onUseAiAndSend={props.onUseAiAndSend}
              onCopyAiToDraft={props.onCopyAiToDraft}
              confirmResponsibility={props.confirmResponsibility}
              sendingReply={props.sendingReply}
            />
          ) : isHigh ? (
            <div className="mt-6">
              <AlertBanner
                kind="lime"
                icon={<Sparkles size={14} className="mt-1 text-[#0A0A0A]" strokeWidth={2} />}
              >
                <span className="block text-[#525252]">
                  <strong className="font-semibold text-[#0A0A0A]">
                    {isTr ? 'Yanıt gerekmiyor.' : 'No reply needed.'}
                  </strong>{' '}
                  {active.platform
                    ? isTr
                      ? `Bu ${pLabel} yorumu yüksek puanlı; müşteri paylaşımını platformda yaptı. Takip etmek isterseniz yorumu işaretleyebilirsiniz.`
                      : `This ${pLabel} review is high-rated and the customer already posted it on the platform. You can still flag it to follow up.`
                    : isTr
                      ? 'Yüksek puanlı bir Buaze QR yorumu. Takip etmek isterseniz işaretleyebilirsiniz.'
                      : 'This is a high-rated Buaze QR review. You can still flag it to follow up.'}
                </span>
              </AlertBanner>
            </div>
          ) : !lastReplyFailed ? (
            // Right after a successful send the composer unmounts (the review
            // is now replied), so its status line would vanish with it — the
            // gate carries the confirmation instead.
            <div className="mt-6">
              <AlertBanner
                kind={props.replyNotice?.tone === 'success' ? 'success' : 'info'}
                icon={<Check size={14} className="mt-1 text-[#0A0A0A]" strokeWidth={2.2} />}
              >
                <span className="block text-[#525252]">
                  <strong className="font-semibold text-[#0A0A0A]">
                    {props.replyNotice?.tone === 'success'
                      ? props.replyNotice.msg + '.'
                      : isTr
                        ? 'Yanıtlandı.'
                        : 'Replied.'}
                  </strong>{' '}
                  {isTr
                    ? 'Gönderilen yanıtı yukarıda görebilirsiniz.'
                    : 'You can see the sent reply above.'}
                </span>
              </AlertBanner>
            </div>
          ) : null}

          {/* The old "Zaman çizelgesi" block is gone: it only repeated the
              received time + platform (header) and each sent reply (thread
              above). */}
        </div>
      </div>

      {/* Reply composer — docked on lg, OUTSIDE the scroll area so it can
          never cover the body (the old `lg:sticky` card slid over the AI
          card). Inline at the end of the body on mobile.
          lg sizing: a column flex box capped at 48% of the pane, with a
          floor so the whole composer (label → Send) fits even on 720–768px
          tall screens with the trial banner, and a little more room while
          the owner is typing. Only the textarea shrinks (ReplyComposerCard),
          so a long draft scrolls inside the textarea and Send never drops
          out of view; the dock itself only scrolls as a last resort. */}
      {canReply && (
        <div className="border-t border-[#EDEDED] bg-white px-5 py-4 sm:px-8 lg:flex lg:max-h-[max(48%,232px)] lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:py-3 lg:focus-within:max-h-[max(48%,264px)]">
          <ReplyComposerCard
            feedback={active}
            locale={locale}
            replyDraft={props.replyDraft}
            setReplyDraft={props.setReplyDraft}
            sendEmail={props.sendEmail}
            setSendEmail={props.setSendEmail}
            confirmResponsibility={props.confirmResponsibility}
            setConfirmResponsibility={props.setConfirmResponsibility}
            sendingReply={props.sendingReply}
            onSendReply={props.onSendReply}
            replyNotice={props.replyNotice}
          />
        </div>
      )}
    </section>
  );
}

export default FeedbackDetail;
