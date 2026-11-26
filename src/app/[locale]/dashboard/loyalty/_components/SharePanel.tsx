'use client';

// Share the loyalty card (§60): the join link, its QR for the counter and a
// printable A5 poster. The poster tells customers how the card works — and
// never asks for a review (Google policy).
import { useState } from 'react';
import { Check, Copy, Download, ExternalLink, Printer } from 'lucide-react';
import { AlertBanner } from '@/components/ui';
import { activeRewards, earnRuleLine, loyaltyJoinPath, rewardRuleLine } from '@/lib/loyalty';
import type { ProgramDto } from './loyalty-client';

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export default function SharePanel({
  locale,
  restaurantId,
  restaurantName,
  program,
  baseUrl,
}: {
  locale: 'tr' | 'en';
  restaurantId: string;
  restaurantName: string;
  program: ProgramDto;
  baseUrl: string;
}) {
  const tr = locale === 'tr';
  const [copied, setCopied] = useState(false);
  const joinUrl = `${baseUrl}${loyaltyJoinPath(program.slug)}`;
  const qr = `/api/restaurants/${restaurantId}/loyalty/qr`;
  const rules = activeRewards(program.rewards).map((r) => rewardRuleLine(program.kind, r, locale));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  const printPoster = () => {
    const w = window.open('', '_blank', 'width=720,height=900');
    if (!w) return;
    const qrSrc = `${window.location.origin}${qr}?format=svg&style=plain`;
    w.document.write(`<!doctype html><html lang="${tr ? 'tr' : 'en'}"><head><meta charset="utf-8"><title>${esc(program.name)}</title>
<style>
@page { size: A5 portrait; margin: 12mm; }
* { box-sizing: border-box; }
body { font-family: Inter, -apple-system, 'Segoe UI', Arial, sans-serif; color: #0A0A0A; margin: 0; }
.wrap { border: 2px solid #0A0A0A; border-radius: 18px; padding: 28px; text-align: center; }
.eyebrow { font-size: 12px; letter-spacing: .16em; text-transform: uppercase; color: #525252; }
h1 { font-size: 30px; margin: 8px 0 4px; }
.lead { font-size: 15px; color: #262626; margin: 0 0 18px; }
img { width: 62%; max-width: 260px; }
ul { list-style: none; padding: 0; margin: 18px 0 0; font-size: 15px; }
li { margin: 6px 0; }
.foot { margin-top: 18px; font-size: 11px; color: #737373; }
</style></head><body><div class="wrap">
<div class="eyebrow">${esc(restaurantName)}</div>
<h1>${esc(program.name)}</h1>
<p class="lead">${esc(tr ? 'Telefonunuzla okutun, kartınız saniyeler içinde açılsın.' : 'Scan with your phone to open your card in seconds.')}</p>
<img src="${esc(qrSrc)}" alt="QR">
<ul>${rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
<p class="lead" style="margin-top:12px">${esc(earnRuleLine(program, locale))}</p>
<div class="foot">${esc(joinUrl.replace(/^https?:\/\//, ''))}</div>
</div><script>window.addEventListener('load',function(){setTimeout(function(){window.print()},300)})</script></body></html>`);
    w.document.close();
  };

  return (
    <div className="grid gap-4 md:grid-cols-[280px_1fr]">
      <div className="bz-card flex flex-col items-center p-5">
        <img src={`${qr}?format=svg&style=plain`} alt={tr ? 'Katılım QR kodu' : 'Join QR code'} width={220} height={220} className="h-[220px] w-[220px]" />
        <div className="mt-4 grid w-full gap-2">
          <a href={`${qr}?format=png`} className="bz-btn-primary inline-flex items-center justify-center gap-1.5" download>
            <Download size={14} /> {tr ? 'Tasarımlı PNG' : 'Designed PNG'}
          </a>
          <a href={`${qr}?format=svg&style=plain&download=1`} className="bz-btn-ghost inline-flex items-center justify-center gap-1.5" download>
            <Download size={14} /> SVG
          </a>
          <button type="button" className="bz-btn-ghost inline-flex items-center justify-center gap-1.5" onClick={printPoster}>
            <Printer size={14} /> {tr ? 'A5 afiş yazdır' : 'Print A5 poster'}
          </button>
        </div>
      </div>
      <div className="space-y-4">
        <div className="bz-card p-5">
          <p className="text-[14px] font-semibold text-[#0A0A0A]">{tr ? 'Katılım bağlantısı' : 'Join link'}</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input readOnly value={joinUrl} className="bz-input min-w-0 flex-1 font-mono text-[12.5px]" onFocus={(e) => e.currentTarget.select()} aria-label={tr ? 'Katılım bağlantısı' : 'Join link'} />
            <div className="flex gap-2">
              <button type="button" className="bz-btn-ghost inline-flex items-center gap-1.5" onClick={() => void copy()}>
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? (tr ? 'Kopyalandı' : 'Copied') : tr ? 'Kopyala' : 'Copy'}
              </button>
              <a href={joinUrl} target="_blank" rel="noopener noreferrer" className="bz-btn-ghost inline-flex items-center gap-1.5">
                <ExternalLink size={14} /> {tr ? 'Aç' : 'Open'}
              </a>
            </div>
          </div>
          {!program.isActive && (
            <div className="mt-3">
              <AlertBanner kind="warn">
                {tr ? 'Program duraklatılmış; bağlantı yayına alana kadar açılmaz.' : 'The programme is paused; the link opens once it is live.'}
              </AlertBanner>
            </div>
          )}
        </div>
        <div className="bz-card p-5">
          <p className="text-[14px] font-semibold text-[#0A0A0A]">{tr ? 'Nereye koymalı?' : 'Where to put it'}</p>
          <ul className="mt-2 space-y-1.5 text-[13.5px] text-[#262626]">
            <li>• {tr ? 'Kasanın yanına, ödeme yapılan yere' : 'Next to the till, where people pay'}</li>
            <li>• {tr ? 'Paket servis poşetine ve fişin altına' : 'On takeaway bags and receipts'}</li>
            <li>• {tr ? 'Instagram profil bağlantısına ve WhatsApp durumuna' : 'In your Instagram bio link and WhatsApp status'}</li>
          </ul>
          <p className="mt-3 text-[12.5px] text-[#737373]">
            {tr
              ? 'Yorum QR’ınızla aynı karta koymayın ve yorum karşılığı damga vermeyin: Google, yorum karşılığında ödüle izin vermez.'
              : 'Keep it apart from your review QR and never stamp for a review: Google does not allow rewards for reviews.'}
          </p>
        </div>
      </div>
    </div>
  );
}
