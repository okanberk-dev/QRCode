// Onboarding finished — "panel is ready" mail sent from
// /api/onboarding/complete. Render-only (like contact-admin /
// owner-segment-mail): static copy, not part of SUPPORTED_MAIL_KEYS.
//
// Hero (success eyebrow + business name) → intro paragraph → lime "open the
// panel" CTA. Same content as the original inline mail, now on the shared Pulse
// layout (tables only, Poppins, mobile-safe).

import { PULSE } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderH1, renderP, renderButton, spacer } from '../components';

export interface OnboardingCompleteParams {
  /** Business name entered in the wizard (raw; escaped here). */
  bizName?: string | null;
  /** `${appUrl}/<locale>/dashboard` — target of the primary CTA. */
  dashboardUrl: string;
}

const TABLE = 'role="presentation" cellpadding="0" cellspacing="0" border="0"';

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
        cta: 'Panele git →',
        textLead: `${bizName ? bizName + ' · ' : ''}Buaze kurulumu tamamlandı. Panele git: ${dashboardUrl}`,
      }
    : {
        subject: 'Buaze setup complete — welcome to your dashboard',
        eyebrow: 'Setup · Complete',
        title: bizHtml ? `${bizHtml} <span style="display:inline-block;background:${PULSE.lime};color:${PULSE.graphite};padding:0 8px;border-radius:8px;line-height:1.2;">is ready.</span>` : `<span style="display:inline-block;background:${PULSE.lime};color:${PULSE.graphite};padding:0 8px;border-radius:8px;line-height:1.2;">You're ready.</span>`,
        intro: 'Your Buaze setup is complete. From the dashboard you can download your QRs, follow your reviews and invite your team.',
        preheader: 'Download your QRs, follow your reviews and invite your team from the dashboard.',
        cta: 'Open dashboard →',
        textLead: `${bizName ? bizName + ' · ' : ''}Your Buaze setup is complete. Open the dashboard: ${dashboardUrl}`,
      };

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
