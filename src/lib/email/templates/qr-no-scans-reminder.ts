// Wave C1 (CLAUDE.md §38.194) — QR oluşturuldu ama 7 gündür tarama yok.
// Cron-driven (/api/cron/qr-no-scans-reminder, daily 09:00 UTC).
// LifecycleEmailLog cooldown 14 days per restaurant.

import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderButton, spacer } from '../components';
import { LC_TABLE, WARN, lcPage, lcSection, lcHero, lcChip, lcCard } from './lifecycle-ui';
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

  // Numbered idea rows inside one soft card. The chip is a table cell so it
  // holds its size in Outlook; rows get hairlines instead of per-row cards so
  // the text column stays as wide as possible on 320px phones.
  const tipRow = (n: string, body: string, first: boolean) => `
    <tr>
      <td valign="top" width="40" style="width:40px;padding:14px 12px 14px 0;${first ? '' : `border-top:1px solid ${PULSE.n200};`}">${lcChip(n, { size: 28, fontSize: 11, radius: 8 })}</td>
      <td valign="middle" style="padding:14px 0;${first ? '' : `border-top:1px solid ${PULSE.n200};`}font-family:${FONTS.body};font-size:14px;line-height:1.55;color:${PULSE.n800};">${body}</td>
    </tr>`;
  const tips = [copy.tip1, copy.tip2, copy.tip3, copy.tip4];

  const accentWord = `<span style="background:${WARN.bg};color:${WARN.fg};padding:0 10px;border-radius:10px;">${copy.titleAccent}</span>`;

  const content = lcPage([
    lcHero({
      eyebrow: copy.eyebrow,
      eyebrowTone: 'warn',
      title: `${copy.title} ${accentWord}`,
      titleSize: 38,
      intro: [copy.intro],
    }),
    lcSection(
      lcCard(
        `${renderEyebrow(copy.tipsEyebrow, PULSE.n600)}
         ${spacer(6)}
         <table ${LC_TABLE} width="100%">${tips.map((t, i) => tipRow(String(i + 1).padStart(2, '0'), t, i === 0)).join('')}</table>`,
        { padding: '20px 20px 6px' },
      ),
      { padding: '28px 40px 8px' },
    ),
    lcSection(renderButton({ href: escapeHtml(params.qrUrl), label: copy.cta, variant: 'dark', size: 'lg' }), { padding: '28px 40px 40px' }),
  ]);

  const html = pulseLayout({ subject, preheader, content, footer: { locale } });
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
