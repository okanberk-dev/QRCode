import { pulseLayout } from '../layout';
import { renderEyebrow, renderH1, renderP, renderButton, spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

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

  const inlineDefault = isTr
    ? {
        eyebrow: 'KURULUM HATIRLATMASI',
        title: 'Merhaba ${firstName}, QR kodunuz sizi bekliyor',
        intro: '${restaurantName} için kurulum başlattınız ama henüz QR kodunuzu indirmediniz. QR kartınız olmadan müşterileriniz size yorum bırakamaz.',
        why: 'Masaya / kasaya / fişe yerleştirilmiş bir QR kartı, ortalama olarak yorum sayısını anlamlı şekilde artırır. Tek bir indirme yeterli — sonrası baskı + yerleştirme.',
        cta: 'QR kodunuzu indirin',
        footnote: 'Bu hatırlatma sadece bir kez gönderilir. Kurulumunuzu tamamlamak istiyorsanız panele giriş yaparak kontrol listesine bakabilirsiniz.',
      }
    : {
        eyebrow: 'SETUP REMINDER',
        title: "Hi ${firstName}, your QR is waiting",
        intro: "You started setup for ${restaurantName} but haven't downloaded your QR yet. Without a QR card, your customers can't leave reviews.",
        why: 'A QR placed on a table / counter / receipt meaningfully increases review volume. One download — then print + place.',
        cta: 'Download your QR',
        footnote: 'This reminder is sent only once. Sign in to the dashboard anytime to check your activation checklist.',
      };

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
