'use client';

import { ArrowLeft, Check, Flag, Loader2, Mail, MessageSquare, QrCode, Sparkles, UserPlus } from 'lucide-react';
import { PlatformChip } from '@/components/ui';
import { SkBox } from '@/components/ui/skeletons/PageSkeleton';
import { RatingBadge } from '@/components/dashboard/feedbacks/RatingBadge';
import { FeedbackStatusChips } from '@/components/dashboard/feedbacks/FeedbackStatusChips';
import type { AiSource, AiTone, FeedbackRow, ReplyTone, SentReply } from './types';
import { formatDateTime, formatStamp, platformIconId, platformLabel, timeAgoLabel } from './utils';
import {
  ADMIN_REPLY_TEXTAREA_ID,
  AdminPulseAiCard,
  AdminReplyComposerCard,
} from './AdminFeedbackReplyComposer';

interface AdminFeedbackDetailProps {
  feedback: FeedbackRow;
  isTr: boolean;
  locale: string;

  /** Mobile push-route back bar (only on the mobile detail view). */
  showBackButton: boolean;
  onBack: () => void;

  // Single-feedback actions
  flagging: boolean;
  onFlag: () => void;
  assigning: boolean;
  onAssign: () => void;

  // AI + composer
  suggesting: boolean;
  aiSource: AiSource;
  aiTone: AiTone;
  setAiTone: (v: AiTone) => void;
  onSuggest: (tone?: AiTone) => void;

  draft: string;
  setDraft: (v: string) => void;
  sendEmail: boolean;
  setSendEmail: (v: boolean) => void;
  confirmResponsibility: boolean;
  setConfirmResponsibility: (v: boolean) => void;
  sending: boolean;
  onSend: () => void;
  notice: { msg: string; tone: ReplyTone } | null;

  // §38.237 — sent replies thread (what the business wrote to the customer,
  // the channel and the delivery state).
  sentReplies: SentReply[];
  sentLoading: boolean;
}

