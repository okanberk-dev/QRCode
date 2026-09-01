'use client';

import {
  ArrowLeft,
  Check,
  Flag,
  Loader2,
  Mail,
  MessageSquareText,
  Sparkles,
  Star,
  UserPlus,
} from 'lucide-react';
import { AlertBanner, Avatar, Badge } from '@/components/ui';
import type { AiSource, AiTone, FeedbackRow, ReplyTone, SentReply } from './types';
import { formatDateTime, formatStamp, initials, timeAgo } from './utils';
import { AdminFeedbackReplyComposer } from './AdminFeedbackReplyComposer';

interface AdminFeedbackDetailProps {
  feedback: FeedbackRow;
  isTr: boolean;
  locale: string;

  /** Mobile push-route geri butonu (yalnız mobil görünümde göster). */
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
  sending: boolean;
  onSend: () => void;
  notice: { msg: string; tone: ReplyTone } | null;

  // §38.237 — Gönderilen yanıt thread'i (admin artık işletmenin müşteriye
  // yazdığı cevapları da görür; eskiden yalnız "Yanıtlandı" rozeti vardı).
  sentReplies: SentReply[];
  sentLoading: boolean;
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
  } = props;

  return (
    <section className="flex flex-col bg-white lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
      {/* Mobile sticky top — back button + quick actions */}
      {showBackButton && (
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-[#EDEDED] bg-white/95 backdrop-blur px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={onBack}
            className="bz-btn bz-btn-sm"
            aria-label={isTr ? 'Yorumlar listesine dön' : 'Back to reviews'}
          >
            <ArrowLeft size={16} strokeWidth={2} />
            {isTr ? 'Yorumlar' : 'Reviews'}
          </button>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onFlag}
              disabled={flagging}
              className={`${active.isFlagged ? 'bz-btn-danger' : 'bz-btn'} bz-btn-sm disabled:opacity-50`}
            >
              {flagging ? <Loader2 size={12} className="animate-spin" /> : <Flag size={12} />}
              {active.isFlagged ? (isTr ? 'Kaldır' : 'Unflag') : isTr ? 'İşaretle' : 'Flag'}
            </button>
            <button
              type="button"
              onClick={onAssign}
              disabled={assigning}
              className={`${active.isAssigned ? 'bz-btn-primary' : 'bz-btn'} bz-btn-sm disabled:opacity-50`}
            >
              {assigning ? (
                <Loader2 size={12} className="animate-spin" />
              ) : active.isAssigned ? (
                <Check size={12} />
              ) : (
                <UserPlus size={12} />
              )}
              {active.isAssigned ? (isTr ? 'Atandı' : 'Assigned') : isTr ? 'Ata' : 'Assign'}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 p-5 sm:p-6">
        {/* Header card */}
        <div className="flex flex-wrap items-start gap-3">
          <Avatar
            name={initials(active.customerName)}
            size={56}
            color={active.rating >= 4 ? '#0A0A0A' : active.rating <= 2 ? '#DC2626' : '#737373'}
            fg={active.rating >= 4 ? '#C6F24E' : '#FFFFFF'}
          />
          <div className="min-w-0 flex-1">
            <p className="pulse-eyebrow text-[#737373]">
              {active.restaurant?.name || (isTr ? 'İşletme' : 'Location')} ·{' '}
              {timeAgo(active.createdAt, isTr)}
              {active.platform ? ` · ${active.platform.toUpperCase()}` : ''}
            </p>
            {/* §38.237 — mutlak damga. Göreli süre üstte kalır; operatör
                yorumun tam tarih + saatini burada görür. */}
            <p className="mt-0.5 text-[11px] text-[#A3A3A3] tabular-nums">
              <time dateTime={active.createdAt}>
                {formatDateTime(active.createdAt, isTr)}
              </time>
            </p>
            <h2 className="mt-0.5 text-[20px] sm:text-[22px] font-semibold text-[#0A0A0A] tracking-[-0.015em] bz-h-tight">
              {active.customerName || (isTr ? 'Anonim müşteri' : 'Anonymous customer')}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    size={14}
                    className={
                      n <= active.rating ? 'fill-[#C6F24E] text-[#C6F24E]' : 'text-[#EDEDED]'
                    }
                  />
                ))}
                <span className="ml-1 text-[12px] text-[#737373]">{active.rating}.0</span>
              </div>
              {active.isReplied && <Badge kind="ok">{isTr ? 'YANITLANDI' : 'REPLIED'}</Badge>}
              {active.isFlagged && <Badge kind="danger">{isTr ? 'DİKKAT' : 'FLAGGED'}</Badge>}
              {active.isAssigned && <Badge kind="ghost">{isTr ? 'ATANDI' : 'ASSIGNED'}</Badge>}
            </div>
          </div>

          {/* Desktop action buttons (mobile sticky-top'ta zaten var) */}
          {!showBackButton && (
            <div className="hidden lg:flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={onFlag}
                disabled={flagging}
                className={`${active.isFlagged ? 'bz-btn-danger' : 'bz-btn'} bz-btn-sm disabled:opacity-50`}
              >
                {flagging ? <Loader2 size={12} className="animate-spin" /> : <Flag size={12} />}
                {active.isFlagged
                  ? isTr
                    ? 'İşaret kaldır'
                    : 'Unflag'
                  : isTr
                    ? 'İşaretle'
                    : 'Flag'}
              </button>
              <button
                type="button"
                onClick={onAssign}
                disabled={assigning}
                className={`${active.isAssigned ? 'bz-btn-primary' : 'bz-btn'} bz-btn-sm disabled:opacity-50`}
              >
                {assigning ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : active.isAssigned ? (
                  <Check size={12} />
                ) : (
                  <UserPlus size={12} />
                )}
                {active.isAssigned ? (isTr ? 'Atandı' : 'Assigned') : isTr ? 'Ata' : 'Assign'}
              </button>
            </div>
          )}
        </div>

        {/* Comment card */}
        <div className="rounded-xl bg-[#FAFAFA] p-4 sm:p-5 text-[14px] sm:text-[15px] leading-[1.65] text-[#0A0A0A]">
          {active.comment
            ? `"${active.comment}"`
            : isTr
              ? 'Bu yorumda açıklama yok.'
              : 'No comment provided.'}
        </div>

        {/* §38.237 — Gönderilen yanıtlar. Owner panelindeki thread ile aynı
            veri kaynağı (`GET /api/feedback/[id]/reply`). Admin artık
            işletmenin müşteriye ne yazdığını, hangi kanaldan gittiğini ve
            teslim durumunu görebiliyor. */}
        {props.sentLoading ? (
          <div className="flex items-center gap-2 rounded-xl border border-[#EDEDED] bg-[#FAFAFA] px-3.5 py-3 text-[12px] text-[#737373]">
            <Loader2 size={13} className="animate-spin" />
            {isTr ? 'Gönderilen yanıtlar yükleniyor…' : 'Loading sent replies…'}
          </div>
        ) : props.sentReplies.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="pulse-eyebrow inline-flex items-center gap-1.5 text-[#737373]">
              <MessageSquareText size={11} strokeWidth={2.2} />
              {isTr
                ? `Gönderilen yanıtlar (${props.sentReplies.length})`
                : `Sent replies (${props.sentReplies.length})`}
            </p>
            <ol className="flex flex-col gap-2.5">
              {props.sentReplies.map((rep) => {
                const channelLabel =
                  rep.channel === 'email'
                    ? isTr
                      ? 'E-posta'
                      : 'Email'
                    : isTr
                      ? 'Dahili kayıt'
                      : 'Internal';
                const failed = rep.status === 'failed';
                return (
                  <li
                    key={rep.id}
                    className={`rounded-xl border p-3.5 ${
                      failed ? 'border-[#FCA5A5] bg-[#FFFBFB]' : 'border-[#EDEDED] bg-white'
                    }`}
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="pulse-eyebrow inline-flex items-center gap-1.5 text-[#737373]">
                        {rep.channel === 'email' && <Mail size={10} strokeWidth={2.2} />}
                        {channelLabel}
                        {failed && (
                          <span className="text-[#991B1B]">
                            · {isTr ? 'iletilemedi' : 'failed'}
                          </span>
                        )}
                      </span>
                      <span
                        className="pulse-eyebrow tabular-nums text-[#A3A3A3]"
                        title={formatDateTime(rep.createdAt, isTr)}
                      >
                        {timeAgo(rep.createdAt, isTr)} · {formatStamp(rep.createdAt, isTr)}
                      </span>
                    </div>
                    <p className="whitespace-pre-line text-[13px] leading-[1.55] text-[#0A0A0A]">
                      {rep.body}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}

        {/* High-rating reply gate */}
        {active.rating >= 4 ? (
          <AlertBanner
            kind="lime"
            icon={<Sparkles size={14} className="text-[#0A0A0A] mt-1" strokeWidth={2} />}
          >
            <span className="block font-semibold text-[#0A0A0A]">
              {isTr ? 'Yanıt yazmaya gerek yok' : 'No reply needed'}
            </span>
            <span className="block mt-0.5 text-[#525252]">
              {isTr
                ? `Yüksek puanlı yorum ${(active.platform || 'platform').toUpperCase()} üzerinden alındı; müşteri zaten platformda paylaşımını yaptı. İsterseniz yukarıdaki Flag/Ata aksiyonlarıyla bu yorumu ekibinizle takip edebilirsiniz.`
                : `High-rating review came in via ${(active.platform || 'platform').toUpperCase()}; the customer already posted on the platform. You can still flag or assign it to your team.`}
            </span>
          </AlertBanner>
        ) : active.isReplied ? (
          /* Yanıtlanmış yorum — AI yeniden üretmesin, sade "Yanıtlandı"
             başlığı yeterli. Üstteki Flag/Assign action button'ları zaten
             ayrı block'ta görünür kalıyor; ek açıklayıcı cümleye gerek yok. */
          <AlertBanner
            kind="info"
            icon={<Sparkles size={14} className="text-[#0A0A0A] mt-1" strokeWidth={2} />}
          >
            <span className="block font-semibold text-[#0A0A0A]">
              {isTr ? 'Yanıtlandı' : 'Replied'}
            </span>
          </AlertBanner>
        ) : (
          <AdminFeedbackReplyComposer
            feedback={active}
            isTr={isTr}
            locale={props.locale}
            suggesting={props.suggesting}
            aiSource={props.aiSource}
            aiTone={props.aiTone}
            setAiTone={props.setAiTone}
            onSuggest={props.onSuggest}
            draft={props.draft}
            setDraft={props.setDraft}
            sendEmail={props.sendEmail}
            setSendEmail={props.setSendEmail}
            sending={props.sending}
            onSend={props.onSend}
            notice={props.notice}
          />
        )}
      </div>
    </section>
  );
}

export default AdminFeedbackDetail;
