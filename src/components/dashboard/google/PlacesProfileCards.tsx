'use client';

/**
 * The cards of the Google profile view: RatingCard (+ the one-line strip),
 * ProfileChecklist and SampleReviews.
 *
 * Everything here renders Places data LIVE and unmodified: nothing is stored,
 * summarised or re-ranked (CLAUDE.md §5.1.2). Every card carries the visible
 * text "Google Maps" (attribution, >= 12 px, regular weight): `#FFFFFF` on the
 * dark hero, `#525252` on white cards (contrast >= 4.5:1).
 *
 * Placement classes (`lg:col-start-*`) come from the parent through
 * `className` so the same cards work in the 2-column grid and in the
 * single-column compact layout.
 */

import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Check, ExternalLink, RefreshCw, X } from 'lucide-react';
import { Badge, StarRow } from '@/components/ui';
import {
  buildPlacesChecklist,
  type PlacesChecklistItem,
  type PlacesProfile,
  type PlacesReview,
} from '@/lib/google-places';
import { formatFullDateTimeInTimeZone, formatStampInTimeZone } from '@/lib/timezone';
import {
  formatCount,
  formatRating,
  formatRelativeTime,
  placeMapsUrl,
  type UiLocale,
} from './places-client';

const COPY = {
  tr: {
    newTab: '(yeni sekmede açılır)',
    source: 'Kaynak',
    sourceName: 'Google Maps',
    lastCheck: 'Son kontrol',
    provider: 'Veri sağlayıcı',
    liveNote: "Bilgiler sayfa açıldığında Google'dan güncel alınır.",
    eyebrow: 'GOOGLE PROFİLİ',
    profileLabel: 'Google profili',
    operating: 'Faaliyette',
    tempClosed: 'Geçici olarak kapalı',
    permClosed: 'Kalıcı olarak kapandı',
    noRating: 'Henüz Google puanı yok',
    reviewCount: (n: string) => `${n} Google yorumu`,
    stars: (value: string) => `5 üzerinden ${value} yıldız`,
    openOnGoogle: "Google'da aç",
    change: 'Doğru işletme değil mi? Değiştir',
    refresh: 'Yenile',
    refreshing: 'Yenileniyor…',
    refreshWait: (n: number) => `${n} sn sonra`,
    compactPrefix: "Google'da herkese açık puan",
    compactNoRating: 'henüz yok',
    compactReviews: (n: string) => `${n} yorum`,
    checklistEyebrow: 'PROFİL KONTROLÜ',
    checklistCount: (done: number, total: number) => `${done}/${total} tamam`,
    stateDone: 'Tamam',
    stateTodo: 'Eksik',
    stateCritical: 'Dikkat gerekiyor',
    editOnGoogle: "Google'da düzenle",
    ownerNote:
      "Bu bilgileri Google'da profilin sahibi düzenleyebilir. Henüz sahiplenmediysen profil sayfandaki sahiplenme bağlantısıyla başlayabilirsin.",
    openProfile: 'Profilimi aç',
    reviewsTitle: "Google'dan örnek yorumlar",
    reviewsNote:
      'Google, bir işletme için en fazla 5 yorum paylaşır; bunlar en yeni yorumlar olmayabilir.',
    reviewsEmpty: 'Google bu işletme için henüz yorum paylaşmıyor.',
    noText: 'Yazılı yorum yok.',
    lowRating: 'Düşük puan',
    viewOnGoogle: "Google'da gör",
    allReviews: "Tüm yorumları Google'da gör",
    replyLink: "Bu yorumlara Google'dan yanıt vermek ister misin? Yanıt özelliğine git",
    showMore: 'Devamını göster',
    showLess: 'Daha az göster',
    anonymous: 'Google kullanıcısı',
  },
  en: {
    newTab: '(opens in a new tab)',
    source: 'Source',
    sourceName: 'Google Maps',
    lastCheck: 'Last checked',
    provider: 'Data provider',
    liveNote: 'Details are fetched fresh from Google when the page opens.',
    eyebrow: 'GOOGLE PROFILE',
    profileLabel: 'Google profile',
    operating: 'Operating',
    tempClosed: 'Temporarily closed',
    permClosed: 'Permanently closed',
    noRating: 'No Google rating yet',
    reviewCount: (n: string) => `${n} Google reviews`,
    stars: (value: string) => `${value} out of 5 stars`,
    openOnGoogle: 'Open on Google',
    change: 'Not the right business? Change',
    refresh: 'Refresh',
    refreshing: 'Refreshing…',
    refreshWait: (n: number) => `in ${n}s`,
    compactPrefix: 'Public rating on Google',
    compactNoRating: 'none yet',
    compactReviews: (n: string) => `${n} reviews`,
    checklistEyebrow: 'PROFILE CHECK',
    checklistCount: (done: number, total: number) => `${done}/${total} done`,
    stateDone: 'Done',
    stateTodo: 'Missing',
    stateCritical: 'Needs attention',
    editOnGoogle: 'Edit on Google',
    ownerNote:
      "Only the owner of the profile can edit these details on Google. If you haven't claimed it yet, you can start with the claim link on your profile page.",
    openProfile: 'Open my profile',
    reviewsTitle: 'Sample reviews from Google',
    reviewsNote: 'Google shares at most 5 reviews per business; they may not be the newest.',
    reviewsEmpty: "Google isn't sharing any reviews for this business yet.",
    noText: 'No written comment.',
    lowRating: 'Low rating',
    viewOnGoogle: 'View on Google',
    allReviews: 'See all reviews on Google',
    replyLink: 'Want to reply to these reviews on Google? Go to the reply feature',
    showMore: 'Show more',
    showLess: 'Show less',
    anonymous: 'Google user',
  },
} as const;

