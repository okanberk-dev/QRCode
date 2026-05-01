import { pulseLayout } from '../layout';
import { renderEyebrow, renderH1, renderH2, renderP, renderButton, spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

export interface FirstFeedbackTipsParams {
  firstName?: string | null;
  restaurantName: string;
  dashboardUrl: string;
}

// Lifecycle email — QR indirildi (`QrGeneration.count > 0`) ama 2-3 gün
// geçti, hâlâ feedback yok (CLAUDE.md §21.34 + §23.7 Phase 11.30).
// Idempotent: 1 kez (lifetime).

export async function renderFirstFeedbackTips(
  params: FirstFeedbackTipsParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const subject = isTr
    ? 'İlk geri bildiriminizi almak için 3 pratik öneri'
    : '3 practical tips to collect your first feedback';
  const preheader = isTr
    ? `${params.restaurantName} için QR kartınız hazır. İlk yorumun gelmesi için küçük dokunuşlar.`
    : `Your QR for ${params.restaurantName} is ready. Small touches that bring in the first review.`;

  const inlineDefault = isTr
    ? {
        eyebrow: 'İLK YORUM REHBERİ',
        title: 'Merhaba ${firstName}, ilk yorum yolda',
        intro: 'QR kodunuzu hazırladınız — şimdi onu görünür ve davetkâr hale getirme zamanı. ${restaurantName} için hızlıca uygulayabileceğiniz 3 pratik öneri:',
        tip1Title: '1. Görünürlük: doğru yer',
        tip1Body: 'QR kartını masada / kasada / paket fişinin altında müşterinin gözüne ilk takılan noktaya yerleştirin. Menü altında görünmez kalan QR çalışmaz.',
        tip2Title: '2. Personel: doğal davet',
        tip2Body: 'Garson / kasiyer "memnun kaldıysanız QR\'ı taratın" tarzı tek cümlelik doğal bir hatırlatma yapsa, tarama oranı belirgin şekilde artar. Zorlama değil, doğal akış.',
        tip3Title: '3. Görsel mesaj: net çağrı',
        tip3Body: 'QR kartının üstüne "Deneyiminizi paylaşın" / "Yorumunuz bizim için değerli" gibi tek satır net çağrı yazın. Müşteri ne yapacağını bilirse harekete geçer.',
        cta: 'Panele dönün',
        footnote: 'Bu öneri serisi sadece bir kez gönderilir. İlk yorumunuz geldiğinde panel size bildirir.',
      }
    : {
        eyebrow: 'FIRST REVIEW GUIDE',
        title: 'Hi ${firstName}, your first review is close',
        intro: 'Your QR is ready — now make it visible and inviting. Three practical tips you can apply for ${restaurantName} today:',
        tip1Title: '1. Visibility: right placement',
        tip1Body: 'Place the QR on the table / counter / takeaway receipt where the customer notices it first. A QR hidden under the menu does nothing.',
        tip2Title: '2. Staff: natural invitation',
        tip2Body: 'If a server / cashier mentions "scan the QR if you enjoyed it" as a single natural sentence, scan rate noticeably increases. No pressure, just flow.',
        tip3Title: '3. Visual message: clear call',
        tip3Body: 'Put a one-line clear prompt on the QR card: "Share your experience" / "Your review matters". Customers act when they know what to do.',
        cta: 'Go to dashboard',
        footnote: "These tips are sent only once. Your panel will notify you when the first review arrives.",
      };

  const merged = await loadMailCopy('first-feedback-tips', locale, inlineDefault);
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
    spacer(20),
    renderH2(copy.tip1Title),
    renderP(copy.tip1Body),
    spacer(12),
    renderH2(copy.tip2Title),
    renderP(copy.tip2Body),
    spacer(12),
    renderH2(copy.tip3Title),
    renderP(copy.tip3Body),
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
    copyText.tip1Title,
    copyText.tip1Body,
    '',
    copyText.tip2Title,
    copyText.tip2Body,
    '',
    copyText.tip3Title,
    copyText.tip3Body,
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
