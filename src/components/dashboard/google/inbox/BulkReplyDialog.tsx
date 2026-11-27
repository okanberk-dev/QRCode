'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, RotateCcw, Send, Star, X } from 'lucide-react';
import { AlertBanner, Modal } from '@/components/ui';
import { ReplyRiskNotice, useReplyRisk } from '@/components/reply/ReplyRiskNotice';
import { draftOpeningClient, errorCodeOf, inboxErrorMessage } from './inbox-client';

interface BulkItem {
  reviewId: string;
  reviewerName: string | null;
  rating: number | null;
  originalText: string | null;
  body: string;
  bannedFound: string[];
  problem: string | null;
}

interface JobProgress {
  id: string;
  status: 'running' | 'paused' | 'done';
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  pending: number;
  items: { reviewId: string; status: string; errorCode: string | null }[];
}

type Phase = 'drafting' | 'review' | 'submitting' | 'sending' | 'done';

const CHUNK = 10;

function ItemEditor({
  item,
  locale,
  onChange,
  onRemove,
}: {
  item: BulkItem;
  locale: 'tr' | 'en';
  onChange: (body: string) => void;
  onRemove: () => void;
}) {
  const isTr = locale === 'tr';
  const risk = useReplyRisk(item.body);
  return (
    <li className="space-y-2 rounded-[16px] bg-[#F6F6F6] p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-medium text-pn-ink">{item.reviewerName || (isTr ? 'Google kullanıcısı' : 'Google user')}</span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-pn-accent-soft px-2 py-0.5 text-[12px] font-medium text-pn-accent">
              <Star size={11} aria-hidden="true" fill="currentColor" /> {item.rating ?? '–'}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 break-words text-[13px] leading-[1.5] text-[#737373]">
            {item.originalText ?? (isTr ? 'Yalnız puan verdi.' : 'Rating only.')}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="bz-btn bz-btn-sm min-h-11 shrink-0 bg-white hover:bg-[#EDEDED] sm:min-h-9"
          aria-label={isTr ? 'Bu yorumu listeden çıkar' : 'Remove this review'}
        >
          <X size={12} aria-hidden="true" />
          {isTr ? 'Çıkar' : 'Remove'}
        </button>
      </div>
      <textarea
        className="bz-input min-h-[76px] resize-y rounded-[16px] border-0 text-[16px] focus:shadow-[0_0_0_2px_#111110] sm:text-[14px]"
        value={item.body}
        onChange={(e) => onChange(e.target.value.slice(0, 4096))}
        aria-label={isTr ? 'Yanıt metni' : 'Reply text'}
        aria-invalid={risk.blocked || Boolean(item.problem) || undefined}
      />
      <ReplyRiskNotice risk={risk} locale={locale} />
      {item.bannedFound.length > 0 && (
        <p className="text-[12px] text-[#D92D20]">
          {isTr ? 'Yasaklı ifade: ' : 'Banned phrase: '}
          {item.bannedFound.join(', ')}
        </p>
      )}
      {item.problem && <p role="alert" className="text-[12px] text-[#D92D20]">{item.problem}</p>}
    </li>
  );
}

export function BulkReplyDialog({
  restaurantId,
  locale,
  reviewIds,
  resumeJobId,
  onClose,
  onFinished,
}: {
  restaurantId: string;
  locale: 'tr' | 'en';
  reviewIds: string[];
  /** Show the progress of a job that is already running. */
  resumeJobId?: string | null;
  onClose: () => void;
  /** A job finished (some replies were published): reload the list. */
  onFinished: () => void;
}) {
  const isTr = locale === 'tr';
  const base = `/api/restaurants/${restaurantId}/google/business/reviews`;
  const [phase, setPhase] = useState<Phase>(resumeJobId ? 'sending' : 'drafting');
  const [items, setItems] = useState<BulkItem[]>([]);
  const [drafted, setDrafted] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(resumeJobId ?? null);
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const startedRef = useRef(false);
  const finishedRef = useRef(false);

  // 1) Drafts, 10 at a time; every call gets the openings already used.
  useEffect(() => {
    if (resumeJobId || startedRef.current) return;
    startedRef.current = true;
    (async () => {
      const openings: string[] = [];
      for (let i = 0; i < reviewIds.length; i += CHUNK) {
        const chunk = reviewIds.slice(i, i + CHUNK);
        try {
          const res = await fetch(`${base}/bulk-drafts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reviewIds: chunk, avoidOpenings: openings.slice(-40) }),
          });
          const data = await res.json().catch(() => null);
          if (!res.ok) {
            setError(inboxErrorMessage(errorCodeOf(data), locale));
            break;
          }
          const next: BulkItem[] = (data?.drafts ?? []).map(
            (d: { reviewId: string; body: string; bannedFound: string[]; review: { reviewerName: string | null; rating: number | null; originalText: string | null } }) => ({
              reviewId: d.reviewId,
              reviewerName: d.review?.reviewerName ?? null,
              rating: d.review?.rating ?? null,
              originalText: d.review?.originalText ?? null,
              body: d.body,
              bannedFound: d.bannedFound ?? [],
              problem: null,
            }),
          );
          next.forEach((n) => openings.push(draftOpeningClient(n.body)));
          setItems((prev) => [...prev, ...next]);
          setDrafted((n) => n + chunk.length);
        } catch {
          setError(isTr ? 'Taslaklar hazırlanırken bağlantı kesildi.' : 'Connection lost while preparing drafts.');
          break;
        }
      }
      setPhase('review');
    })();
  }, [base, isTr, locale, resumeJobId, reviewIds]);

  // 3) Progress polling while the server queue sends.
  const poll = useCallback(async () => {
    if (!jobId) return;
    try {
      const res = await fetch(`${base}/bulk-reply/${jobId}`);
      if (!res.ok) return;
      const data: JobProgress = await res.json();
      setProgress(data);
      if (data.status !== 'running' || data.pending === 0) {
        setPhase('done');
        if (!finishedRef.current && data.sent > 0) {
          finishedRef.current = true;
          onFinished();
        }
      }
    } catch {
      /* next tick retries */
    }
  }, [base, jobId, onFinished]);

  useEffect(() => {
    if (phase !== 'sending' || !jobId) return;
    void poll();
    const t = window.setInterval(() => void poll(), 1500);
    return () => window.clearInterval(t);
  }, [phase, jobId, poll]);

  // 2) One confirmation → server queue.
  const submit = async () => {
    const list = items.filter((i) => i.body.trim().length >= 2);
    if (list.length === 0 || !confirmed) return;
    setPhase('submitting');
    setError(null);
    try {
      const res = await fetch(`${base}/bulk-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: list.map((i) => ({ reviewId: i.reviewId, comment: i.body.trim() })),
          confirmResponsibility: true,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 400 && Array.isArray(data?.rejected)) {
        const byId = new Map<string, { code: string; messages?: string[]; phrases?: string[] }>(
          data.rejected.map((r: { reviewId: string; code: string; messages?: string[]; phrases?: string[] }) => [r.reviewId, r]),
        );
        setItems((prev) =>
          prev.map((i) => {
            const r = byId.get(i.reviewId);
            if (!r) return { ...i, problem: null };
            const text = r.messages?.length ? r.messages.join(' ') : inboxErrorMessage(r.code, locale);
            return { ...i, problem: r.phrases?.length ? `${text} (${r.phrases.join(', ')})` : text };
          }),
        );
        setError(isTr ? 'İşaretli yanıtları düzelt ya da listeden çıkar.' : 'Fix or remove the marked replies.');
        setPhase('review');
        return;
      }
      if (!res.ok || !data?.jobId) {
        setError(inboxErrorMessage(errorCodeOf(data), locale));
        setPhase('review');
        return;
      }
      setJobId(data.jobId);
      setPhase('sending');
    } catch {
      setError(isTr ? 'Bağlantı hatası. Tekrar dene.' : 'Connection error. Try again.');
      setPhase('review');
    }
  };

  const retryFailed = async () => {
    if (!jobId) return;
    setError(null);
    try {
      const res = await fetch(`${base}/bulk-reply/${jobId}/retry`, { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(inboxErrorMessage(errorCodeOf(data), locale));
        return;
      }
      finishedRef.current = false;
      setPhase('sending');
    } catch {
      setError(isTr ? 'Bağlantı hatası. Tekrar dene.' : 'Connection error. Try again.');
    }
  };

  const percent = progress && progress.total > 0
    ? Math.round(((progress.sent + progress.failed + progress.skipped) / progress.total) * 100)
    : phase === 'drafting' && reviewIds.length > 0
      ? Math.round((drafted / reviewIds.length) * 100)
      : 0;
  const editable = phase === 'review';
  const sendable = items.filter((i) => i.body.trim().length >= 2).length;
  const failedItems = progress?.items.filter((i) => i.status === 'failed') ?? [];

  return (
    <Modal
      title={isTr ? 'Toplu yanıt' : 'Bulk reply'}
      onClose={onClose}
      size={720}
      closeGuard={() => editable && items.length > 0}
      closeConfirm={
        isTr
          ? { title: 'Taslaklar kapatılsın mı?', body: 'Gönderilmemiş taslaklar kaydedildi; yorumların üzerinde de görünür.', confirm: 'Kapat', cancel: 'Vazgeç' }
          : { title: 'Close the drafts?', body: 'Unsent drafts are saved and shown on the reviews too.', confirm: 'Close', cancel: 'Keep editing' }
      }
      footer={
        editable ? (
          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-2 text-[12px] leading-relaxed text-[#737373]">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-pn-accent"
              />
              <span>
                {isTr
                  ? `Listedeki ${sendable} yanıtın her birini okudum; içeriklerinden bizzat sorumlu olduğumu ve tehdit, hakaret, iftira ya da yasa dışı ifade içermediklerini onaylıyorum (`
                  : `I have read each of the ${sendable} replies; I am solely responsible for them and they contain no threat, insult, defamation or unlawful statement (`}
                <Link href={`/${locale}/kabul-edilebilir-kullanim`} target="_blank" rel="noopener" className="font-medium text-pn-ink underline-offset-2 hover:underline">
                  {isTr ? 'Kabul Edilebilir Kullanım Politikası' : 'Acceptable Use Policy'}
                </Link>
                ).
              </span>
            </label>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={onClose} className="bz-btn min-h-11 sm:min-h-10">
                {isTr ? 'Vazgeç' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={!confirmed || sendable === 0}
                className="bz-btn-primary min-h-11 disabled:opacity-60 sm:min-h-9"
              >
                <Send size={14} aria-hidden="true" />
                {isTr ? `Seçilenleri Google'a gönder (${sendable})` : `Send selected to Google (${sendable})`}
              </button>
            </div>
          </div>
        ) : phase === 'done' ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {failedItems.length > 0 && (
              <button type="button" onClick={() => void retryFailed()} className="bz-btn min-h-11 sm:min-h-10">
                <RotateCcw size={14} aria-hidden="true" />
                {isTr ? `Başarısızları tekrar dene (${failedItems.length})` : `Retry failed (${failedItems.length})`}
              </button>
            )}
            <button type="button" onClick={onClose} className="bz-btn-primary min-h-11 sm:min-h-10">
              {isTr ? 'Kapat' : 'Close'}
            </button>
          </div>
        ) : phase === 'sending' ? (
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className="bz-btn min-h-11 sm:min-h-10">
              {isTr ? 'Arka planda devam etsin' : 'Keep going in the background'}
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-3">
        {error && <AlertBanner kind="danger" onDismiss={() => setError(null)}>{error}</AlertBanner>}

        {(phase === 'drafting' || phase === 'sending' || phase === 'submitting' || phase === 'done') && (
          <div>
            <div className="flex items-center justify-between text-[13px] text-[#525252]">
              <span>
                {phase === 'drafting'
                  ? isTr ? `Taslaklar hazırlanıyor… ${drafted}/${reviewIds.length}` : `Preparing drafts… ${drafted}/${reviewIds.length}`
                  : phase === 'submitting'
                    ? isTr ? 'Kontrol ediliyor…' : 'Checking…'
                    : progress
                      ? isTr
                        ? `Gönderilen ${progress.sent} · Başarısız ${progress.failed} · Atlanan ${progress.skipped} · Toplam ${progress.total}`
                        : `Sent ${progress.sent} · Failed ${progress.failed} · Skipped ${progress.skipped} · Total ${progress.total}`
                      : isTr ? 'Sıraya alındı…' : 'Queued…'}
              </span>
              <span className="tabular-nums">%{percent}</span>
            </div>
            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/[0.06]"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <div className="h-full rounded-full bg-pn-accent transition-[width] duration-300" style={{ width: `${percent}%` }} />
            </div>
            {phase === 'sending' && (
              <p className="mt-2 text-[12px] text-[#737373]">
                {isTr
                  ? "Yanıtlar Google'ın sınırlarına uygun şekilde sırayla gönderiliyor. Bu pencereyi kapatsan da gönderim sürer."
                  : "Replies are sent one by one within Google's limits. Sending continues even if you close this window."}
              </p>
            )}
            {phase === 'done' && progress && (
              <div className="mt-3 space-y-2">
                {progress.status === 'paused' ? (
                  <AlertBanner kind="warn">
                    {isTr
                      ? 'Gönderim durakladı (Google bağlantısı ya da günlük sınır). Kalanlar sonra otomatik gönderilir; bağlantı koptuysa yeniden bağlayıp "Tekrar dene"ye bas.'
                      : 'Sending paused (Google connection or daily limit). The rest is sent automatically later; if the connection broke, reconnect and press "Retry".'}
                  </AlertBanner>
                ) : (
                  <p className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#23863A]">
                    <CheckCircle2 size={14} aria-hidden="true" />
                    {isTr ? `${progress.sent} yanıt yayınlandı.` : `${progress.sent} replies published.`}
                  </p>
                )}
                {failedItems.length > 0 && (
                  <ul className="space-y-1 text-[12px] text-[#D92D20]">
                    {failedItems.slice(0, 10).map((f) => (
                      <li key={f.reviewId}>• {inboxErrorMessage(f.errorCode, locale)}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {(phase === 'review' || phase === 'drafting') && items.length > 0 && (
          <>
            <p className="text-[13px] text-[#525252]">
              {isTr
                ? 'Her taslağı oku, gerekirse düzenle ya da listeden çıkar. 1-3 yıldızlı yorumlar burada yer almaz; onları tek tek yanıtla.'
                : 'Read each draft, edit or remove it. 1–3 star reviews are not included; answer those one by one.'}
            </p>
            <ul className="space-y-2">
              {items.map((item) => (
                <ItemEditor
                  key={item.reviewId}
                  item={item}
                  locale={locale}
                  onChange={(body) =>
                    setItems((prev) => prev.map((i) => (i.reviewId === item.reviewId ? { ...i, body, problem: null, bannedFound: [] } : i)))
                  }
                  onRemove={() => setItems((prev) => prev.filter((i) => i.reviewId !== item.reviewId))}
                />
              ))}
            </ul>
          </>
        )}
        {phase === 'review' && items.length === 0 && (
          <p className="text-[13px] text-[#737373]">{isTr ? 'Gönderilecek yanıt kalmadı.' : 'No replies left to send.'}</p>
        )}
        {phase === 'drafting' && items.length === 0 && (
          <div className="flex items-center gap-2 text-[13px] text-[#737373]">
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            {isTr ? 'İlk taslaklar yazılıyor…' : 'Writing the first drafts…'}
          </div>
        )}
      </div>
    </Modal>
  );
}
