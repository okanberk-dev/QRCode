'use client';

import { useLayoutEffect, useRef } from 'react';

import { hasReplyChannel, redirectBadgeLabel } from '@/lib/feedback-metrics';
import { ArrowLeft, Bookmark, Check, Flag, Loader2, Mail, MailX, MessageSquare, QrCode, Sparkles } from 'lucide-react';
import { PlatformChip } from '@/components/ui';
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
  /** Composer header "AI taslağı": existing draft → reply box, else write one. */
  onAiDraftToReply?: () => void;
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

/** Fintora pills inside the white detail card (grey idle, soft tint when on). */
const PILL_IDLE = 'bz-btn bg-[#F6F6F6] hover:bg-[#EDEDED]';
const PILL_PENDING_ON = 'bz-btn bg-[#FFF4D6] text-[#8A5A00] hover:bg-[#FFEDBF]';
const PILL_FLAG_ON = 'bz-btn bg-[#FDECEC] text-[#D92D20] hover:bg-[#FBDADA]';

/** Detail-pane placeholder while the list loads (rating box, title, comment). */
export function FeedbackDetailSkeleton() {
  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-7" aria-hidden="true">
      <div className="flex items-start gap-4">
        <SkBox className="h-12 w-12 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2 pt-1">
          <SkBox className="h-6 w-48 max-w-full" />
          <SkBox className="h-4 w-64 max-w-full" />
          <SkBox className="h-3 w-36" />
        </div>
      </div>
      <SkBox className="mt-5 h-24 w-full rounded-[20px]" />
      <SkBox className="mt-5 h-32 w-full rounded-[20px]" />
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
  // Another review → both scroll areas start at the top. Without this the
  // new review opened wherever the last one had been scrolled to.
  const bodyRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    if (dockRef.current) dockRef.current.scrollTop = 0;
  }, [active.id]);
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
  // Replies go out by e-mail only (§58): without a customer e-mail there is
  // no composer, no AI draft and no "needs reply" — a short note instead.
  const hasEmail = hasReplyChannel(active.customerEmail);
  const canReply = !isHigh && hasEmail && (!active.isReplied || lastReplyFailed);
  const showAiCard = !isHigh && hasEmail && !active.isReplied;
  const noReplyChannel = !isHigh && !hasEmail && !active.isReplied;

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
      className="flex flex-col bg-white sm:rounded-[28px] lg:min-h-0 lg:flex-1"
      role="region"
      aria-labelledby={titleId}
    >
      {/* Mobile sticky back bar — under the 72px shell bar. */}
      {showBackButton && (
        <div className="sticky top-[72px] z-10 flex items-center justify-between gap-2 bg-white/95 px-4 py-2.5 backdrop-blur sm:rounded-t-[28px] sm:px-6 lg:hidden">
          <button
            type="button"
            onClick={onBack}
            className={PILL_IDLE}
            aria-label={isTr ? 'Yorumlar listesine dön' : 'Back to reviews'}
          >
            <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
            {isTr ? 'Yorumlar' : 'Reviews'}
          </button>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onTogglePending}
              className={`${isPending ? PILL_PENDING_ON : PILL_IDLE} max-sm:w-11 max-sm:px-0`}
              aria-pressed={isPending}
              aria-label={pendingLabel}
              title={pendingLabel}
            >
              <Bookmark
                size={16}
                strokeWidth={2}
                fill={isPending ? 'currentColor' : 'none'}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">{pendingLabel}</span>
            </button>
            <button
              type="button"
              onClick={onFlag}
              className={`${isFlagged ? PILL_FLAG_ON : PILL_IDLE} max-sm:w-11 max-sm:px-0`}
              aria-pressed={isFlagged}
              aria-label={flagLabel}
              title={flagLabel}
            >
              <Flag size={16} strokeWidth={2} fill={isFlagged ? 'currentColor' : 'none'} aria-hidden="true" />
              <span className="hidden sm:inline">{flagLabel}</span>
            </button>
          </div>
        </div>
      )}

      <div ref={bodyRef} className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-7 lg:pb-8">
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
                  className="bz-h-tight break-words text-[20px] font-medium text-pn-ink outline-none"
                >
                  {active.customerName || (isTr ? 'İsimsiz' : 'Unnamed')}
                </h2>
                <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-[#737373]">
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
                <p className="mt-0.5 text-[13px] tabular-nums text-[#9A9A9A]">
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
                className={`${isPending ? PILL_PENDING_ON : PILL_IDLE} min-h-10 px-4 text-[13px]`}
                aria-pressed={isPending}
              >
                <Bookmark
                  size={14}
                  strokeWidth={2}
                  fill={isPending ? 'currentColor' : 'none'}
                  aria-hidden="true"
                />
                {pendingLabel}
              </button>
              <button
                type="button"
                onClick={onFlag}
                className={`${isFlagged ? PILL_FLAG_ON : PILL_IDLE} min-h-10 px-4 text-[13px]`}
                aria-pressed={isFlagged}
              >
                <Flag size={14} strokeWidth={2} fill={isFlagged ? 'currentColor' : 'none'} aria-hidden="true" />
                {flagLabel}
              </button>
            </div>
          </div>

          {/* Comment */}
          {active.comment ? (
            <blockquote className="mt-5 whitespace-pre-line break-words rounded-[20px] bg-[#F6F6F6] px-5 py-4 text-[15px] leading-[1.7] text-pn-ink">
              {active.comment}
            </blockquote>
          ) : active.redirected ? (
            <div className="mt-5 rounded-[20px] bg-[#F6F6F6] px-5 py-4 text-[14px] leading-[1.6] text-[#525252]">
              <span className="mb-2 inline-flex items-center rounded-full bg-pn-accent-soft px-2.5 py-0.5 text-[12px] font-medium text-pn-accent">
                {redirectBadgeLabel(active.platform, isTr)}
              </span>
              <p>
                {isTr
                  ? 'Bu bir yorum değil, yönlendirme kaydı: müşteri puan verdi ve platformun yorum sayfası açıldı. Yazdığı yorum (yazdıysa) o platformda görünür.'
                  : 'This is a redirect record, not a review: the customer rated and the platform review page opened. Any review they wrote appears on that platform.'}
              </p>
            </div>
          ) : (
            <p className="mt-5 rounded-[20px] bg-[#F6F6F6] px-5 py-4 text-[14px] text-[#737373]">
              {isTr
                ? 'Müşteri metin yazmadı, yalnızca puan verdi.'
                : 'The customer left a rating without text.'}
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
                  className="rounded-full bg-[#F6F6F6] px-3 py-1 text-[13px] text-pn-ink"
                >
                  {a.label} {a.value}/5
                </li>
              ))}
            </ul>
          )}

          {/* Sent reply thread */}
          {sentReplies.length > 0 && (
            <div className="mt-6">
              <div className="mb-2.5 flex items-center gap-2">
                <MessageSquare size={14} className="text-[#737373]" strokeWidth={2} aria-hidden="true" />
                <span className="text-[13px] font-medium text-pn-ink">
                  {isTr
                    ? `Gönderilen yanıtlar (${sentReplies.length})`
                    : `Sent replies (${sentReplies.length})`}
                </span>
              </div>
              <ol className="flex flex-col gap-2">
                {sentReplies.map((rep) => {
                  const channelLabel =
                    rep.channel === 'email'
                      ? isTr
                        ? 'E-posta'
                        : 'Email'
                      : isTr
                        ? 'Dahili kayıt'
                        : 'Internal note';
                  const tone = rep.status === 'failed' ? 'bg-[#FDECEC]' : 'bg-[#F6F6F6]';
                  return (
                    <li key={rep.id} className={`rounded-[16px] ${tone} p-3`}>
                      <div className="mb-2 flex items-center justify-between gap-2 text-[13px]">
                        <span className="inline-flex items-center gap-2 font-medium text-pn-ink">
                          <span
                            aria-hidden="true"
                            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                              rep.channel === 'email' ? 'bg-pn-accent text-white' : 'bg-white text-pn-ink'
                            }`}
                          >
                            {rep.channel === 'email' ? (
                              <Mail size={14} strokeWidth={2} />
                            ) : (
                              <MessageSquare size={14} strokeWidth={2} />
                            )}
                          </span>
                          {channelLabel}
                          {rep.status === 'failed' && (
                            <span className="font-normal text-[#D92D20]">· {isTr ? 'iletilemedi' : 'failed'}</span>
                          )}
                        </span>
                        <time
                          dateTime={rep.createdAt}
                          className="text-[12px] tabular-nums text-[#9A9A9A]"
                          title={formatDateTime(rep.createdAt, locale)}
                        >
                          {formatStamp(rep.createdAt, locale)}
                        </time>
                      </div>
                      <p className="whitespace-pre-line break-words pl-10 text-[14px] leading-[1.6] text-[#525252]">
                        {rep.body}
                      </p>
                      {rep.status === 'failed' && (
                        <div className="mt-2.5 flex items-center justify-between gap-2 rounded-[14px] bg-white px-3 py-2 text-[13px] text-[#D92D20]">
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
                            className="bz-btn-primary min-h-10 shrink-0 px-4 text-[13px]"
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
            <div className="mt-6 flex items-center gap-2 text-[13px] text-[#9A9A9A]">
              <Loader2 size={12} className="animate-spin" aria-hidden="true" />
              {isTr ? 'Yanıtlar yükleniyor…' : 'Loading replies…'}
            </div>
          )}

          {/* Pulse AI suggestion (low rating, not replied) or a gate. */}
          {showAiCard ? (
            // Shown once there is something to show: a saved or new draft, a
            // draft being written, or the "turned off" note. With no draft
            // the composer's "AI taslağı" button is the way in.
            (props.aiSuggestion || props.aiLoading || props.aiRegenerating || props.aiDisabledByAdmin) && (
            <PulseAiSuggestionCard
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
            )
          ) : isHigh ? (
            <div role="note" className="mt-6 flex items-start gap-3 rounded-[20px] bg-pn-accent-soft p-4">
              <span
                aria-hidden="true"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pn-accent text-white"
              >
                <Sparkles size={16} strokeWidth={2} />
              </span>
              <p className="min-w-0 pt-0.5 text-[14px] leading-[1.55] text-[#525252]">
                <strong className="block font-medium text-pn-ink">
                  {isTr ? 'Yanıt gerekmiyor.' : 'No reply needed.'}
                </strong>
                {active.platform
                  ? isTr
                    ? `Yüksek puanlı geri bildirim; müşteriye ${pLabel} yorum sayfası açıldı. Takip etmek isterseniz işaretleyebilirsiniz.`
                    : `High-rated feedback; the customer was shown the ${pLabel} review page. You can still flag it to follow up.`
                  : isTr
                    ? 'Yüksek puanlı bir QR geri bildirimi. Takip etmek isterseniz işaretleyebilirsiniz.'
                    : 'This is high-rated QR feedback. You can still flag it to follow up.'}
              </p>
            </div>
          ) : noReplyChannel ? (
            <div role="note" className="mt-6 flex items-start gap-3 rounded-[20px] bg-[#F6F6F6] p-4">
              <span
                aria-hidden="true"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-pn-ink"
              >
                <MailX size={16} strokeWidth={2} />
              </span>
              <p className="min-w-0 pt-0.5 text-[14px] leading-[1.55] text-[#525252]">
                <strong className="block font-medium text-pn-ink">
                  {isTr ? 'Müşteri e-posta bırakmadı.' : 'No customer e-mail.'}
                </strong>
                {isTr
                  ? 'Yanıtlar e-postayla gittiği için bu geri bildirime buradan yanıt gönderilemez. Takip etmek isterseniz işaretleyebilir ya da beklemeye alabilirsiniz.'
                  : 'Replies go out by e-mail, so this feedback cannot be answered from here. You can flag it or mark it pending to follow up.'}
                {active.customerPhone && (
                  <>
                    {' '}
                    {isTr ? 'Müşterinin bıraktığı telefon:' : 'Phone the customer left:'}{' '}
                    <a
                      href={`tel:${active.customerPhone.replace(/[^\d+]/g, '')}`}
                      className="font-medium text-pn-ink underline-offset-2 hover:underline"
                    >
                      {active.customerPhone}
                    </a>
                    .
                  </>
                )}
              </p>
            </div>
          ) : !lastReplyFailed ? (
            // Right after a successful send the composer unmounts (the review
            // is now replied), so its status line would vanish with it — the
            // gate carries the confirmation instead.
            <div
              role="alert"
              className={`mt-6 flex items-start gap-3 rounded-[20px] p-4 ${
                props.replyNotice?.tone === 'success' ? 'bg-[#E6F7EA]' : 'bg-[#F6F6F6]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  props.replyNotice?.tone === 'success' ? 'bg-[#23863A] text-white' : 'bg-white text-pn-ink'
                }`}
              >
                <Check size={16} strokeWidth={2.2} />
              </span>
              <p className="min-w-0 pt-0.5 text-[14px] leading-[1.55] text-[#525252]">
                <strong className="block font-medium text-pn-ink">
                  {props.replyNotice?.tone === 'success'
                    ? props.replyNotice.msg + '.'
                    : isTr
                      ? 'Yanıtlandı.'
                      : 'Replied.'}
                </strong>
                {isTr
                  ? 'Gönderilen yanıtı yukarıda görebilirsiniz.'
                  : 'You can see the sent reply above.'}
              </p>
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
        <div ref={dockRef} className="bg-white px-4 pb-[calc(20px+env(safe-area-inset-bottom,0px))] pt-2 sm:rounded-b-[28px] sm:px-6 lg:flex lg:max-h-[max(48%,240px)] lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:border-t lg:border-pn-line lg:px-7 lg:pb-4 lg:pt-3 lg:focus-within:max-h-[max(48%,272px)]">
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
            onAiDraft={showAiCard && !props.aiDisabledByAdmin ? props.onAiDraftToReply : undefined}
            aiBusy={props.aiLoading || props.aiRegenerating}
            hasAiDraft={Boolean(props.aiSuggestion)}
          />
        </div>
      )}
    </section>
  );
}

export default FeedbackDetail;
