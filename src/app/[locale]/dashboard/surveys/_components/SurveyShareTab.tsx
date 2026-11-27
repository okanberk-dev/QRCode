'use client';

// "Paylaş" tab of the survey detail page: the customer link (copy / WhatsApp),
// the QR code with ONE primary download, and a compact info card. A draft
// gets a note here; its "Publish" button is the page header's (one place).

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, MessageCircle } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { AlertBanner, PulseMenu, PulseMenuItem } from '@/components/ui';
import { MENU_TOUCH } from './menu-touch';
import { formatFullDateTimeInTimeZone } from '@/lib/timezone';
import { copyText, type DetailSurvey } from './survey-owner-ui';

interface Props {
  locale: Locale;
  survey: DetailSurvey;
  publicUrl: string;
}

/** Print-ready designed QR (the one primary action) and the other formats. */
const qrUrl = (id: string, query: string) => `/api/surveys/${id}/qr?${query}`;

function triggerDownload(url: string) {
  const a = document.createElement('a');
  a.href = url;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function SurveyShareTab({ locale, survey, publicUrl }: Props) {
  const isTr = locale === 'tr';
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function handleCopy() {
    const ok = await copyText(publicUrl);
    setCopyFailed(!ok);
    setCopied(ok);
    if (timer.current) clearTimeout(timer.current);
    if (ok) timer.current = setTimeout(() => setCopied(false), 1500);
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${survey.title} ${publicUrl}`)}`;
  const dateOf = (iso: string) => formatFullDateTimeInTimeZone(iso, locale);

  const infoRows: Array<[string, string]> = [
    [isTr ? 'Soru' : 'Questions', String(survey.questions.length)],
    [isTr ? 'Yanıt' : 'Responses', String(survey._count.responses)],
    [isTr ? 'Oluşturuldu' : 'Created', dateOf(survey.createdAt)],
  ];
  if (survey.publishedAt) {
    infoRows.push([isTr ? 'Yayınlandı' : 'Published', dateOf(survey.publishedAt)]);
  }
  infoRows.push([
    isTr ? 'İletişim bilgisi' : 'Contact details',
    survey.collectContact ? (isTr ? 'İstenir' : 'Asked') : isTr ? 'İstenmez' : 'Not asked',
  ]);
  if (survey.couponCode) {
    infoRows.push([isTr ? 'Kupon' : 'Coupon', survey.couponCode]);
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="bz-card p-5 sm:p-6" aria-labelledby="survey-link-title">
          <h3 id="survey-link-title" className="bz-h-tight text-base">
            {isTr ? 'Müşteri linki' : 'Customer link'}
          </h3>

          {!survey.isPublished && (
            <div className="mt-3">
              <AlertBanner kind="warn">
                {isTr
                  ? 'Bu anket henüz yayında değil. Yayınlayana kadar müşteriler linki açınca "şu anda yanıt almıyor" mesajını görür.'
                  : 'This survey isn\'t live yet. Until you publish it, customers who open the link will see "not accepting responses right now".'}
              </AlertBanner>
            </div>
          )}

          <label htmlFor="survey-link-field" className="sr-only">
            {isTr ? 'Müşteri linki' : 'Customer link'}
          </label>
          <input
            id="survey-link-field"
            readOnly
            value={publicUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="bz-input tabular-nums mt-4 min-h-11 w-full text-[13px] sm:min-h-9"
          />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="bz-btn-primary min-h-11 flex-1 gap-2 sm:min-h-9 sm:flex-none"
            >
              {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
              {copied ? (isTr ? 'Kopyalandı' : 'Copied') : isTr ? 'Kopyala' : 'Copy'}
            </button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="bz-btn-ghost min-h-11 flex-1 gap-2 sm:min-h-9 sm:flex-none"
            >
              <MessageCircle size={14} aria-hidden="true" />
              {isTr ? "WhatsApp'ta paylaş" : 'Share on WhatsApp'}
            </a>
          </div>
          {copyFailed && (
            <p className="mt-2 text-xs text-[#991B1B]" role="alert">
              {isTr
                ? 'Link kopyalanamadı. Alandaki linki seçip elle kopyalayabilirsin.'
                : "Couldn't copy the link. Select it in the field and copy it by hand."}
            </p>
          )}
          <span className="sr-only" role="status" aria-live="polite">
            {copied ? (isTr ? 'Link kopyalandı' : 'Link copied') : ''}
          </span>
        </section>

        <section className="bz-card p-5 sm:p-6" aria-labelledby="survey-qr-title">
          <h3 id="survey-qr-title" className="bz-h-tight text-base">
            {isTr ? 'QR kod' : 'QR code'}
          </h3>
          <p className="mt-1 text-xs text-[#737373]">
            {isTr
              ? 'Masa kartına, fatura altına veya kasaya yazdırıp koy.'
              : 'Print it for table cards, receipts or the counter.'}
          </p>
          <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="flex h-40 w-40 shrink-0 items-center justify-center rounded-[20px] border border-pn-line bg-white">
              {/* Inline SVG preview straight from the API: a raw <img> avoids
                  next/image for an already authorised, rate-limited SVG.
                  `preview=1` returns the frame-less variant that stays legible
                  at this size. */}
              <img
                src={qrUrl(survey.id, 'format=svg&preview=1&width=400')}
                alt={isTr ? `${survey.title} QR kodu` : `QR code for ${survey.title}`}
                width={160}
                height={160}
                className="h-full w-full"
              />
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto">
              <a
                href={qrUrl(survey.id, 'format=png&width=1200')}
                className="bz-btn-primary min-h-11 gap-2 sm:min-h-9"
              >
                <Download size={14} aria-hidden="true" />
                {isTr ? "QR'ı indir (baskıya hazır PNG)" : 'Download QR (print-ready PNG)'}
              </a>
              <PulseMenu
                align="start"
                trigger={
                  <button type="button" className="bz-btn-ghost min-h-11 w-full sm:min-h-9">
                    {isTr ? 'Diğer biçimler' : 'Other formats'}
                  </button>
                }
                className={`min-w-[260px] ${MENU_TOUCH}`}
              >
                <PulseMenuItem
                  icon={<Download size={14} />}
                  onSelect={() => triggerDownload(qrUrl(survey.id, 'format=svg&width=1000'))}
                >
                  {isTr ? 'Tasarımlı QR, vektör dosya (büyük baskı için)' : 'Designed QR, vector file (for large prints)'}
                </PulseMenuItem>
                <PulseMenuItem
                  icon={<Download size={14} />}
                  onSelect={() => triggerDownload(qrUrl(survey.id, 'format=png&style=plain&width=1200'))}
                >
                  {isTr ? 'Sade QR, resim (PNG)' : 'Plain QR, image (PNG)'}
                </PulseMenuItem>
                <PulseMenuItem
                  icon={<Download size={14} />}
                  onSelect={() => triggerDownload(qrUrl(survey.id, 'format=svg&style=plain&width=1000'))}
                >
                  {isTr ? 'Sade QR, vektör dosya' : 'Plain QR, vector file'}
                </PulseMenuItem>
              </PulseMenu>
            </div>
          </div>
        </section>
      </div>

      <section className="bz-card p-5 sm:p-6" aria-labelledby="survey-info-title">
        <h3 id="survey-info-title" className="bz-h-tight text-base">
          {isTr ? 'Anket bilgileri' : 'Survey info'}
        </h3>
        <dl className="mt-3 grid gap-x-8 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {infoRows.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-3 text-[13px]">
              <dt className="text-[#737373]">{label}</dt>
              <dd className="text-right font-medium text-pn-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
