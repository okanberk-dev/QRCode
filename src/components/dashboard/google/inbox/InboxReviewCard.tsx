'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Edit3, Flag, Languages, Loader2, PenLine, RotateCcw, Send, Sparkles, Star, Trash2 } from 'lucide-react';
import { ReplyRiskNotice, useReplyRisk } from '@/components/reply/ReplyRiskNotice';
import { ReplyTemplatesMenu } from '@/components/reply/ReplyTemplatesMenu';
import { fillReplyTemplate, languageName, reviewerFirstName } from '@/lib/google-review-text';
import { formatStampInTimeZone, resolveDisplayTimeZone } from '@/lib/timezone';
import type { InboxReview } from './inbox-client';

export interface SendResult {
  ok: boolean;
  message?: string;
}

interface Props {
  review: InboxReview;
  locale: 'tr' | 'en';
  businessName: string;
  canWrite: boolean;
  aiEnabled: boolean;
  focused: boolean;
  leaving: boolean;
  flagged: boolean;
  selectMode: boolean;
  selected: boolean;
  /** When this changes to a new value the composer opens (send-and-next, "R"). */
  openSignal: number;
  onToggleSelect: () => void;
  onToggleFlag: () => void;
  onFocus: () => void;
  onDraft: () => Promise<{ text: string | null; message?: string }>;
  onSend: (text: string, opts: { next: boolean }) => Promise<SendResult>;
  onDelete: () => Promise<SendResult>;
}

const DAY_MS = 24 * 3600_000;

