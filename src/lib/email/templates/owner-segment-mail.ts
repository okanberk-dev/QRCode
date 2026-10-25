// Stage A5 §38.97 — owner segment mail template (admin → owner mass mail).
//
// Pulse-style template (CLAUDE.md §21). Admin subject + body free-text;
// helper escapeHtml + line-break preserve + Buaze branding wrapper.
// Recipient = işletme sahibi (User.role='restaurant_owner'); customer
// campaign helper'ından (CLAUDE.md §38.48 Wave 2) farklı çünkü konu KVKK
// rıza bazlı pazarlama değil, transactional + operasyonel iletişim.
//
// List-Unsubscribe header gerekli değil — owner Buaze ile ticari ilişki
// içinde, transactional kategori (Resend "Transactional" sender domain
// kullanılır). Yine de Stripe + Linear paterni ile alt'ta unsubscribe link
// (User.notificationOptOut field ileride eklenirse).

import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderP, renderButton, spacer } from '../components';

export interface OwnerSegmentMailParams {
  /** Admin'in yazdığı subject. */
  subject: string;
  /** Admin'in yazdığı plain-text body. \n satır kırılımları korunur. */
  body: string;
  /** Hitap için (opsiyonel; varsa "Merhaba Ali," şeklinde greeting). */
  ownerName?: string | null;
  /**
   * Footer'da görünür panel link override (full URL).
   * CLAUDE.md §38.132 — Boşsa locale-aware
   * `${NEXT_PUBLIC_APP_URL}/${locale}/dashboard` inşa edilir.
   * Caller artık manuel `/dashboard` suffix vermez (eski caller davranışı:
   * `process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com/dashboard'` →
   * locale prefix yoktu, dashboard route 404'tu).
   */
  appUrl?: string;
}

// Admin writes plain text. Blank line = new paragraph, single newline = line
// break, consecutive "- " / "• " / "* " lines = a bulleted list. Everything is
// escaped before it touches markup.
function renderSegmentBody(body: string): string {
  const BULLET = /^\s*[-•*]\s+/;
  const blocks = body.replace(/\r\n?/g, '\n').trim().split(/\n{2,}/).filter((b) => b.trim().length > 0);
  const para = (lines: string[]): string =>
    `<p style="margin:0;font-family:${FONTS.body};font-size:15px;line-height:1.65;color:${PULSE.n700};">${lines.map((l) => escapeHtml(l)).join('<br />')}</p>`;
  const list = (items: string[]): string =>
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${items
      .map(
        (it, i) => `<tr>
          <td valign="top" width="18" style="width:18px;padding:${i === 0 ? '8px' : '15px'} 0 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="7" height="7" style="width:7px;height:7px;background:${PULSE.limeDeep};border-radius:4px;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td>
          <td valign="top" style="padding:${i === 0 ? '0' : '7px'} 0 0;font-family:${FONTS.body};font-size:15px;line-height:1.65;color:${PULSE.n700};">${escapeHtml(it)}</td>
        </tr>`,
      )
      .join('')}</table>`;

  return blocks
    .map((block) => {
      const lines = block.split('\n');
      const parts: string[] = [];
      let text: string[] = [];
      let items: string[] = [];
      const flushText = () => {
        if (text.length) parts.push(para(text));
        text = [];
      };
      const flushItems = () => {
        if (items.length) parts.push(list(items));
        items = [];
      };
      for (const line of lines) {
        if (BULLET.test(line)) {
          flushText();
          items.push(line.replace(BULLET, ''));
        } else {
          flushItems();
          text.push(line);
        }
      }
      flushText();
      flushItems();
      return parts.map((p, i) => (i === 0 ? p : `${spacer(10)}${p}`)).join('');
    })
    .join(spacer(16));
}

export function renderOwnerSegmentMail(
  params: OwnerSegmentMailParams,
  locale: 'tr' | 'en' = 'tr',
): { subject: string; html: string; text: string } {
  const isTr = locale !== 'en';
  const subject = params.subject.trim() || (isTr ? 'Buaze\'den önemli bir bilgi' : 'An important update from Buaze');
  const preheader = isTr
    ? 'Buaze ekibinden işletme sahiplerine mesaj.'
    : 'A message from the Buaze team to business owners.';

  const greeting = params.ownerName
    ? isTr
      ? `Merhaba ${params.ownerName},`
      : `Hi ${params.ownerName},`
    : isTr
      ? 'Merhaba,'
      : 'Hello,';

  const safeGreeting = escapeHtml(greeting);
  // CLAUDE.md §38.132 — Locale-aware dashboard URL inşası.
  // appUrl override edilmemişse env-aware base + recipient locale +
  // `/dashboard` suffix (Next.js `/[locale]/dashboard` route'una uygun).
  const baseAppUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '') || 'https://www.buaze.com';
  const appUrl = params.appUrl || `${baseAppUrl}/${isTr ? 'tr' : 'en'}/dashboard`;
  const safeAppUrl = escapeHtml(appUrl);

  const eyebrow = isTr ? 'BUAZE EKİBİ' : 'BUAZE TEAM';
  const ctaLabel = isTr ? 'Panele git' : 'Open panel';
  const sentLine = isTr ? 'Bu mesaj' : 'Sent via';
  const sentSuffix = isTr ? 'tarafından gönderildi.' : '';

  // One padded cell (layout.ts forces .bz-pad to 28/22 on mobile for every cell
  // that has it — one cell per block stacked 56px gaps). The wrapper table also
  // fixes the old bare <tr> that was injected straight into the shell <td>.
  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="padding:40px;">
          ${renderEyebrow(eyebrow)}
          ${spacer(12)}
          <h1 style="font-family:${FONTS.heading};font-size:26px;font-weight:600;color:${PULSE.graphite};letter-spacing:-0.02em;line-height:1.2;margin:0;">${escapeHtml(subject)}</h1>
          ${spacer(22)}
          ${renderP(safeGreeting, { color: PULSE.graphite })}
          ${spacer(14)}
          ${renderSegmentBody(params.body)}
          ${spacer(28)}
          ${renderButton({ href: safeAppUrl, label: ctaLabel, variant: 'lime' })}
          ${spacer(28)}
          <div style="border-top:1px solid ${PULSE.n200};padding-top:18px;font-family:${FONTS.body};font-size:12px;line-height:1.6;color:${PULSE.n500};">
            ${sentLine} <strong style="color:${PULSE.graphite};">Buaze</strong>${sentSuffix ? ` ${sentSuffix}` : ''}
          </div>
        </td>
      </tr>
    </table>
  `;

  const html = pulseLayout({ subject, preheader, content, footer: { locale } });

  const text = `${greeting}

${params.body}

${ctaLabel}: ${appUrl}

—
${sentLine} Buaze ${sentSuffix}`.trim();

  return { subject, html, text };
}
