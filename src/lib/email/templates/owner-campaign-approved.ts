// Stage 29 §38.105 — Owner notification: campaign approved + sent.
//
// Admin /admin/campaigns/[id]/approve POST tetikler. Owner kendi panelinde
// status timeline'ı zaten görür ama mail'le anlık bildirim daha güvenli
// (admin queue'da tipik bekleme süresi <1h ama owner her dakika kontrol
// etmek zorunda kalmasın). Pulse template paterni — DB-driven copy + place-
// holder substitution (CLAUDE.md §21.29 + §21.30).

import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

export interface OwnerCampaignApprovedParams {
  ownerName?: string | null;
  restaurantName: string;
  /** Original campaign subject (owner-authored, escaped). */
  subject: string;
  /** Final delivered count (post Resend pipeline). */
  sentCount: number;
  /** Failed count (delivery error during Resend dispatch). */
  failedCount: number;
  /** Owner panel campaign detail URL — locale prefix included. */
  dashboardUrl: string;
}

export async function renderOwnerCampaignApproved(
  params: OwnerCampaignApprovedParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const subject = isTr
    ? `Kampanyanız onaylandı ve gönderildi — ${params.subject}`
    : `Your campaign was approved and sent — ${params.subject}`;
  const preheader = isTr
    ? `Buaze admin onayı sonrası ${params.sentCount} müşteriye iletildi.`
    : `${params.sentCount} customers reached after Buaze admin approval.`;

  const inlineDefault = isTr
    ? {
        eyebrow: 'KAMPANYA ONAYI',
        title: 'Kampanyanız onaylandı.',
        intro: 'Merhaba ${ownerName}, ${restaurantName} kampanyanız Buaze ekibi tarafından onaylandı ve müşterilerinize iletildi.',
        statsLabel: 'Teslim özeti',
        sentRow: 'Gönderilen',
        failedRow: 'Başarısız',
        ctaLabel: 'Kampanya detayını görüntüle',
        footerHint: 'Sonuçları panel üzerinden takip edebilirsin.',
      }
    : {
        eyebrow: 'CAMPAIGN APPROVAL',
        title: 'Your campaign has been approved.',
        intro: 'Hi ${ownerName}, your ${restaurantName} campaign was approved by the Buaze team and delivered to your customers.',
        statsLabel: 'Delivery summary',
        sentRow: 'Sent',
        failedRow: 'Failed',
        ctaLabel: 'View campaign detail',
        footerHint: 'You can track the results from your panel.',
      };

  const merged = await loadMailCopy('owner-campaign-approved', locale, inlineDefault);
  const vars = {
    ownerName: params.ownerName?.trim() || (isTr ? 'restoran sahibi' : 'restaurant owner'),
    restaurantName: params.restaurantName,
    subject: params.subject,
    sentCount: String(params.sentCount),
    failedCount: String(params.failedCount),
    dashboardUrl: params.dashboardUrl,
  };
  const copy = deepSubstitute(merged, vars, 'html');
  const copyText = deepSubstitute(merged, vars, 'text');

  const safeSubject = escapeHtml(params.subject);

  const content = `
    <!-- Header: lime accent + eyebrow -->
    <tr>
      <td class="bz-pad" style="padding:32px 40px 8px;">
        <div style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${PULSE.limeDeep};">${copy.eyebrow}</div>
        <h1 style="font-family:${FONTS.heading};font-size:26px;font-weight:500;color:${PULSE.graphite};letter-spacing:-0.02em;margin:8px 0 0;line-height:1.15;">${copy.title}</h1>
      </td>
    </tr>

    <!-- Intro paragraph -->
    <tr>
      <td class="bz-pad" style="padding:14px 40px 22px;">
        <p style="font-family:${FONTS.body};font-size:14px;line-height:1.65;color:${PULSE.graphite};margin:0;">${copy.intro}</p>
      </td>
    </tr>

    <!-- Subject preview card -->
    <tr>
      <td class="bz-pad" style="padding:0 40px 18px;">
        <div style="border:1px solid ${PULSE.n200};border-radius:14px;padding:16px 18px;background:${PULSE.n50};">
          <div style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${PULSE.n500};margin-bottom:6px;">${isTr ? 'KAMPANYA KONUSU' : 'CAMPAIGN SUBJECT'}</div>
          <div style="font-family:${FONTS.heading};font-size:15px;font-weight:500;color:${PULSE.graphite};letter-spacing:-0.01em;">${safeSubject}</div>
        </div>
      </td>
    </tr>

    <!-- Stats row -->
    <tr>
      <td class="bz-pad" style="padding:0 40px 24px;">
        <div style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${PULSE.n500};margin-bottom:10px;">${copy.statsLabel}</div>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
          <tr>
            <td valign="middle" style="padding:10px 0;border-bottom:1px solid ${PULSE.n200};">
              <span style="display:inline-block;width:8px;height:8px;background:${PULSE.lime};border-radius:50%;margin-right:8px;"></span>
              <span style="font-family:${FONTS.body};font-size:13px;color:${PULSE.graphite};">${copy.sentRow}</span>
            </td>
            <td valign="middle" align="right" style="padding:10px 0;border-bottom:1px solid ${PULSE.n200};font-family:${FONTS.mono};font-size:14px;font-weight:600;color:${PULSE.graphite};">
              ${escapeHtml(String(params.sentCount))}
            </td>
          </tr>
          <tr>
            <td valign="middle" style="padding:10px 0;">
              <span style="display:inline-block;width:8px;height:8px;background:${params.failedCount > 0 ? '#DC2626' : PULSE.n400};border-radius:50%;margin-right:8px;"></span>
              <span style="font-family:${FONTS.body};font-size:13px;color:${PULSE.graphite};">${copy.failedRow}</span>
            </td>
            <td valign="middle" align="right" style="padding:10px 0;font-family:${FONTS.mono};font-size:14px;font-weight:600;color:${params.failedCount > 0 ? '#DC2626' : PULSE.n500};">
              ${escapeHtml(String(params.failedCount))}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${spacer(8)}

    <!-- CTA + footer hint -->
    <tr>
      <td class="bz-pad" style="padding:0 40px 32px;" align="left">
        <a href="${escapeHtml(params.dashboardUrl)}" style="display:inline-block;background:${PULSE.lime};color:${PULSE.graphite};font-family:${FONTS.body};font-size:14px;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:999px;letter-spacing:-0.01em;">
          ${copy.ctaLabel}
        </a>
        <p style="font-family:${FONTS.body};font-size:12px;line-height:1.55;color:${PULSE.n500};margin:18px 0 0;">${copy.footerHint}</p>
      </td>
    </tr>

    <!-- Stage 31c §38.109 — Buaze attribution + privacy link. Internal
         transactional mail (admin↔owner), ETK kapsam dışı; minimal
         hukuki transparency yeterli. -->
    <tr>
      <td class="bz-pad" style="padding:0 40px 32px;">
        <div style="border-top:1px solid ${PULSE.n200};padding-top:14px;">
          <div style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:${PULSE.n500};">
            ${isTr ? 'Bu mail Buaze platformu (Buaze Bilişim A.Ş.) tarafından gönderilmiştir.' : 'This email was sent by the Buaze platform (Buaze Bilişim A.Ş.).'}
          </div>
          <div style="font-family:${FONTS.body};font-size:11px;color:${PULSE.n500};margin-top:4px;">
            <a href="https://buaze.com/${isTr ? 'tr/gizlilik' : 'en/privacy'}" style="color:${PULSE.graphite};text-decoration:underline;">${isTr ? 'Gizlilik Politikası' : 'Privacy Policy'}</a>
          </div>
        </div>
      </td>
    </tr>
  `;

  const html = pulseLayout({ subject, preheader, content });

  const text = `${copyText.eyebrow}
${copyText.title}

${copyText.intro}

${isTr ? 'KAMPANYA KONUSU' : 'CAMPAIGN SUBJECT'}: ${params.subject}

${copyText.statsLabel}
${copyText.sentRow}: ${params.sentCount}
${copyText.failedRow}: ${params.failedCount}

${copyText.ctaLabel}: ${params.dashboardUrl}

${copyText.footerHint}

—
${isTr ? 'Bu mail Buaze platformu (Buaze Bilişim A.Ş.) tarafından gönderilmiştir.' : 'This email was sent by the Buaze platform (Buaze Bilişim A.Ş.).'}
${isTr ? 'Gizlilik Politikası' : 'Privacy Policy'}: https://buaze.com/${isTr ? 'tr/gizlilik' : 'en/privacy'}`.trim();

  return { subject, html, text };
}
