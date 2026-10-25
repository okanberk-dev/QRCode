// Onboarding finished — "panel is ready" mail sent from
// /api/onboarding/complete. Render-only (like contact-admin /
// owner-segment-mail): static copy, not part of SUPPORTED_MAIL_KEYS.
//
// Hero (success eyebrow + business name) → three "next step" rows that deep
// link into the panel → primary CTA. Rows are tables, not flex, and every row
// is a 56px+ tap target on phones.

import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderH1, renderP, renderButton, spacer } from '../components';

export interface OnboardingCompleteParams {
  /** Business name entered in the wizard (raw; escaped here). */
  bizName?: string | null;
  /** `${appUrl}/<locale>/dashboard` — step links are derived from it. */
  dashboardUrl: string;
}

const TABLE = 'role="presentation" cellpadding="0" cellspacing="0" border="0"';

function stepRow(n: number, label: string, href: string, last: boolean): string {
  const rule = last ? '' : `border-bottom:1px solid ${PULSE.n200};`;
  return `<tr>
      <td valign="middle" width="44" style="width:44px;padding:14px 12px 14px 0;${rule}">
        <table ${TABLE} width="32" style="width:32px;border-collapse:separate;"><tr><td width="32" height="32" align="center" valign="middle" style="width:32px;height:32px;background:${PULSE.graphite};border-radius:10px;font-family:${FONTS.label};font-size:13px;font-weight:600;line-height:1;color:${PULSE.lime};text-align:center;">${n}</td></tr></table>
      </td>
      <td valign="middle" style="padding:14px 0;${rule}">
        <a href="${escapeHtml(href)}" style="display:block;font-family:${FONTS.heading};font-size:15px;font-weight:600;line-height:1.4;color:${PULSE.graphite};text-decoration:none;">${label}</a>
      </td>
      <td valign="middle" align="right" width="28" style="width:28px;padding:14px 0 14px 8px;${rule}">
        <a href="${escapeHtml(href)}" style="display:block;font-family:${FONTS.body};font-size:16px;font-weight:600;line-height:1.4;color:${PULSE.n500};text-decoration:none;">&rarr;</a>
      </td>
    </tr>`;
}

export function renderOnboardingComplete(
  params: OnboardingCompleteParams,
  locale: 'tr' | 'en' = 'tr',
): { subject: string; html: string; text: string } {
  const isTr = locale !== 'en';
  const bizName = params.bizName?.trim() ? params.bizName.trim() : null;
  const bizHtml = bizName ? escapeHtml(bizName) : null;
  const dashboardUrl = params.dashboardUrl;

  const copy = isTr
    ? {
        subject: 'Buaze kurulumu tamamlandı — panele hoş geldiniz',
        eyebrow: 'Kurulum · Tamamlandı',
        title: bizHtml ? `${bizHtml} <span style="display:inline-block;background:${PULSE.lime};color:${PULSE.graphite};padding:0 8px;border-radius:8px;line-height:1.2;">hazır.</span>` : `<span style="display:inline-block;background:${PULSE.lime};color:${PULSE.graphite};padding:0 8px;border-radius:8px;line-height:1.2;">Hazırsın.</span>`,
        intro: 'Buaze kurulumun tamamlandı. Panelden QR\'larını indirebilir, yorumlarını izleyebilir, ekibini davet edebilirsin.',
        preheader: 'Panelden QR\'larını indirebilir, yorumlarını izleyebilir, ekibini davet edebilirsin.',
        stepsEyebrow: 'Sıradaki adımlar',
        steps: ['QR\'larını indir', 'Yorumlarını izle', 'Ekibini davet et'],
        cta: 'Panele git →',
        textLead: `${bizName ? bizName + ' · ' : ''}Buaze kurulumu tamamlandı. Panele git: ${dashboardUrl}`,
      }
    : {
        subject: 'Buaze setup complete — welcome to your dashboard',
        eyebrow: 'Setup · Complete',
        title: bizHtml ? `${bizHtml} <span style="display:inline-block;background:${PULSE.lime};color:${PULSE.graphite};padding:0 8px;border-radius:8px;line-height:1.2;">is ready.</span>` : `<span style="display:inline-block;background:${PULSE.lime};color:${PULSE.graphite};padding:0 8px;border-radius:8px;line-height:1.2;">You're ready.</span>`,
        intro: 'Your Buaze setup is complete. From the dashboard you can download your QRs, follow your reviews and invite your team.',
        preheader: 'Download your QRs, follow your reviews and invite your team from the dashboard.',
        stepsEyebrow: 'Next steps',
        steps: ['Download your QRs', 'Follow your reviews', 'Invite your team'],
        cta: 'Open dashboard →',
        textLead: `${bizName ? bizName + ' · ' : ''}Your Buaze setup is complete. Open the dashboard: ${dashboardUrl}`,
      };

  const links = [`${dashboardUrl}/qr`, `${dashboardUrl}/feedbacks`, `${dashboardUrl}/account?section=team`];
  const stepRows = copy.steps.map((label, i) => stepRow(i + 1, label, links[i], i === copy.steps.length - 1)).join('');

  const content = `
    <table ${TABLE} width="100%">
      <tr>
        <td class="bz-pad" style="padding:40px 40px 40px;">
          ${renderEyebrow(copy.eyebrow, '#15803D')}
          ${spacer(14)}
          ${renderH1(copy.title, { size: 36 })}
          ${spacer(16)}
          ${renderP(copy.intro)}
          ${spacer(28)}
          <table ${TABLE} width="100%" style="background:${PULSE.n50};border:1px solid ${PULSE.n200};border-radius:16px;border-collapse:separate;border-spacing:0;">
            <tr>
              <td style="padding:20px 20px 8px;">
                ${renderEyebrow(copy.stepsEyebrow, PULSE.n600)}
                ${spacer(6)}
                <table ${TABLE} width="100%">${stepRows}</table>
              </td>
            </tr>
          </table>
          ${spacer(28)}
          ${renderButton({ href: escapeHtml(dashboardUrl), label: copy.cta, variant: 'lime', size: 'lg' })}
        </td>
      </tr>
    </table>
  `;

  const html = pulseLayout({
    subject: escapeHtml(copy.subject),
    preheader: escapeHtml(copy.preheader),
    content,
    eyebrow: isTr ? 'Kurulum' : 'Setup',
    footer: { locale },
  });

  return { subject: copy.subject, html, text: copy.textLead };
}