function relative(iso: string | null, locale: 'tr' | 'en'): string {
  if (!iso) return '';
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return '';
  const days = Math.floor((Date.now() - ms) / DAY_MS);
  if (days < 1) return locale === 'tr' ? 'bugün' : 'today';
  if (days < 30) return locale === 'tr' ? `${days} gün önce` : `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return locale === 'tr' ? `${months} ay önce` : `${months}mo ago`;
  const years = Math.floor(days / 365);
  return locale === 'tr' ? `${years} yıl önce` : `${years}y ago`;
}

function Stars({ value, label }: { value: number; label: string }) {
  return (
    <span role="img" aria-label={label} className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={12}
          aria-hidden="true"
          fill={i <= value ? (value <= 2 ? '#DC2626' : value === 3 ? '#D97706' : '#0A0A0A') : 'transparent'}
          color={i <= value ? (value <= 2 ? '#DC2626' : value === 3 ? '#D97706' : '#0A0A0A') : '#D4D4D4'}
        />
      ))}
    </span>
  );
}

export function InboxReviewCard({
  review,
  locale,
  businessName,
  canWrite,
  aiEnabled,
  focused,
  leaving,
  flagged,
  selectMode,
  selected,
  openSignal,
  onToggleSelect,
  onToggleFlag,
  onFocus,
  onDraft,
  onSend,
  onDelete,
}: Props) {
  const isTr = locale === 'tr';
  const rating = review.rating ?? 0;
  const low = rating > 0 && rating <= 3;
  const eligible = !review.hasReply && rating >= 4;
  const name = review.isAnonymous
    ? isTr ? 'Anonim kullanıcı' : 'Anonymous user'
    : review.reviewerName || (isTr ? 'Google kullanıcısı' : 'Google user');

  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState<false | 'send' | 'next'>(false);
  const [drafting, setDrafting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<'send' | 'next' | 'delete' | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const risk = useReplyRisk(text);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);

  const openComposer = (prefill?: string) => {
    if (!canWrite) return;
    setText((prev) => prefill ?? (prev || review.draft?.body || ''));
    setError(null);
    setOpen(true);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  // Parent asks to open (send-and-next, "R" key).
  const lastSignal = useRef(openSignal);
  useEffect(() => {
    if (openSignal !== lastSignal.current) {
      lastSignal.current = openSignal;
      if (!review.hasReply) openComposer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSignal]);

  useEffect(() => {
    if (focused && document.activeElement !== cardRef.current && !cardRef.current?.contains(document.activeElement)) {
      cardRef.current?.focus({ preventScroll: true });
      cardRef.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [focused]);

  const draft = async () => {
    setDrafting(true);
    setError(null);
    try {
      const res = await onDraft();
      if (res.text) openComposer(res.text);
      else if (res.message) setError(res.message);
    } finally {
      setDrafting(false);
    }
  };

  const send = async (next: boolean) => {
    if (!text.trim() || risk.blocked || sending) return;
    if (!confirmed) {
      setError(isTr ? 'Göndermeden önce sorumluluk onayını işaretle.' : 'Tick the responsibility box before sending.');
      return;
    }
    setSending(next ? 'next' : 'send');
    setLastAction(next ? 'next' : 'send');
    setError(null);
    const res = await onSend(text.trim(), { next });
    setSending(false);
    if (res.ok) {
      // Close on success; the reply block below shows what was published.
      setOpen(false);
      setText('');
      setConfirmed(false);
    } else {
      setError(res.message ?? (isTr ? 'Yanıt gönderilemedi.' : 'The reply could not be sent.'));
    }
  };

  const remove = async () => {
    setDeleting(true);
    setLastAction('delete');
    setError(null);
    const res = await onDelete();
    setDeleting(false);
    setConfirmDelete(false);
    if (!res.ok) setError(res.message ?? (isTr ? 'Yanıt silinemedi.' : 'The reply could not be deleted.'));
  };

  const retry = () => {
    if (lastAction === 'delete') void remove();
    else void send(lastAction === 'next');
  };

  const tz = resolveDisplayTimeZone();
  const created = review.createTime ? formatStampInTimeZone(review.createTime, locale, tz) : '';
  const lang = review.language && review.language !== locale ? languageName(review.language, locale) : null;
  const avatarInitials = name
    .split(/\s+/)
    .map((t) => t[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toLocaleUpperCase(isTr ? 'tr-TR' : 'en-US');

  return (
    <article
      ref={cardRef}
      tabIndex={-1}
      data-review-id={review.reviewId}
      onFocus={onFocus}
      aria-label={`${name}, ${rating}/5`}
      className={`group relative border-b border-[#EDEDED] px-4 py-4 outline-none transition-[opacity,transform,max-height] duration-300 last:border-b-0 sm:px-5 ${
        leaving ? 'pointer-events-none -translate-x-2 opacity-0' : ''
      } ${focused ? 'bg-[#FAFAFA] shadow-[inset_3px_0_0_#C6F24E]' : ''} ${flagged ? 'bg-[#FFFBEB]/50' : ''}`}
    >
      <div className="flex gap-3">
        {selectMode && (
          <label className="flex min-h-11 min-w-11 shrink-0 cursor-pointer items-start justify-center pt-1 sm:min-h-0 sm:min-w-0">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#0A0A0A]"
              checked={selected}
              disabled={!eligible}
              onChange={onToggleSelect}
              aria-label={isTr ? `${name} yorumunu seç` : `Select ${name}'s review`}
              title={
                eligible
                  ? undefined
                  : review.hasReply
                    ? isTr ? 'Bu yorum zaten yanıtlanmış' : 'Already replied'
                    : isTr ? '1-3 yıldızlı yorumlar tek tek yanıtlanır' : '1–3 star reviews are answered one by one'
              }
            />
          </label>
        )}

        {review.reviewerPhotoUrl ? (
          <img
            src={review.reviewerPhotoUrl}
            alt=""
            width={40}
            height={40}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${
              low ? 'bg-[#FEF2F2] text-[#991B1B]' : 'bg-[#EAF9B8] text-[#0A0A0A]'
            }`}
          >
            {avatarInitials || 'G'}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="min-w-0 break-words text-[13.5px] font-semibold text-[#0A0A0A]">{name}</span>
            {rating > 0 && <Stars value={rating} label={isTr ? `5 üzerinden ${rating} yıldız` : `${rating} out of 5 stars`} />}
            <span className="text-[12px] text-[#737373]" title={created}>
              {relative(review.createTime, locale)}
            </span>
            {lang && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[11px] text-[#525252]">
                <Languages size={11} aria-hidden="true" />
                {lang}
              </span>
            )}
            {review.hasReply ? (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#F0FDF4] px-2 py-0.5 text-[11px] text-[#166534]">
                <CheckCircle2 size={11} aria-hidden="true" />
                {isTr ? 'Yanıtlandı' : 'Replied'}
              </span>
            ) : low ? (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[11px] text-[#991B1B]">
                {isTr ? 'Düşük puan' : 'Low rating'}
              </span>
            ) : null}
          </div>

          <p className="mt-2 whitespace-pre-wrap break-words text-[13.5px] leading-[1.6] text-[#262626]">
            {review.originalText ?? (
              <span className="text-[#737373]">{isTr ? 'Yalnız puan verdi, yorum yazmadı.' : 'Left a rating without text.'}</span>
            )}
          </p>

          {review.translatedText && (
            <div className="mt-1.5">
              <button
                type="button"
                onClick={() => setShowTranslation((v) => !v)}
                aria-expanded={showTranslation}
                className="min-h-11 text-[11.5px] font-medium text-[#525252] underline-offset-2 hover:underline sm:min-h-0"
              >
                {showTranslation
                  ? isTr ? 'Çeviriyi gizle' : 'Hide translation'
                  : isTr ? 'Çeviriyi göster' : 'Show translation'}
              </button>
              {showTranslation && (
                <p className="mt-1 whitespace-pre-wrap break-words text-[12px] leading-[1.55] text-[#737373]">
                  {review.translatedText}
                </p>
              )}
            </div>
          )}

          {review.hasReply && !open && (
            <div className="mt-3 rounded-r-[10px] border-l-[3px] border-[#C6F24E] bg-[#FAFAFA] px-3.5 py-2.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[11.5px] font-semibold text-[#0A0A0A]">{isTr ? 'İşletme yanıtı' : 'Business reply'}</span>
                {review.replyUpdateTime && (
                  <span className="text-[11px] text-[#737373]">{formatStampInTimeZone(review.replyUpdateTime, locale, tz)}</span>
                )}
                {canWrite && (
                  <span className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openComposer(review.replyComment ?? '')}
                      className="bz-btn bz-btn-sm min-h-11 sm:min-h-0"
                    >
                      <Edit3 size={12} aria-hidden="true" />
                      {isTr ? 'Düzenle' : 'Edit'}
                    </button>
                    {confirmDelete ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void remove()}
                          disabled={deleting}
                          className="bz-btn-danger bz-btn-sm min-h-11 sm:min-h-0"
                        >
                          {deleting ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Trash2 size={12} aria-hidden="true" />}
                          {isTr ? 'Evet, sil' : 'Yes, delete'}
                        </button>
                        <button type="button" onClick={() => setConfirmDelete(false)} className="bz-btn bz-btn-sm min-h-11 sm:min-h-0">
                          {isTr ? 'Vazgeç' : 'Cancel'}
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => setConfirmDelete(true)} className="bz-btn bz-btn-sm min-h-11 sm:min-h-0">
                        <Trash2 size={12} aria-hidden="true" />
                        {isTr ? 'Sil' : 'Delete'}
                      </button>
                    )}
                  </span>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-[12.5px] leading-[1.55] text-[#262626]">
                {review.replyComment}
              </p>
            </div>
          )}

          {!review.hasReply && !open && canWrite && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {aiEnabled && (
                <button
                  type="button"
                  onClick={() => (review.draft?.body ? openComposer(review.draft.body) : void draft())}
                  disabled={drafting}
                  className="bz-btn-lime bz-btn-sm min-h-11 disabled:opacity-60 sm:min-h-0"
                >
                  {drafting ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Sparkles size={12} aria-hidden="true" />}
                  {review.draft?.body ? (isTr ? 'AI taslağını aç' : 'Open AI draft') : isTr ? 'AI taslağı' : 'AI draft'}
                </button>
              )}
              <ReplyTemplatesMenu
                locale={locale}
                draft={text}
                triggerClassName="min-h-11 sm:min-h-0"
                onInsert={(tpl) =>
                  openComposer(
                    fillReplyTemplate(tpl, { firstName: reviewerFirstName(review.reviewerName), businessName }),
                  )
                }
              />
              <button type="button" onClick={() => openComposer('')} className="bz-btn bz-btn-sm min-h-11 sm:min-h-0">
                <PenLine size={12} aria-hidden="true" />
                {isTr ? 'Manuel' : 'Manual'}
              </button>
              <button
                type="button"
                onClick={onToggleFlag}
                aria-pressed={flagged}
                className={`${flagged ? 'bz-btn-warn' : 'bz-btn'} bz-btn-sm min-h-11 sm:min-h-0`}
              >
                <Flag size={12} aria-hidden="true" />
                {flagged ? (isTr ? 'İşareti kaldır' : 'Unflag') : isTr ? 'Bildir' : 'Flag'}
              </button>
            </div>
          )}

          {open && (
            <div className="mt-3 rounded-[10px] border border-[#EDEDED] bg-white p-3">
              {low && (
                <p className="mb-2 text-[11.5px] leading-[1.5] text-[#92400E]">
                  {isTr
                    ? 'Düşük puanlı yorum: özür ve somut bir çözüm yaz. Bu yanıt yalnız sen gönderince yayınlanır.'
                    : 'Low rating: apologise and name a concrete fix. Published only when you send it.'}
                </p>
              )}
              <textarea
                ref={textareaRef}
                className="bz-input min-h-[104px] resize-y text-[16px] sm:text-[13px]"
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 4096))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    void send(e.shiftKey);
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setOpen(false);
                    cardRef.current?.focus();
                  }
                }}
                placeholder={isTr ? 'Google’da herkese açık görünecek yanıtın…' : 'Your public reply on Google…'}
                aria-label={isTr ? 'Google yanıtı' : 'Google reply'}
                aria-invalid={risk.blocked || undefined}
                enterKeyHint="enter"
              />
              <ReplyRiskNotice risk={risk} locale={locale} className="mt-2" />
              <label className="mt-2.5 flex cursor-pointer items-start gap-2 text-[11.5px] leading-relaxed text-[#525252]">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#0A0A0A]"
                />
                <span>
                  {isTr
                    ? 'Bu yanıtın içeriğinden bizzat sorumlu olduğumu, tehdit, hakaret, iftira veya yasa dışı bir ifade içermediğini onaylıyorum ('
                    : 'I confirm I am solely responsible for this reply and that it contains no threat, insult, defamation or unlawful statement ('}
                  <Link
                    href={`/${locale}/kabul-edilebilir-kullanim`}
                    target="_blank"
                    rel="noopener"
                    className="font-semibold text-[#0A0A0A] underline-offset-2 hover:underline"
                  >
                    {isTr ? 'Kabul Edilebilir Kullanım Politikası' : 'Acceptable Use Policy'}
                  </Link>
                  ).
                </span>
              </label>

              {error && (
                <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#991B1B]">
                  <span className="min-w-0 flex-1">{error}</span>
                  {lastAction && (lastAction === 'send' || lastAction === 'next') && (
                    <button type="button" onClick={retry} className="inline-flex min-h-11 items-center gap-1 font-semibold underline sm:min-h-0">
                      <RotateCcw size={12} aria-hidden="true" />
                      {isTr ? 'Tekrar dene' : 'Try again'}
                    </button>
                  )}
                </div>
              )}

              <div className="mt-2.5 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                <button type="button" onClick={() => setOpen(false)} className="bz-btn bz-btn-sm min-h-11 sm:min-h-0">
                  {isTr ? 'Kapat' : 'Close'}
                </button>
                {aiEnabled && (
                  <button
                    type="button"
                    onClick={() => void draft()}
                    disabled={drafting}
                    className="bz-btn bz-btn-sm min-h-11 disabled:opacity-60 sm:min-h-0"
                  >
                    {drafting ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Sparkles size={12} aria-hidden="true" />}
                    {isTr ? 'Yeniden öner' : 'Suggest again'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void send(true)}
                  disabled={Boolean(sending) || !text.trim() || risk.blocked}
                  className="bz-btn bz-btn-sm min-h-11 disabled:opacity-60 sm:min-h-0"
                  title={isTr ? '⌘/Ctrl + Shift + Enter' : '⌘/Ctrl + Shift + Enter'}
                >
                  {sending === 'next' ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : null}
                  {isTr ? 'Gönder ve sonrakine geç' : 'Send & next'}
                </button>
                <button
                  type="button"
                  onClick={() => void send(false)}
                  disabled={Boolean(sending) || !text.trim() || risk.blocked}
                  className="bz-btn-primary bz-btn-sm min-h-11 disabled:opacity-60 sm:min-h-0"
                  title="⌘/Ctrl + Enter"
                >
                  {sending === 'send' ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Send size={12} aria-hidden="true" />}
                  {isTr ? "Google'a gönder" : 'Send to Google'}
                </button>
              </div>
            </div>
          )}

          {error && !open && (
            <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#991B1B]">
              <span className="min-w-0 flex-1">{error}</span>
              {lastAction === 'delete' && (
                <button type="button" onClick={retry} className="inline-flex min-h-11 items-center gap-1 font-semibold underline sm:min-h-0">
                  <RotateCcw size={12} aria-hidden="true" />
                  {isTr ? 'Tekrar dene' : 'Try again'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