function useCopy(locale: UiLocale) {
  return COPY[locale === 'en' ? 'en' : 'tr'];
}

// ─────────────────────────────────────────────────────────────────────────
// Small shared pieces
// ─────────────────────────────────────────────────────────────────────────

/** External link: new tab, no opener/referrer, announced to screen readers. */
function ExtLink({
  href,
  className,
  locale,
  children,
}: {
  href: string;
  className?: string;
  locale: UiLocale;
  children: ReactNode;
}) {
  const copy = useCopy(locale);
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only"> {copy.newTab}</span>
    </a>
  );
}

/** "3 hours ago", re-computed every 30 s; the absolute time is the tooltip. */
function RelativeTime({ iso, locale, full = false }: { iso: string; locale: UiLocale; full?: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const label = formatRelativeTime(iso, locale, now);
  if (!label) return null;
  const title = full ? formatFullDateTimeInTimeZone(iso, locale) : formatStampInTimeZone(iso, locale);
  return (
    <time dateTime={iso} title={title || undefined}>
      {label}
    </time>
  );
}

function StatusBadge({ status, locale }: { status: PlacesProfile['businessStatus']; locale: UiLocale }) {
  const copy = useCopy(locale);
  if (status === 'UNKNOWN') return null;
  // Light palette on the dark hero — never white text on graphite for status.
  const tone =
    status === 'OPERATIONAL'
      ? { cls: 'bg-[#C6F24E] text-[#0A0A0A]', label: copy.operating }
      : status === 'CLOSED_TEMPORARILY'
        ? { cls: 'bg-[#FFFBEB] text-[#92400E]', label: copy.tempClosed }
        : { cls: 'bg-[#FEF2F2] text-[#991B1B]', label: copy.permClosed };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ${tone.cls}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {tone.label}
    </span>
  );
}

const ON_DARK_PILL =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/30 px-4 text-[13px] font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]';

// ─────────────────────────────────────────────────────────────────────────
// RatingCard (dark hero)
// ─────────────────────────────────────────────────────────────────────────

export interface RatingCardProps {
  profile: PlacesProfile;
  /** Buaze business name, used when Google sends no display name. */
  fallbackName: string;
  fetchedAt: string;
  locale: UiLocale;
  /** Focus target after a successful pick (`tabIndex={-1}` heading). */
  headingRef: RefObject<HTMLElement | null>;
  className?: string;
  /** Re-open the picker above the profile; undefined hides the button. */
  onChange?: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  /** Seconds until `Yenile` works again (0 = ready). */
  refreshWait: number;
  /** True when the daily refresh limit was reached: the button stays disabled. */
  refreshBlocked: boolean;
}

