'use client';

// CLAUDE.md §38.99 — Owner campaign compose modal.
//
// Step 1: subject + body + locale
// Step 2: live recipient count preview (debounced fetch /preview-recipients)
// Submit: "Taslak olarak kaydet" + "Şimdi gönder" (useConfirmDialog)

import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, AlertBanner } from '@/components/ui';
import { Loader2, Mail, Users, Send, Save, AlertTriangle } from 'lucide-react';

interface Props {
  isTr: boolean;
  restaurantId: string;
  onClose: () => void;
  onCreated: (campaignId: string) => void;
}

interface PreviewResult {
  count: number;
  samplePreview: string[];
}

export function CampaignComposeModal({ isTr, restaurantId, onClose, onCreated }: Props) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [locale, setLocale] = useState<'tr' | 'en'>(isTr ? 'tr' : 'en');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState<'draft' | 'send' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial recipient preview (independent of form fields).
  useEffect(() => {
    let cancelled = false;
    setPreviewLoading(true);
    (async () => {
      try {
        const res = await fetch('/api/customer-campaigns/preview-recipients', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ restaurantId, onlyMarketingConsent: true }),
        });
        if (!res.ok) throw new Error('preview_failed');
        const data = await res.json();
        if (!cancelled) {
          setPreview({
            count: typeof data?.count === 'number' ? data.count : 0,
            samplePreview: Array.isArray(data?.samplePreview) ? data.samplePreview : [],
          });
        }
      } catch (err) {
        if (!cancelled) {
          setPreview({ count: 0, samplePreview: [] });
          console.warn('[campaign-compose] preview', err);
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    const debounceHandle = debounceRef.current;
    return () => {
      cancelled = true;
      if (debounceHandle) clearTimeout(debounceHandle);
    };
  }, [restaurantId]);

  const subjectValid = subject.trim().length >= 1 && subject.trim().length <= 150;
  const bodyValid = body.trim().length >= 1 && body.length <= 10000;
  const formValid = subjectValid && bodyValid && !!preview && preview.count > 0;

  const submit = async (action: 'draft' | 'send') => {
    if (action === 'send' && !confirmSend) {
      setConfirmSend(true);
      return;
    }
    setError(null);
    setSubmitting(action);
    try {
      // 1. Create draft
      const createRes = await fetch('/api/customer-campaigns', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          subject: subject.trim(),
          body,
          locale,
        }),
      });
      if (!createRes.ok) {
        const errBody = await createRes.json().catch(() => ({}));
        if (errBody?.error === 'campaigns_disabled') {
          throw new Error(
            isTr
              ? 'Kampanya özelliği bu işletme için kapalı.'
              : 'Campaigns feature is disabled for this business.',
          );
        }
        throw new Error(errBody?.error || 'create_failed');
      }
      const createData = await createRes.json();
      const campaignId: string | undefined = createData?.campaign?.id;
      if (!campaignId) throw new Error('campaign_id_missing');

      // 2. If "send" action, trigger send pipeline.
      if (action === 'send') {
        const sendRes = await fetch(`/api/customer-campaigns/${campaignId}/send`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ onlyMarketingConsent: true }),
        });
        if (!sendRes.ok) {
          const errBody = await sendRes.json().catch(() => ({}));
          if (errBody?.error === 'rate_limited') {
            throw new Error(
              isTr
                ? 'Çok hızlı gönderim — biraz bekleyip tekrar dene.'
                : 'Too many sends — please wait a moment and try again.',
            );
          }
          if (errBody?.error === 'no_eligible_recipients') {
            throw new Error(
              errBody?.message ||
                (isTr
                  ? 'Pazarlama onayı veren müşteri bulunamadı.'
                  : 'No marketing-consented customers found.'),
            );
          }
          throw new Error(errBody?.error || 'send_failed');
        }
      }

      onCreated(campaignId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown_error');
    } finally {
      setSubmitting(null);
      setConfirmSend(false);
    }
  };

  const subjectCharColor = useMemo(() => {
    const len = subject.length;
    if (len > 140) return 'text-[#92400E]';
    if (len > 130) return 'text-[#525252]';
    return 'text-[#A3A3A3]';
  }, [subject.length]);

  const bodyCharColor = useMemo(() => {
    const len = body.length;
    if (len > 9500) return 'text-[#92400E]';
    if (len > 8000) return 'text-[#525252]';
    return 'text-[#A3A3A3]';
  }, [body.length]);

  return (
    <Modal
      size={640}
      title={isTr ? 'Yeni kampanya' : 'New campaign'}
      onClose={onClose}
      ariaLabel={isTr ? 'Yeni kampanya oluştur' : 'Create new campaign'}
    >
      <div className="space-y-4">
        {/* KVKK disclaimer */}
        <AlertBanner kind="info" icon={<Users size={14} strokeWidth={2.2} />}>
          {isTr
            ? 'Sadece pazarlama onayı veren müşterilere gönderilir. KVKK gereği opt-in zorunludur.'
            : 'Only sent to marketing-consented customers. KVKK requires opt-in consent.'}
        </AlertBanner>

        {/* Recipient count card */}
        <div className="rounded-[12px] border border-[#EDEDED] bg-[#FAFAFA] p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="pulse-eyebrow text-[10.5px] text-[#737373] mb-1">
                {isTr ? 'ALICI SAYISI' : 'RECIPIENT COUNT'}
              </div>
              <div className="flex items-center gap-2">
                {previewLoading ? (
                  <Loader2 size={20} className="animate-spin text-[#A3A3A3]" />
                ) : (
                  <span className="bz-h-tight text-[28px] tabular-nums">
                    {preview?.count.toLocaleString(isTr ? 'tr-TR' : 'en-US') ?? '—'}
                  </span>
                )}
                <span className="text-[12px] text-[#737373]">
                  {isTr ? 'müşteri' : 'customers'}
                </span>
              </div>
              {preview && preview.samplePreview.length > 0 ? (
                <div className="text-[11px] text-[#737373] mt-1.5 bz-mono">
                  {preview.samplePreview.join(' · ')}
                  {preview.count > preview.samplePreview.length
                    ? ` · +${preview.count - preview.samplePreview.length}`
                    : ''}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {preview && preview.count === 0 && !previewLoading ? (
          <AlertBanner kind="warn" icon={<AlertTriangle size={14} strokeWidth={2.2} />}>
            {isTr
              ? 'Bu işletmede pazarlama onayı veren e-postalı müşteri yok. Müşterilerin yorum sırasında "İletişim izni" kutusunu işaretlemesi gerekiyor.'
              : 'No marketing-consented customers with email in this business. Customers must check the "Marketing consent" box during review.'}
          </AlertBanner>
        ) : null}

        {/* Subject */}
        <div>
          <label className="block bz-h-tight text-[12px] mb-1.5" htmlFor="campaign-subject">
            {isTr ? 'Konu' : 'Subject'}
          </label>
          <input
            id="campaign-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={150}
            placeholder={isTr ? 'Yeni menümüzü keşfet…' : 'Discover our new menu…'}
            className="bz-input w-full"
            autoComplete="off"
            disabled={submitting !== null}
          />
          <div className={`text-right text-[10.5px] bz-mono tabular-nums mt-1 ${subjectCharColor}`}>
            {subject.length}/150
          </div>
        </div>

        {/* Body */}
        <div>
          <label className="block bz-h-tight text-[12px] mb-1.5" htmlFor="campaign-body">
            {isTr ? 'Mesaj' : 'Message'}
          </label>
          <textarea
            id="campaign-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={10000}
            rows={8}
            placeholder={
              isTr
                ? 'Müşterilerine ne söylemek istersin? Selam ile başla, samimi ol.'
                : 'What do you want to say? Start with a greeting, keep it warm.'
            }
            className="bz-input w-full text-[14px] sm:text-[13px] leading-[1.55] resize-y"
            disabled={submitting !== null}
          />
          <div className={`text-right text-[10.5px] bz-mono tabular-nums mt-1 ${bodyCharColor}`}>
            {body.length.toLocaleString(isTr ? 'tr-TR' : 'en-US')}/10.000
          </div>
        </div>

        {/* Locale toggle */}
        <div>
          <label className="block bz-h-tight text-[12px] mb-1.5">
            {isTr ? 'Dil' : 'Language'}
          </label>
          <div className="inline-flex rounded-full border border-[#EDEDED] bg-white p-0.5">
            {(['tr', 'en'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLocale(l)}
                className={`bz-motion-spring px-3 py-1 rounded-full text-[12px] font-medium ${
                  locale === l ? 'bg-[#0A0A0A] text-white' : 'text-[#525252]'
                }`}
              >
                {l === 'tr' ? 'Türkçe' : 'English'}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <AlertBanner kind="danger" onDismiss={() => setError(null)}>
            {error}
          </AlertBanner>
        ) : null}

        {confirmSend ? (
          <AlertBanner kind="warn" icon={<AlertTriangle size={14} strokeWidth={2.2} />}>
            {isTr
              ? `${preview?.count ?? 0} müşteriye e-posta gönderilecek. Onaylıyor musun? Tekrar "Şimdi gönder"e bas.`
              : `Email will be sent to ${preview?.count ?? 0} customers. Confirm? Click "Send now" again.`}
          </AlertBanner>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-[#EDEDED] flex-wrap">
        <button
          type="button"
          onClick={onClose}
          className="bz-btn-ghost px-4 min-h-[40px] text-[12.5px]"
          disabled={submitting !== null}
        >
          {isTr ? 'Vazgeç' : 'Cancel'}
        </button>
        <button
          type="button"
          onClick={() => submit('draft')}
          disabled={!subjectValid || !bodyValid || submitting !== null}
          className="bz-btn-ghost flex items-center gap-1.5 px-4 min-h-[40px] text-[12.5px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting === 'draft' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {isTr ? 'Taslak olarak kaydet' : 'Save as draft'}
        </button>
        <button
          type="button"
          onClick={() => submit('send')}
          disabled={!formValid || submitting !== null}
          className="bz-btn-primary flex items-center gap-1.5 px-4 min-h-[40px] text-[12.5px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting === 'send' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : confirmSend ? (
            <Send size={14} />
          ) : (
            <Mail size={14} />
          )}
          {confirmSend
            ? isTr
              ? 'Onayla ve gönder'
              : 'Confirm & send'
            : isTr
              ? 'Şimdi gönder'
              : 'Send now'}
        </button>
      </div>
    </Modal>
  );
}
