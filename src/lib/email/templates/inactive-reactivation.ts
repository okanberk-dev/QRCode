import { PULSE } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderP, renderButton } from '../components';
import { LC_TABLE, lcPage, lcSection, lcHero, lcFootnote } from './lifecycle-ui';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';
import { INACTIVE_REACTIVATION_DEFAULTS } from './lifecycle-defaults';

export interface InactiveReactivationParams {
  firstName?: string | null;
  daysInactive: number;
  dashboardUrl: string;
}

// Lifecycle email — 14-30 gün login/activity yok, owner'ı tekrar aktive
// etmek için (CLAUDE.md §21.34 + §23.7 Phase 11.30).
// Cooldown: 30 gün — kullanıcı stopped olabilir, overspam etmeyiz.

export async function renderInactiveReactivation(
  params: InactiveReactivationParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const subject = isTr
    ? 'Geri bildirim akışınızı tekrar canlandıralım'
    : "Let's restart your feedback flow";
  const preheader = isTr
    ? `${params.daysInactive} gündür panele girmediniz. QR ve platform bağlantılarınız sizi bekliyor.`
    : `${params.daysInactive} days since your last sign-in. Your QR and platform links are waiting.`;

  const inlineDefault = INACTIVE_REACTIVATION_DEFAULTS[isTr ? 'tr' : 'en'];

  const merged = await loadMailCopy('inactive-reactivation', locale, inlineDefault);
  const fallbackName = isTr ? 'merhaba' : 'hi';
  const vars = {
    firstName: params.firstName || fallbackName,
    daysInactive: String(params.daysInactive),
  };
  const copy = deepSubstitute(merged, vars, 'html');
  const copyText = deepSubstitute(merged, vars, 'text');

  // Soft welcome-back hero → "three quick checks" callout → dark CTA.
  const callout = `
    <table ${LC_TABLE} width="100%" style="width:100%;border-collapse:separate;">
      <tr>
        <td width="4" style="width:4px;background:${PULSE.lime};border-radius:4px 0 0 4px;font-size:0;line-height:0;">&nbsp;</td>
        <td style="background:${PULSE.n50};border:1px solid ${PULSE.n200};border-left:0;border-radius:0 14px 14px 0;padding:18px 20px;">${renderP(copy.suggestion, { size: 14, color: PULSE.n700 })}</td>
      </tr>
    </table>`;

  const content = lcPage([
    lcHero({
      eyebrow: copy.eyebrow,
      eyebrowColor: PULSE.n700,
      title: copy.title,
      titleSize: 34,
      intro: [copy.intro],
      introColor: PULSE.n700,
      bg: PULSE.limeSoft,
      ecg: 'graphite',
    }),
    lcSection(callout, { padding: '32px 40px 8px' }),
    lcSection(renderButton({ href: escapeHtml(params.dashboardUrl), label: copy.cta, variant: 'dark', size: 'lg' }), { padding: '28px 40px 36px' }),
    lcFootnote(copy.footnote),
  ]);

  const text = [
    copyText.eyebrow,
    '',
    copyText.title,
    '',
    copyText.intro,
    '',
    copyText.suggestion,
    '',
    `→ ${copyText.cta}: ${params.dashboardUrl}`,
    '',
    copyText.footnote,
  ].join('\n');

  return {
    subject,
    html: pulseLayout({ subject, preheader, content, footer: { locale } }),
    text,
  };
}