export function RatingCard({
  profile,
  fallbackName,
  fetchedAt,
  locale,
  headingRef,
  className = '',
  onChange,
  onRefresh,
  refreshing,
  refreshWait,
  refreshBlocked,
}: RatingCardProps) {
  const copy = useCopy(locale);
  const headingId = useId();
  const name = profile.name ?? fallbackName;
  const mapsHref = profile.mapsUri ?? placeMapsUrl(profile.placeId);
  const disabled = refreshing || refreshWait > 0 || refreshBlocked;
  const ratingText = profile.rating !== null ? formatRating(profile.rating, locale) : null;

  return (
    <section
      aria-labelledby={headingId}
      className={`relative overflow-hidden rounded-[18px] bg-[#0A0A0A] p-5 text-white sm:p-6 ${className}`}
    >
      <p className="pulse-eyebrow text-[#C6F24E]">{copy.eyebrow}</p>
      <h2
        id={headingId}
        ref={headingRef as RefObject<HTMLHeadingElement>}
        tabIndex={-1}
        className="bz-h-tight mt-2 break-words text-[22px] leading-[1.15] outline-none sm:text-[26px]"
      >
        {name}
      </h2>
      {profile.address && (
        <p className="mt-1.5 break-words text-[13px] leading-[1.55] text-white/80">{profile.address}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {profile.category && (
          <span className="inline-flex items-center rounded-full border border-white/30 px-2.5 py-1 text-[12px] text-white">
            {profile.category}
          </span>
        )}
        <StatusBadge status={profile.businessStatus} locale={locale} />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-6">
        {ratingText !== null && profile.rating !== null ? (
          <>
            <div
              className="bz-h-tight tabular-nums text-[64px] leading-[0.9] text-[#C6F24E] sm:text-[80px]"
              style={{ letterSpacing: '-0.04em' }}
            >
              {ratingText}
            </div>
            <div className="space-y-1.5 sm:pb-1">
              <StarRow
                value={Math.round(profile.rating)}
                size={18}
                emptyColor="#404040"
                ariaLabel={copy.stars(ratingText)}
              />
              {profile.ratingCount !== null && (
                <p className="text-[14px] text-white">{copy.reviewCount(formatCount(profile.ratingCount, locale))}</p>
              )}
            </div>
          </>
        ) : (
          <p className="text-[16px] text-white">{copy.noRating}</p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <ExtLink href={mapsHref} locale={locale} className={ON_DARK_PILL}>
          {copy.openOnGoogle}
          <ExternalLink size={14} aria-hidden="true" />
        </ExtLink>
        {onChange && (
          <button
            type="button"
            onClick={onChange}
            className="inline-flex min-h-11 items-center px-2 text-left text-[13px] text-white underline underline-offset-2 hover:text-[#C6F24E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]"
          >
            {copy.change}
          </button>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-white/15 pt-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1 text-[12px] font-normal leading-[1.6] text-white">
          <p>
            {copy.source}: {copy.sourceName} · {copy.lastCheck} <RelativeTime iso={fetchedAt} locale={locale} />
          </p>
          {profile.attributions.map((a) => (
            <p key={`${a.provider}-${a.providerUri ?? ''}`}>
              {copy.provider}:{' '}
              {a.providerUri ? (
                <ExtLink
                  href={a.providerUri}
                  locale={locale}
                  className="underline underline-offset-2 max-sm:inline-flex max-sm:min-h-11 max-sm:items-center"
                >
                  {a.provider}
                </ExtLink>
              ) : (
                a.provider
              )}
            </p>
          ))}
          <p className="text-white/75">{copy.liveNote}</p>
        </div>
        <button
          type="button"
          aria-disabled={disabled}
          onClick={() => {
            if (!disabled) onRefresh();
          }}
          className={`${ON_DARK_PILL} shrink-0 ${disabled ? 'cursor-not-allowed opacity-70 hover:bg-transparent' : ''}`}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} aria-hidden="true" />
          {refreshing ? copy.refreshing : refreshWait > 0 ? `${copy.refresh} · ${copy.refreshWait(refreshWait)}` : copy.refresh}
        </button>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// One-line strip (the optional reply feature is fully set up)
// ─────────────────────────────────────────────────────────────────────────

export function RatingStrip({
  profile,
  locale,
  headingRef,
  className = '',
}: {
  profile: PlacesProfile;
  locale: UiLocale;
  headingRef: RefObject<HTMLElement | null>;
  className?: string;
}) {
  const copy = useCopy(locale);
  const mapsHref = profile.mapsUri ?? placeMapsUrl(profile.placeId);
  const rating = profile.rating !== null ? formatRating(profile.rating, locale) : copy.compactNoRating;
  const count = profile.ratingCount !== null ? ` · ${copy.compactReviews(formatCount(profile.ratingCount, locale))}` : '';
  return (
    <section
      ref={headingRef as RefObject<HTMLElement>}
      tabIndex={-1}
      aria-label={copy.profileLabel}
      className={`bz-card flex flex-col gap-1 px-4 py-2 outline-none sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <p className="text-[13.5px] leading-[1.6] text-[#0A0A0A]">
        {`${copy.compactPrefix}: ${rating}${count} · ${copy.source}: ${copy.sourceName}`}
      </p>
      <ExtLink
        href={mapsHref}
        locale={locale}
        className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-[#0A0A0A] underline underline-offset-2"
      >
        {copy.openOnGoogle}
        <ExternalLink size={13} aria-hidden="true" />
      </ExtLink>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ProfileChecklist
// ─────────────────────────────────────────────────────────────────────────

function ChecklistRow({ item, locale }: { item: PlacesChecklistItem; locale: UiLocale }) {
  const copy = useCopy(locale);
  // Icon + word, never colour alone: a missing item carries a visible word
  // badge; a done item is the check icon plus a screen-reader-only "Tamam".
  const tone =
    item.state === 'done'
      ? { icon: <Check size={14} strokeWidth={3} />, cls: 'bg-[#EAF9B8] text-[#3F5200]', word: copy.stateDone }
      : item.state === 'todo'
        ? { icon: <AlertCircle size={14} strokeWidth={2.5} />, cls: 'bg-[#FFFBEB] text-[#92400E]', word: copy.stateTodo }
        : { icon: <X size={14} strokeWidth={3} />, cls: 'bg-[#FEF2F2] text-[#991B1B]', word: copy.stateCritical };

  return (
    <li className="flex items-start gap-3 py-3">
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${tone.cls}`}
      >
        {tone.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] font-medium text-[#0A0A0A]">
            {item.state === 'done' && <span className="sr-only">{tone.word}: </span>}
            {item.label}
            {item.state !== 'done' && (
              <Badge kind={item.state === 'todo' ? 'warn' : 'danger'} dot={false}>
                {tone.word}
              </Badge>
            )}
          </span>
          {item.value &&
            (item.href ? (
              <ExtLink
                href={item.href}
                locale={locale}
                className="-my-3 inline-block break-all py-3 text-[13px] text-[#0A0A0A] underline underline-offset-2"
              >
                {item.value}
              </ExtLink>
            ) : (
              <span className="break-words text-[13px] text-[#525252]">{item.value}</span>
            ))}
        </div>
        {item.help && (
          <p
            className={`mt-1 text-[12.5px] leading-[1.55] ${item.state === 'critical' ? 'text-[#991B1B]' : 'text-[#525252]'}`}
          >
            {item.help}
          </p>
        )}
      </div>
    </li>
  );
}

export function ProfileChecklist({
  profile,
  locale,
  className = '',
  wide = false,
}: {
  profile: PlacesProfile;
  locale: UiLocale;
  className?: string;
  /** Two columns of rows (used under the one-line strip, full width). */
  wide?: boolean;
}) {
  const copy = useCopy(locale);
  const headingId = useId();
  const checklist = buildPlacesChecklist(profile, locale);
  const hasGaps = checklist.items.some((i) => i.state !== 'done');
  const mapsHref = profile.mapsUri ?? placeMapsUrl(profile.placeId);

  return (
    <section aria-labelledby={headingId} className={`bz-card p-5 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={headingId} className="pulse-eyebrow text-[#0A0A0A]">
          {copy.checklistEyebrow}
        </h2>
        {/* A plain count of six items — not a score, no percentage anywhere. */}
        <p className="text-[13px] font-medium text-[#0A0A0A]">{copy.checklistCount(checklist.done, checklist.total)}</p>
      </div>
      <div aria-hidden="true" className="mt-3 flex gap-1">
        {checklist.items.map((item) => (
          <span
            key={item.id}
            className={`h-1.5 flex-1 rounded-full ${item.state === 'done' ? 'bg-[#C6F24E]' : 'bg-[#EDEDED]'}`}
          />
        ))}
      </div>

      <ul className={`mt-3 divide-y divide-[#EDEDED] ${wide ? 'sm:grid sm:grid-cols-2 sm:gap-x-8 sm:divide-y-0' : ''}`}>
        {checklist.items.map((item) => (
          <ChecklistRow key={item.id} item={item} locale={locale} />
        ))}
      </ul>

      {checklist.tips.map((tip) => (
        <div key={tip.id} className="mt-3 rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-3.5">
          <p className="text-[12.5px] leading-[1.6] text-[#525252]">{tip.text}</p>
          <Link
            href={tip.ctaHref}
            className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-[#0A0A0A] underline underline-offset-2"
          >
            {tip.ctaLabel}
            <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      ))}

      <div className="mt-4 space-y-3 border-t border-[#EDEDED] pt-4">
        {hasGaps && (
          <ExtLink
            href="https://business.google.com/locations"
            locale={locale}
            className="bz-btn-lime min-h-11 w-full"
          >
            {copy.editOnGoogle}
            <ExternalLink size={14} aria-hidden="true" />
          </ExtLink>
        )}
        <p className="text-[12.5px] leading-[1.6] text-[#525252]">{copy.ownerNote}</p>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <ExtLink
            href={mapsHref}
            locale={locale}
            className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-[#0A0A0A] underline underline-offset-2"
          >
            {copy.openProfile}
            <ExternalLink size={13} aria-hidden="true" />
          </ExtLink>
          <p className="text-[12px] font-normal text-[#525252]">
            {copy.source}: {copy.sourceName}
          </p>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// SampleReviews
// ─────────────────────────────────────────────────────────────────────────

function ReviewAvatar({ src, name }: { src: string | null; name: string }) {
  const [broken, setBroken] = useState(false);
  const initial = (Array.from(name.trim())[0] ?? '?').toLocaleUpperCase('tr-TR');
  if (!src || broken) {
    return (
      <span
        aria-hidden="true"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EAF9B8] text-[12px] font-semibold text-[#3F5200]"
      >
        {initial}
      </span>
    );
  }
  // Google's own avatar CDN: a plain <img> on purpose (no next/image proxy),
  // no referrer, and an initial fallback when it cannot load.
  return (
    <img
      src={src}
      alt=""
      width={28}
      height={28}
      referrerPolicy="no-referrer"
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
      className="h-7 w-7 shrink-0 rounded-full bg-[#EDEDED] object-cover"
    />
  );
}

/** Four-line clamp with a toggle that only appears when the text overflows. */
function ClampedText({ text, locale }: { text: string; locale: UiLocale }) {
  const copy = useCopy(locale);
  const ref = useRef<HTMLParagraphElement | null>(null);
  const textId = useId();
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || expanded) return;
    const measure = () => setOverflowing(el.scrollHeight > el.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, expanded]);

  return (
    <>
      <p
        ref={ref}
        id={textId}
        className={`whitespace-pre-wrap break-words text-[13.5px] leading-[1.6] text-[#262626] ${expanded ? '' : 'line-clamp-4'}`}
      >
        {text}
      </p>
      {(overflowing || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={textId}
          onClick={() => setExpanded((v) => !v)}
          className="-mt-1 inline-flex min-h-11 items-center text-[13px] font-medium text-[#0A0A0A] underline underline-offset-2"
        >
          {expanded ? copy.showLess : copy.showMore}
        </button>
      )}
    </>
  );
}

function ReviewRow({ review, locale }: { review: PlacesReview; locale: UiLocale }) {
  const copy = useCopy(locale);
  const author = review.authorName ?? copy.anonymous;
  return (
    <li className="space-y-2 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <ReviewAvatar src={review.authorPhotoUri} name={author} />
        {review.authorUri ? (
          <ExtLink
            href={review.authorUri}
            locale={locale}
            className="inline-flex min-h-11 items-center text-[13.5px] font-medium text-[#0A0A0A] underline-offset-2 hover:underline sm:min-h-0"
          >
            {author}
          </ExtLink>
        ) : (
          <span className="text-[13.5px] font-medium text-[#0A0A0A]">{author}</span>
        )}
        {review.publishedAt && (
          <span className="text-[12px] text-[#525252]">
            <RelativeTime iso={review.publishedAt} locale={locale} full />
          </span>
        )}
        {review.rating !== null && (
          <StarRow
            value={review.rating}
            size={13}
            color="#0A0A0A"
            ariaLabel={copy.stars(String(review.rating))}
          />
        )}
        {review.rating !== null && review.rating <= 3 && <Badge kind="warn">{copy.lowRating}</Badge>}
      </div>
      {review.text ? (
        <ClampedText text={review.text} locale={locale} />
      ) : (
        <p className="text-[13px] text-[#525252]">{copy.noText}</p>
      )}
      {review.mapsUri && (
        <ExtLink
          href={review.mapsUri}
          locale={locale}
          className="inline-flex min-h-11 items-center gap-1.5 text-[12.5px] font-medium text-[#0A0A0A] underline underline-offset-2"
        >
          {copy.viewOnGoogle}
          <ExternalLink size={12} aria-hidden="true" />
        </ExtLink>
      )}
    </li>
  );
}

export function SampleReviews({
  profile,
  locale,
  className = '',
  replyAnchorId = 'google-reply',
}: {
  profile: PlacesProfile;
  locale: UiLocale;
  className?: string;
  replyAnchorId?: string;
}) {
  const copy = useCopy(locale);
  const headingId = useId();
  const mapsHref = profile.mapsUri ?? placeMapsUrl(profile.placeId);
  return (
    <section aria-labelledby={headingId} className={`bz-card ${className}`}>
      <div className="border-b border-[#EDEDED] p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id={headingId} className="bz-h-tight text-[16px]">
            {copy.reviewsTitle}
          </h2>
          <Badge kind="ghost" dot={false}>
            {profile.reviews.length}
          </Badge>
        </div>
        <p className="mt-1.5 text-[12.5px] leading-[1.55] text-[#525252]">{copy.reviewsNote}</p>
      </div>
      {profile.reviews.length === 0 ? (
        <p className="p-4 text-[13px] leading-[1.6] text-[#525252] sm:p-5">{copy.reviewsEmpty}</p>
      ) : (
        <ul className="divide-y divide-[#EDEDED]">
          {profile.reviews.map((review, index) => (
            <ReviewRow key={`${review.publishedAt ?? 'r'}-${index}`} review={review} locale={locale} />
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-1 border-t border-[#EDEDED] p-4 sm:p-5">
        <ExtLink
          href={mapsHref}
          locale={locale}
          className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-[#0A0A0A] underline underline-offset-2"
        >
          {copy.allReviews}
          <ExternalLink size={13} aria-hidden="true" />
        </ExtLink>
        <a
          href={`#${replyAnchorId}`}
          className="inline-flex min-h-11 items-center gap-1.5 text-[13px] text-[#0A0A0A] underline underline-offset-2"
        >
          {copy.replyLink}
          <ArrowRight size={13} aria-hidden="true" />
        </a>
        <p className="text-[12px] font-normal text-[#525252]">
          {copy.source}: {copy.sourceName}
        </p>
      </div>
    </section>
  );
}
