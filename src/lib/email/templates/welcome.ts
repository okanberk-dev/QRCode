import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderP, renderButton, spacer, renderEcgDivider } from '../components';

export interface WelcomeParams {
  firstName?: string | null;
  dashboardUrl: string;
}

export function renderWelcome(params: WelcomeParams, locale: 'tr' | 'en' = 'tr'): { subject: string; html: string; text: string } {
  const isTr = locale !== 'en';
  const name = params.firstName ? escapeHtml(params.firstName) : (isTr ? 'merhaba' : 'hi');
  const subject = isTr ? 'Hoş geldin — ilk QR kodun 4 adım uzakta' : 'Welcome — your first QR is 4 steps away';
  const preheader = isTr
    ? 'Hesabını aktive ettik. Sıradaki adım: işletme bilgilerini doldurmak.'
    : 'Your account is active. Next: fill out your business details.';

  const copy = isTr ? {
    eyebrow: 'Hoş geldin · Sayı bir',
    titleHi: `Merhaba ${name}.`,
    titleSub: 'Şimdi başlıyoruz.',
    intro: 'Hesabını oluşturduğun için teşekkürler. Aşağıdaki 4 adımı tamamladığında masandaki ilk QR kod canlıya çıkmış olacak.',
    stepsEyebrow: 'Kurulum · 4 adım',
    cta: 'Panele git →',
    helpEyebrow: 'Yardım',
    helpBody: 'Takıldığın yerde Yardım > Hızlı Başlangıç sayfasına bakabilir veya bu maile yanıt verebilirsin — gerçek bir insan okuyor.',
    steps: [
      ['01', 'İşletme profilini tamamla', 'İsim, telefon, adres. Yorumların altında bu bilgiler görünür.'],
      ['02', 'Sektörünü seç', 'Restoran, otel, klinik, perakende — şablonlar buna göre uyarlanır.'],
      ['03', 'Platformları bağla', 'Google, Yemeksepeti, Getir, Trendyol GO. Tek panelden hepsi.'],
      ['04', 'İlk QR kodunu üret', 'Masa, paket, fiş — şablon seç, indir, kullanmaya başla.'],
    ] as Array<[string, string, string]>,
  } : {
    eyebrow: 'Welcome · Issue 1',
    titleHi: `Hi ${name}.`,
    titleSub: 'Now we begin.',
    intro: 'Thanks for joining Buaze. Once you finish these 4 steps, your first QR code goes live on a real table.',
    stepsEyebrow: 'Setup · 4 steps',
    cta: 'Open dashboard →',
    helpEyebrow: 'Help',
    helpBody: 'Stuck somewhere? Check Help > Quickstart or just reply to this email — a real human reads it.',
    steps: [
      ['01', 'Complete your business profile', 'Name, phone, address. These appear under your reviews.'],
      ['02', 'Pick your industry', 'Restaurant, hotel, clinic, retail — templates adapt accordingly.'],
      ['03', 'Connect platforms', 'Google, Yemeksepeti, Getir, Trendyol GO. All from one panel.'],
      ['04', 'Generate your first QR', 'Table, takeaway, receipt — pick a template, download, start using.'],
    ] as Array<[string, string, string]>,
  };

  const stepRows = copy.steps.map((s, i) => `
    <tr>
      <td valign="top" style="width:56px;padding:14px 0 14px 0;">
        <span style="display:inline-block;padding:6px 10px;background:${i === 0 ? PULSE.graphite : PULSE.n100};color:${i === 0 ? PULSE.lime : PULSE.graphite};border-radius:8px;font-family:${FONTS.mono};font-size:12px;font-weight:600;letter-spacing:0.04em;">${s[0]}</span>
      </td>
      <td valign="top" style="padding:14px 0 14px 16px;border-top:${i === 0 ? 'none' : `1px solid ${PULSE.n200}`};">
        <div style="font-family:${FONTS.heading};font-size:17px;font-weight:500;color:${PULSE.graphite};letter-spacing:-0.015em;line-height:1.3;">${s[1]}</div>
        <div style="font-family:${FONTS.body};font-size:13px;color:${PULSE.n600};margin-top:4px;line-height:1.55;">${s[2]}</div>
      </td>
    </tr>
  `).join('');

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="background:${PULSE.lime};padding:40px 40px 0;">
          <div style="font-family:${FONTS.mono};font-size:11px;letter-spacing:0.18em;color:${PULSE.n800};text-transform:uppercase;font-weight:500;">${copy.eyebrow}</div>
          ${spacer(18)}
          <h1 class="bz-h1-lg" style="font-family:${FONTS.heading};font-size:46px;font-weight:500;letter-spacing:-0.025em;line-height:1.1;color:${PULSE.graphite};margin:0;">
            ${copy.titleHi}<br/>
            <span style="color:${PULSE.n800};font-style:italic;">${copy.titleSub}</span>
          </h1>
          ${spacer(18)}
          <div style="font-family:${FONTS.body};font-size:16px;color:${PULSE.n800};line-height:1.6;">${copy.intro}</div>
          ${spacer(28)}
          <div style="margin:0 -40px -1px;">${renderEcgDivider({ color: PULSE.graphite, height: 22 })}</div>
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:36px 40px 8px;">
          ${renderEyebrow(copy.stepsEyebrow)}
          ${spacer(14)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${stepRows}</table>
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:24px 40px 8px;">
          ${renderButton({ href: params.dashboardUrl, label: copy.cta, size: 'lg' })}
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:24px 40px 40px;">
          <div style="background:${PULSE.n50};border:1px solid ${PULSE.n200};border-radius:14px;padding:22px 24px;">
            ${renderEyebrow(copy.helpEyebrow)}
            ${spacer(8)}
            ${renderP(copy.helpBody, { size: 13, color: PULSE.n700 })}
          </div>
        </td>
      </tr>
    </table>
  `;

  const html = pulseLayout({ subject, preheader, content, eyebrow: isTr ? 'Hoş geldin' : 'Welcome', footer: { locale } });
  const text = `${copy.titleHi} ${copy.titleSub}\n\n${copy.intro}\n\n` +
    copy.steps.map((s) => `${s[0]} · ${s[1]} — ${s[2]}`).join('\n') +
    `\n\n${copy.cta} ${params.dashboardUrl}`;
  return { subject, html, text };
}
