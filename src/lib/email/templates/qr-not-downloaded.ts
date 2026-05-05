import { pulseLayout } from '../layout';
import { renderEyebrow, renderH1, renderP, renderButton, spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';
import { QR_NOT_DOWNLOADED_DEFAULTS } from './lifecycle-defaults';

export interface QrNotDownloadedParams {
  firstName?: string | null;
  restaurantName: string;
  qrUrl: string;
}

// Lifecycle email — owner registered + onboarding complete + 24-48 saat
// geçti ama hâlâ ilk QR'ı indirmedi (CLAUDE.md §21.34 + §23.7 Phase 11.30).
// Idempotent: LifecycleEmailLog `type: 'qr_not_downloaded'` 1 kez gönderilir.

export async function renderQrNotDownloaded(
  params: QrNotDownloadedParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const subject = isTr
    ? 'İlk QR kodunuzu henüz indirmediniz'
    : "You haven't downloaded your first QR yet";
  const preheader = isTr
    ? `${params.restaurantName} için QR kodunuz hazır — masaya yerleştirin, ilk yorumları toplamaya başlayın.`
    : `Your QR for ${params.restaurantName} is ready — place it on a table to start collecting reviews.`;

  const inlineDefault = QR_NOT_DOWNLOADED_DEFAULTS[isTr ? 'tr' : 'en'];

  const merged = await loadMailCopy('qr-not-downloaded', locale, inlineDefault);
  const fallbackName = isTr ? 'merhaba' : 'hi';
  const vars = {
    firstName: params.firstName || fallbackName,
    restaurantName: params.restaurantName,
  };
  const copy = deepSubstitute(merged, vars, 'html');
  const copyText = deepSubstitute(merged, vars, 'text');

  const content = [
    renderEyebrow(copy.eyebrow),
    renderH1(copy.title),
    spacer(8),
    renderP(copy.intro),
    renderP(copy.why),
    spacer(24),
    renderButton({ href: params.qrUrl, label: copy.cta, variant: 'dark', size: 'lg' }),
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
    copyText.why,
    '',
    `→ ${copyText.cta}: ${params.qrUrl}`,
    '',
    copyText.footnote,
  ].join('\n');

  return {
    subject,
    html: pulseLayout({ subject, preheader, content }),
    text,
  };
}
