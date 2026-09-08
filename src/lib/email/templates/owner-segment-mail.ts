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
import { spacer } from '../components';

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

  const safeBody = escapeHtml(params.body).replace(/\r?\n/g, '<br />');
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

  const content = `
    <tr>
      <td class="bz-pad" style="padding:32px 40px 16px;">
        <div style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${PULSE.lime};font-weight:600;">
          ${eyebrow}
        </div>
        <h1 style="font-family:${FONTS.heading};font-size:22px;font-weight:500;color:${PULSE.graphite};letter-spacing:-0.02em;margin:6px 0 0;">
          ${escapeHtml(subject)}
        </h1>
      </td>
    </tr>

    <tr>
      <td class="bz-pad" style="padding:8px 40px 0;">
        <p style="font-family:${FONTS.body};font-size:15px;color:${PULSE.graphite};margin:0 0 14px;">
          ${safeGreeting}
        </p>
      </td>
    </tr>

    <tr>
      <td class="bz-pad" style="padding:0 40px 28px;">
        <div style="font-family:${FONTS.body};font-size:14px;line-height:1.65;color:${PULSE.graphite};">
          ${safeBody}
        </div>
      </td>
    </tr>

    <tr>
      <td class="bz-pad" style="padding:0 40px 32px;">
        <a href="${safeAppUrl}" style="display:inline-block;background:${PULSE.lime};color:${PULSE.graphite};font-family:${FONTS.body};font-size:13px;font-weight:600;padding:10px 18px;border-radius:24px;text-decoration:none;">
          ${ctaLabel}
        </a>
      </td>
    </tr>
    ${spacer(8)}

    <tr>
      <td class="bz-pad" style="padding:0 40px 32px;">
        <div style="border-top:1px solid ${PULSE.n200};padding-top:18px;">
          <div style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:${PULSE.n500};">
            ${sentLine} <strong style="color:${PULSE.graphite};">Buaze</strong> ${sentSuffix}
          </div>
        </div>
      </td>
    </tr>
  `;

  const html = pulseLayout({ subject, preheader, content });

  const text = `${greeting}

${params.body}

${ctaLabel}: ${appUrl}

—
${sentLine} Buaze ${sentSuffix}`.trim();

  return { subject, html, text };
}
