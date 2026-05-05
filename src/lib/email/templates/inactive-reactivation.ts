import { pulseLayout } from '../layout';
import { renderEyebrow, renderH1, renderP, renderButton, spacer } from '../components';
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

  const content = [
    renderEyebrow(copy.eyebrow),
    renderH1(copy.title),
    spacer(8),
    renderP(copy.intro),
    renderP(copy.suggestion),
    spacer(28),
    renderButton({ href: params.dashboardUrl, label: copy.cta, variant: 'dark', size: 'lg' }),
    spacer(32),
    renderP(copy.footnote, { color: '#737373', size: 12 }),
  ].join('\n');

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
    html: pulseLayout({ subject, preheader, content }),
    text,
  };
}
