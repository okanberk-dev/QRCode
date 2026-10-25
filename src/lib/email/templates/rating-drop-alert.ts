// Wave C2 (CLAUDE.md §38.194) — haftalık ortalama puanın bir önceki 4-haftalık
// baseline'a göre 0.5+ düştüğü durum. Reputation OS pozisyonu için kritik
// erken-uyarı sinyali. Cron-driven (weekly Mon 11:00 UTC), per-restaurant
// 7g cooldown.

import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderButton, spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

export interface RatingDropAlertParams {
  firstName?: string | null;
  restaurantName: string;
  /** Last 7 days average (1 decimal). */
  currentAvg: number;
  /** Prior 4-week baseline average (1 decimal). */
  baselineAvg: number;
  /** Absolute delta (negative, 1 decimal). */
  delta: number;
  /** Last 7 days review count. */
  reviewCount: number;
  /** Feedback inbox URL. */
  inboxUrl: string;
}

export async function renderRatingDropAlert(
  params: RatingDropAlertParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const firstName = params.firstName ? escapeHtml(params.firstName) : '';
  const restaurantName = escapeHtml(params.restaurantName);

  const subject = isTr
    ? `Puanın bu hafta ${params.delta.toFixed(1)} puan düştü`
    : `Your rating dropped ${Math.abs(params.delta).toFixed(1)} pts this week`;
  const preheader = isTr
    ? `${params.restaurantName} son 7 gün: ${params.currentAvg} (önceki 4 hafta ortalaması ${params.baselineAvg}).`
    : `${params.restaurantName} last 7d: ${params.currentAvg} (prior 4-week baseline ${params.baselineAvg}).`;

  const inlineDefault = isTr ? {
    eyebrow: 'Erken uyarı · Puan düşüşü',
    title: 'Puanın',
    titleAccent: 'düşüyor',
    intro: firstName
      ? `Merhaba <span style="color:${PULSE.graphite};font-weight:500;">${firstName}</span>, <strong>${restaurantName}</strong> için son 7 günde puan ortalaman <strong>${params.currentAvg}</strong> oldu. Önceki 4 haftalık baseline <strong>${params.baselineAvg}</strong> idi — düşüş <strong>${params.delta.toFixed(1)} puan</strong>.`
      : `<strong>${restaurantName}</strong> için son 7 günde puan ortalaman <strong>${params.currentAvg}</strong> oldu. Önceki 4 haftalık baseline <strong>${params.baselineAvg}</strong> idi — düşüş <strong>${params.delta.toFixed(1)} puan</strong>.`,
    cardEyebrow: 'Bu hafta',
    currentLabel: 'Mevcut ortalama',
    baselineLabel: 'Önceki 4 hafta',
    deltaLabel: 'Fark',
    reviewCountLabel: 'Yorum sayısı',
    cta: 'Düşük puanları gör →',
    actionTitle: 'Sıradaki 24 saatte 3 adım',
    action1: 'Son 7 günün 1-3 puanlı yorumlarına yanıt yaz — geç yanıt verilen yorumlar Google\'da kalıcı hasar bırakır.',
    action2: 'Tekrar eden şikayet konularını çıkar (servis, hijyen, hız) — operasyon ekibiyle paylaş.',
    action3: 'Memnun müşterilerden Google yorumu iste — yeni 5\'ler ortalamayı hızlı toparlar.',
  } : {
    eyebrow: 'Early warning · Rating drop',
    title: 'Your rating is',
    titleAccent: 'sliding',
    intro: firstName
      ? `Hi <span style="color:${PULSE.graphite};font-weight:500;">${firstName}</span>, <strong>${restaurantName}</strong> averaged <strong>${params.currentAvg}</strong> over the past 7 days. The prior 4-week baseline was <strong>${params.baselineAvg}</strong> — a drop of <strong>${Math.abs(params.delta).toFixed(1)} points</strong>.`
      : `<strong>${restaurantName}</strong> averaged <strong>${params.currentAvg}</strong> over the past 7 days. The prior 4-week baseline was <strong>${params.baselineAvg}</strong> — a drop of <strong>${Math.abs(params.delta).toFixed(1)} points</strong>.`,
    cardEyebrow: 'This week',
    currentLabel: 'Current average',
    baselineLabel: 'Prior 4-week',
    deltaLabel: 'Delta',
    reviewCountLabel: 'Reviews',
    cta: 'Open low-rating inbox →',
    actionTitle: 'Three moves in the next 24 hours',
    action1: 'Reply to every 1-3 star review from the last 7 days — late replies leave permanent Google damage.',
    action2: 'Extract recurring complaint themes (service, hygiene, speed) and share with operations.',
    action3: 'Ask satisfied customers for a Google review — fresh 5-stars rebalance the average quickly.',
  };

  const merged = await loadMailCopy('rating-drop-alert', locale, inlineDefault);
  const vars = {
    firstName: params.firstName || '',
    restaurantName: params.restaurantName,
    currentAvg: params.currentAvg.toFixed(1),
    baselineAvg: params.baselineAvg.toFixed(1),
    delta: params.delta.toFixed(1),
    reviewCount: params.reviewCount,
  };
  const copy = deepSubstitute(merged, vars, 'html') as typeof inlineDefault;
  const copyText = deepSubstitute(merged, vars, 'text') as typeof inlineDefault;

  const metaCell = (label: string, value: string, accent?: string) => `
    <td class="stack-col" width="33%" valign="top" style="padding:0 8px;">
      <div style="font-family:${FONTS.label};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${PULSE.n500};">${label}</div>
      <div style="margin-top:6px;font-family:${FONTS.heading};font-size:24px;font-weight:500;color:${accent ?? PULSE.graphite};">${value}</div>
    </td>`;

  const content = `
    ${renderEyebrow(copy.eyebrow, PULSE.danger)}
    ${spacer(16)}
    <h1 style="margin:0;font-family:${FONTS.heading};font-size:40px;line-height:1.05;letter-spacing:-0.03em;font-weight:500;color:${PULSE.graphite};">
      ${copy.title} <span style="color:${PULSE.danger};">${copy.titleAccent}</span>
    </h1>
    ${spacer(20)}
    <p style="margin:0;font-family:${FONTS.body};font-size:15px;line-height:1.6;color:${PULSE.n600};">
      ${copy.intro}
    </p>
    ${spacer(28)}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#FEF2F2;border:1px solid #FECACA;border-radius:18px;">
      <tr><td style="padding:24px;">
        <div style="font-family:${FONTS.label};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${PULSE.n600};">${copy.cardEyebrow}</div>
        ${spacer(14)}
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="stack-row">
          <tr>
            ${metaCell(copy.currentLabel, params.currentAvg.toFixed(1) + ' / 5')}
            ${metaCell(copy.baselineLabel, params.baselineAvg.toFixed(1) + ' / 5')}
            ${metaCell(copy.deltaLabel, params.delta.toFixed(1), PULSE.danger)}
          </tr>
        </table>
        ${spacer(12)}
        <div style="font-family:${FONTS.body};font-size:13px;color:${PULSE.n600};">
          ${copy.reviewCountLabel}: <strong style="color:${PULSE.graphite};">${params.reviewCount}</strong>
        </div>
      </td></tr>
    </table>
    ${spacer(28)}
    ${renderButton({ href: params.inboxUrl, label: copy.cta, variant: 'dark' })}
    ${spacer(28)}
    <h2 style="margin:0;font-family:${FONTS.heading};font-size:20px;font-weight:500;color:${PULSE.graphite};">${copy.actionTitle}</h2>
    ${spacer(12)}
    <ol style="margin:0;padding-left:20px;font-family:${FONTS.body};font-size:14px;line-height:1.6;color:${PULSE.n700};">
      <li style="margin-bottom:8px;">${copy.action1}</li>
      <li style="margin-bottom:8px;">${copy.action2}</li>
      <li>${copy.action3}</li>
    </ol>
  `;

  const html = pulseLayout({ subject, preheader, content });
  const text = [
    copyText.eyebrow,
    '',
    `${copy.title} ${copy.titleAccent}`,
    '',
    copyText.intro.replace(/<[^>]*>/g, ''),
    '',
    `${copy.cardEyebrow}:`,
    `  ${copy.currentLabel}: ${params.currentAvg.toFixed(1)} / 5`,
    `  ${copy.baselineLabel}: ${params.baselineAvg.toFixed(1)} / 5`,
    `  ${copy.deltaLabel}: ${params.delta.toFixed(1)}`,
    `  ${copy.reviewCountLabel}: ${params.reviewCount}`,
    '',
    `${copy.cta} ${params.inboxUrl}`,
    '',
    `${copy.actionTitle}`,
    `  1. ${copyText.action1}`,
    `  2. ${copyText.action2}`,
    `  3. ${copyText.action3}`,
  ].join('\n');
  return { subject, html, text };
}
