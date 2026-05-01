import { pulseLayout } from '../layout';
import { renderEyebrow, renderH1, renderP, renderButton, spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

export interface UpgradeSuggestionParams {
  firstName?: string | null;
  restaurantName: string;
  feedbackCount: number;
  pricingUrl: string;
}

// Lifecycle email — yüksek feedback hacmi olan trial / starter kullanıcılarına
// upgrade önerisi (CLAUDE.md §21.34 + §23.7 Phase 11.30).
// Cooldown: 30 gün — overspam koruması.

export async function renderUpgradeSuggestion(
  params: UpgradeSuggestionParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const subject = isTr
    ? "Buaze'den daha fazla değer almak için planınızı yükseltin"
    : 'Upgrade your plan to get more from Buaze';
  const preheader = isTr
    ? `${params.restaurantName} için ${params.feedbackCount} yorum topladınız — Pro özellikler bekleyenlerle bağlantı kurmanıza yardım eder.`
    : `${params.feedbackCount} reviews collected for ${params.restaurantName} — Pro features help you act on every one.`;

  const inlineDefault = isTr
    ? {
        eyebrow: 'PLAN ÖNERİSİ',
        title: 'Merhaba ${firstName}, ${restaurantName} büyüyor',
        intro: '${restaurantName} için ${feedbackCount} yorum topladınız. Bu hacimde yorumu manuel takip etmek yorucu olabilir — Buaze Pro size birkaç önemli alan açıyor:',
        feature1: 'Pulse AI ile yorumlara saniyeler içinde profesyonel yanıt taslağı',
        feature2: 'Otomatik düşük puan uyarıları + e-posta bildirimi',
        feature3: 'Detaylı analitik: platform dağılımı, saat-bazlı trend, sentiment teması',
        feature4: 'Birden fazla şube + ekip rolleri',
        cta: 'Planları görüntüle',
        footnote: 'Bu öneri sadece ayda bir gönderilir. Mevcut planınızda kalmak isterseniz hiçbir şey yapmanıza gerek yok.',
      }
    : {
        eyebrow: 'PLAN SUGGESTION',
        title: 'Hi ${firstName}, ${restaurantName} is growing',
        intro: "You've collected ${feedbackCount} reviews for ${restaurantName}. At this volume, manual tracking gets tiring — Buaze Pro opens up several useful areas:",
        feature1: 'Pulse AI drafts professional reply suggestions in seconds',
        feature2: 'Automatic low-rating alerts + email notifications',
        feature3: 'Detailed analytics: platform breakdown, hourly trend, sentiment themes',
        feature4: 'Multiple locations + team roles',
        cta: 'View plans',
        footnote: 'This suggestion is sent only once a month. If you prefer your current plan, no action needed.',
      };

  const merged = await loadMailCopy('upgrade-suggestion', locale, inlineDefault);
  const fallbackName = isTr ? 'merhaba' : 'hi';
  const vars = {
    firstName: params.firstName || fallbackName,
    restaurantName: params.restaurantName,
    feedbackCount: String(params.feedbackCount),
  };
  const copy = deepSubstitute(merged, vars, 'html');
  const copyText = deepSubstitute(merged, vars, 'text');

  const featureList = `
    <ul style="margin: 0; padding: 0 0 0 20px; color: #1A1A1A; font-size: 14px; line-height: 1.6;">
      <li style="margin-bottom: 8px;">${copy.feature1}</li>
      <li style="margin-bottom: 8px;">${copy.feature2}</li>
      <li style="margin-bottom: 8px;">${copy.feature3}</li>
      <li>${copy.feature4}</li>
    </ul>
  `;

  const content = [
    renderEyebrow(copy.eyebrow),
    renderH1(copy.title),
    spacer(8),
    renderP(copy.intro),
    spacer(16),
    featureList,
    spacer(28),
    renderButton({ href: params.pricingUrl, label: copy.cta, variant: 'lime', size: 'lg' }),
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
    `• ${copyText.feature1}`,
    `• ${copyText.feature2}`,
    `• ${copyText.feature3}`,
    `• ${copyText.feature4}`,
    '',
    `→ ${copyText.cta}: ${params.pricingUrl}`,
    '',
    copyText.footnote,
  ].join('\n');

  return {
    subject,
    html: pulseLayout({ subject, preheader, content }),
    text,
  };
}
