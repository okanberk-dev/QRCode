// Wave C1 (CLAUDE.md §38.194) — QR oluşturuldu ama 7 gündür tarama yok.
// Cron-driven (/api/cron/qr-no-scans-reminder, daily 09:00 UTC).
// LifecycleEmailLog cooldown 14 days per restaurant.

import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderButton, spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

export interface QrNoScansReminderParams {
  firstName?: string | null;
  restaurantName: string;
  /** Days since QR was first created (computed at cron run time). */
  daysSinceQr: number;
  /** QR management deeplink. */
  qrUrl: string;
}

export async function renderQrNoScansReminder(
  params: QrNoScansReminderParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const firstName = params.firstName ? escapeHtml(params.firstName) : '';
  const restaurantName = escapeHtml(params.restaurantName);

  const subject = isTr
    ? 'QR\'ın tarananı bekliyor'
    : 'Your QR is waiting for its first scan';
  const preheader = isTr
    ? `${params.restaurantName} için QR ${params.daysSinceQr} gündür hazır ama tarama yok. Yerleştirmeyi gözden geçir.`
    : `${params.restaurantName} QR has been live for ${params.daysSinceQr} days with zero scans. Check placement.`;

  const inlineDefault = isTr ? {
    eyebrow: 'Aktivasyon · Tarama yok',
    title: 'QR\'ın',
    titleAccent: 'sessiz',
    intro: firstName
      ? `Merhaba <span style="color:${PULSE.graphite};font-weight:500;">${firstName}</span>, <strong>${restaurantName}</strong> için QR'ı oluşturduğundan beri ${params.daysSinceQr} gün geçti. Henüz tek tarama yok — yerleştirme veya tasarımda hızlıca düzeltebileceğin bir şey olabilir.`
      : `<strong>${restaurantName}</strong> için QR'ı oluşturduğundan beri ${params.daysSinceQr} gün geçti. Henüz tek tarama yok — yerleştirme veya tasarımda hızlıca düzeltebileceğin bir şey olabilir.`,
    tipsEyebrow: 'Hızlı 4 fikir',
    tip1: 'Masa kartını her masaya tek tek yerleştir, menü tutucusunun arkasında kalmasın.',
    tip2: 'Paket siparişlerin üstüne yapıştır — taşınırken müşterinin gözünden kaçmaz.',
    tip3: 'Karşılama tahtasına yapıştır + yan tarafına "Buradan bir saniyede paylaş" yaz.',
    tip4: 'Tasarımdan kontrast düşükse QR\'ı koyu tasarımla yeniden indir; %20 daha okunur.',
    cta: 'QR\'ı yeniden indir →',
  } : {
    eyebrow: 'Activation · No scans',
    title: 'Your QR is',
    titleAccent: 'silent',
    intro: firstName
      ? `Hi <span style="color:${PULSE.graphite};font-weight:500;">${firstName}</span>, your QR for <strong>${restaurantName}</strong> has been live ${params.daysSinceQr} days without a single scan. Likely a quick fix in placement or design.`
      : `Your QR for <strong>${restaurantName}</strong> has been live ${params.daysSinceQr} days without a single scan. Likely a quick fix in placement or design.`,
    tipsEyebrow: '4 quick ideas',
    tip1: 'Place a table card on each table, not hidden behind the menu stand.',
    tip2: 'Stick it on every takeaway package — visible during transport.',
    tip3: 'Mount it on your welcome board with "Share your stay in one second" beside it.',
    tip4: 'Low contrast? Re-download in the dark variant — typically +20% scanability.',
    cta: 'Re-download QR →',
  };

  const merged = await loadMailCopy('qr-no-scans-reminder', locale, inlineDefault);
  const vars = { firstName: params.firstName || '', restaurantName: params.restaurantName, daysSinceQr: params.daysSinceQr };
  const copy = deepSubstitute(merged, vars, 'html') as typeof inlineDefault;
  const copyText = deepSubstitute(merged, vars, 'text') as typeof inlineDefault;

  const tipRow = (label: string, body: string) => `
    <tr>
      <td valign="top" style="padding:10px 0;">
        <div style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${PULSE.n500};">${label}</div>
        <div style="margin-top:4px;font-family:${FONTS.body};font-size:13.5px;line-height:1.55;color:${PULSE.graphite};">${body}</div>
      </td>
    </tr>`;

  const content = `
    ${renderEyebrow(copy.eyebrow)}
    ${spacer(16)}
    <h1 style="margin:0;font-family:${FONTS.heading};font-size:42px;line-height:1.05;letter-spacing:-0.03em;font-weight:500;color:${PULSE.graphite};">
      ${copy.title} <span style="color:${PULSE.warning};">${copy.titleAccent}</span>
    </h1>
    ${spacer(20)}
    <p style="margin:0;font-family:${FONTS.body};font-size:15px;line-height:1.6;color:${PULSE.n600};">
      ${copy.intro}
    </p>
    ${spacer(28)}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${PULSE.n50};border:1px solid ${PULSE.n200};border-radius:18px;">
      <tr><td style="padding:20px 24px;">
        <div style="font-family:${FONTS.mono};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${PULSE.n600};">${copy.tipsEyebrow}</div>
        ${spacer(8)}
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          ${tipRow('01', copy.tip1)}
          ${tipRow('02', copy.tip2)}
          ${tipRow('03', copy.tip3)}
          ${tipRow('04', copy.tip4)}
        </table>
      </td></tr>
    </table>
    ${spacer(28)}
    ${renderButton({ href: params.qrUrl, label: copy.cta, variant: 'dark' })}
  `;

  const html = pulseLayout({ subject, preheader, content });
  const text = [
    copyText.eyebrow,
    '',
    `${copy.title} ${copy.titleAccent}`,
    '',
    copyText.intro.replace(/<[^>]*>/g, ''),
    '',
    `${copy.tipsEyebrow}:`,
    `  01: ${copyText.tip1}`,
    `  02: ${copyText.tip2}`,
    `  03: ${copyText.tip3}`,
    `  04: ${copyText.tip4}`,
    '',
    `${copy.cta} ${params.qrUrl}`,
  ].join('\n');
  return { subject, html, text };
}