/** Detail-pane placeholder while the list loads (rating box, title, comment). */
export function AdminFeedbackDetailSkeleton() {
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

export function AdminFeedbackDetail(props: AdminFeedbackDetailProps) {
  const {
    feedback: active,
    isTr,
    showBackButton,
    onBack,
    flagging,
    onFlag,
    assigning,
    onAssign,
    sentReplies,
    sentLoading,
  } = props;

  const titleId = `feedback-detail-title-${active.id}`;
  const pLabel = platformLabel(active.platform, isTr);
  const iconId = platformIconId(active.platform);
  const isFlagged = active.isFlagged === true;
  const isAssigned = active.isAssigned === true;
  const isHigh = active.rating >= 4;
  // A failed e-mail still stores the reply (the review counts as replied),
  // so the composer stays open after a failed last send for a retry
  // (owner inbox parity).
  const lastReplyFailed =
    sentReplies.length > 0 && sentReplies[sentReplies.length - 1]?.status === 'failed';
  const canReply = !isHigh && (!active.isReplied || lastReplyFailed);
  const showAiCard = !isHigh && !active.isReplied;

  const flagLabel = isTr
    ? isFlagged
      ? 'İşareti kaldır'
      : 'İşaretle'
    : isFlagged
      ? 'Unflag'
      : 'Flag';
  const assignLabel = isTr ? (isAssigned ? 'Atandı' : 'Ata') : isAssigned ? 'Assigned' : 'Assign';

  const flagButton = (compact: boolean) => (
    <button
      type="button"
      onClick={onFlag}
      disabled={flagging}
      className={`bz-btn disabled:opacity-50 ${
        isFlagged ? 'bg-[#FDECEC] text-[#D92D20] hover:bg-[#FBDADA]' : 'bg-[#F6F6F6] hover:bg-[#EDEDED]'
      } ${compact ? 'max-sm:w-11 max-sm:px-0' : 'min-h-10 px-4 text-[13px]'}`}
      aria-pressed={isFlagged}
      aria-label={compact ? flagLabel : undefined}
      title={compact ? flagLabel : undefined}
    >
      {flagging ? (
        <Loader2 size={compact ? 16 : 14} className="animate-spin" aria-hidden="true" />
      ) : (
        <Flag
          size={compact ? 16 : 14}
          strokeWidth={2}
          fill={isFlagged ? 'currentColor' : 'none'}
          aria-hidden="true"
        />
      )}
      <span className={compact ? 'hidden sm:inline' : undefined}>{flagLabel}</span>
    </button>
  );

  const assignButton = (compact: boolean) => (
    <button
      type="button"
      onClick={onAssign}
      disabled={assigning}
      className={`${isAssigned ? 'bz-btn-primary' : 'bz-btn bg-[#F6F6F6] hover:bg-[#EDEDED]'} disabled:opacity-50 ${
        compact ? 'max-sm:w-11 max-sm:px-0' : 'min-h-10 px-4 text-[13px]'
      }`}
      aria-pressed={isAssigned}
      aria-label={compact ? assignLabel : undefined}
      title={compact ? assignLabel : undefined}
    >
      {assigning ? (
        <Loader2 size={compact ? 16 : 14} className="animate-spin" aria-hidden="true" />
      ) : isAssigned ? (
        <Check size={compact ? 16 : 14} strokeWidth={2.2} aria-hidden="true" />
      ) : (
        <UserPlus size={compact ? 16 : 14} strokeWidth={2} aria-hidden="true" />
      )}
      <span className={compact ? 'hidden sm:inline' : undefined}>{assignLabel}</span>
    </button>
  );

  return (
    <section
      className="flex flex-col bg-white sm:rounded-[28px] lg:min-h-0 lg:flex-1"
      role="region"
      aria-labelledby={titleId}
    >
      {/* Mobile sticky back bar — under the 61px admin mobile topbar. */}
      {showBackButton && (
        <div className="sticky top-[72px] z-10 flex items-center justify-between gap-2 bg-white/95 px-4 py-2.5 backdrop-blur sm:rounded-t-[28px] sm:px-6 lg:hidden">
          <button
            type="button"
            onClick={onBack}
            className="bz-btn bg-[#F6F6F6] hover:bg-[#EDEDED]"
            aria-label={isTr ? 'Yorumlar listesine dön' : 'Back to reviews'}
          >
            <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
            {isTr ? 'Yorumlar' : 'Reviews'}
          </button>
          <div className="flex items-center gap-1.5">
            {flagButton(true)}
            {assignButton(true)}
          </div>
        </div>
      )}

      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-7 lg:pb-8">
          {/* Header. The badge + text block keeps at least 260px; when the
              pane is narrower than that plus the desktop actions, the actions
              wrap onto their own line instead of squeezing the name. */}
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
                  {active.restaurant?.name && (
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
                  <time dateTime={active.createdAt} title={formatDateTime(active.createdAt, isTr)}>
                    {timeAgoLabel(active.createdAt, isTr)}
                  </time>
                </p>
                {/* §38.237 / §46 — exact stamp in the business timezone. */}
                <p className="mt-0.5 text-[13px] tabular-nums text-[#9A9A9A]">
                  <time dateTime={active.createdAt}>{formatDateTime(active.createdAt, isTr)}</time>
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <FeedbackStatusChips feedback={active} isTr={isTr} showAssigned />
                </div>
              </div>
            </div>
            {/* Desktop actions (mobile copies live in the sticky back bar). */}
            <div className="hidden shrink-0 flex-wrap justify-end gap-1.5 lg:flex">
              {flagButton(false)}
              {assignButton(false)}
            </div>
          </div>

          {/* Comment */}
          {active.comment ? (
            <blockquote className="mt-5 whitespace-pre-line break-words rounded-[20px] bg-[#F6F6F6] px-5 py-4 text-[15px] leading-[1.7] text-pn-ink">
              {active.comment}
            </blockquote>
          ) : (
            <p className="mt-5 rounded-[20px] bg-[#F6F6F6] px-5 py-4 text-[14px] text-[#737373]">
              {isTr
                ? 'Müşteri yorum yazmadı, yalnızca puan verdi.'
                : 'The customer left a rating without a comment.'}
            </p>
          )}

          {/* §38.237 — sent replies (`GET /api/feedback/[id]/reply`). */}
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
                  const failed = rep.status === 'failed';
                  return (
                    <li
                      key={rep.id}
                      className={`rounded-[16px] p-3 ${failed ? 'bg-[#FDECEC]' : 'bg-[#F6F6F6]'}`}
                    >
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
                          {failed && (
                            <span className="font-normal text-[#D92D20]">· {isTr ? 'iletilemedi' : 'failed'}</span>
                          )}
                        </span>
                        <time
                          dateTime={rep.createdAt}
                          className="text-[12px] tabular-nums text-[#9A9A9A]"
                          title={formatDateTime(rep.createdAt, isTr)}
                        >
                          {formatStamp(rep.createdAt, isTr)}
                        </time>
                      </div>
                      <p className="whitespace-pre-line break-words pl-10 text-[14px] leading-[1.6] text-[#525252]">
                        {rep.body}
                      </p>
                      {failed && (
                        <div className="mt-2.5 flex items-center justify-between gap-2 rounded-[14px] bg-white px-3 py-2 text-[13px] text-[#D92D20]">
                          <span>
                            {isTr
                              ? 'Bu yanıt iletilemedi. Düzenleyip yeniden göndermek ister misiniz?'
                              : 'This reply could not be sent. Edit and re-send?'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              props.setDraft(rep.body);
                              requestAnimationFrame(() =>
                                document.getElementById(ADMIN_REPLY_TEXTAREA_ID)?.focus(),
                              );
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

          {sentLoading && sentReplies.length === 0 && active.isReplied && (
            <div className="mt-6 flex items-center gap-2 text-[13px] text-[#9A9A9A]">
              <Loader2 size={12} className="animate-spin" aria-hidden="true" />
              {isTr ? 'Gönderilen yanıtlar yükleniyor…' : 'Loading sent replies…'}
            </div>
          )}

          {/* Pulse AI (low rating, not replied) or a gate. */}
          {showAiCard ? (
            <AdminPulseAiCard
              isTr={isTr}
              suggesting={props.suggesting}
              aiSource={props.aiSource}
              aiTone={props.aiTone}
              setAiTone={props.setAiTone}
              onSuggest={props.onSuggest}
            />
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
                    ? `Yüksek puanlı geri bildirim; müşteriye ${pLabel} yorum sayfası açıldı. Takip etmek isterseniz işaretleyebilir veya atayabilirsiniz.`
                    : `High-rated feedback; the customer was shown the ${pLabel} review page. You can still flag or assign it to follow up.`
                  : isTr
                    ? 'Yüksek puanlı bir QR geri bildirimi. Takip etmek isterseniz işaretleyebilir veya atayabilirsiniz.'
                    : 'This is high-rated QR feedback. You can still flag or assign it to follow up.'}
              </p>
            </div>
          ) : lastReplyFailed ? null : (
            // Right after a successful send the composer unmounts (the review
            // is now replied), so its status line would vanish with it — the
            // gate carries the confirmation instead.
            <div
              role="alert"
              className={`mt-6 flex items-start gap-3 rounded-[20px] p-4 ${
                props.notice?.tone === 'success' ? 'bg-[#E6F7EA]' : 'bg-[#F6F6F6]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  props.notice?.tone === 'success' ? 'bg-[#23863A] text-white' : 'bg-white text-pn-ink'
                }`}
              >
                <Check size={16} strokeWidth={2.2} />
              </span>
              <p className="min-w-0 pt-0.5 text-[14px] leading-[1.55] text-[#525252]">
                <strong className="block font-medium text-pn-ink">
                  {props.notice?.tone === 'success'
                    ? props.notice.msg + '.'
                    : isTr
                      ? 'Yanıtlandı.'
                      : 'Replied.'}
                </strong>
                {isTr
                  ? 'Gönderilen yanıtı yukarıda görebilirsiniz.'
                  : 'You can see the sent reply above.'}
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Reply composer — docked on lg, OUTSIDE the scroll area so it can never
          cover the body. Inline at the end of the body on mobile. Same sizing
          as the owner dock: capped at 48% of the pane with a floor so label →
          Send fits on short screens; only the textarea shrinks. */}
      {canReply && (
        <div className="bg-white px-4 pb-[calc(20px+env(safe-area-inset-bottom,0px))] pt-2 sm:rounded-b-[28px] sm:px-6 lg:flex lg:max-h-[max(48%,240px)] lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:border-t lg:border-pn-line lg:px-7 lg:pb-4 lg:pt-3 lg:focus-within:max-h-[max(48%,272px)]">
          <AdminReplyComposerCard
            feedback={active}
            isTr={isTr}
            locale={props.locale}
            draft={props.draft}
            setDraft={props.setDraft}
            sendEmail={props.sendEmail}
            setSendEmail={props.setSendEmail}
            confirmResponsibility={props.confirmResponsibility}
            setConfirmResponsibility={props.setConfirmResponsibility}
            sending={props.sending}
            onSend={props.onSend}
            notice={props.notice}
          />
        </div>
      )}
    </section>
  );
}

export default AdminFeedbackDetail;
