import { pulseLayout } from '../layout';
import { renderEyebrow, renderH1, renderP, renderButton, spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

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

  const inlineDefault = isTr
    ? {
        eyebrow: 'TEKRAR HOŞ GELDİNİZ',
        title: 'Merhaba ${firstName}, panele bir göz atalım',
        intro: 'Bir süredir sizden haber alamıyoruz. Bu süre içinde QR kodunuz çalışmaya devam etti — gelen yorumları, platform yönlendirmelerini ve son test sonuçlarını panelde görebilirsiniz.',
        suggestion: 'Eğer yorum akışı yavaşladıysa, hızlı 3 kontrol noktası: QR kartınızın yerinde olması, Platform Bağlantılarının aktif kalması ve Google linkinizin doğru bir liste sayfasına işaret etmesi.',
        cta: 'Panele göz at',
        footnote: 'Bu mesaj ayda en fazla bir kez gönderilir. Aktif kullanıma döndüğünüzde otomatik olarak duracak.',
      }
    : {
        eyebrow: 'WELCOME BACK',
        title: "Hi ${firstName}, let's check the panel together",
        intro: "We haven't heard from you in a while. In the meantime your QR has been quietly working — sign in to see incoming reviews, platform redirects, and recent test results.",
        suggestion: 'If the review flow has slowed, three quick checks: the QR card is in place, your Platform Links are active, and your Google link points to a real listing page.',
        cta: 'Open dashboard',
        footnote: 'This message is sent at most once a month. It stops automatically once you become active again.',
      };

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
