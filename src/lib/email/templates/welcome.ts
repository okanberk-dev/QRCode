import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { renderEyebrow, renderP, renderButton, renderEcgDivider, spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

export interface WelcomeParams {
  firstName?: string | null;
  dashboardUrl: string;
  demoUrl?: string;
}

export async function renderWelcome(
  params: WelcomeParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const subject = isTr ? 'Hoş geldin — ilk QR kodun 4 adım uzakta' : 'Welcome — your first QR is 4 steps away';
  const preheader = isTr
    ? 'Hesabını aktive ettik. Sıradaki adım: işletme bilgilerini doldurmak.'
    : 'Your account is active. Next: fill out your business details.';

  const inlineDefault = isTr ? {
    eyebrow: 'Hoş geldin · Sayı bir',
    titleHi: 'Merhaba ${firstName}.',
    titleSub: 'Şimdi başlıyoruz.',
    intro: 'Hesabını oluşturduğun için teşekkürler. Aşağıdaki 4 adımı tamamladığında masandaki ilk QR kod canlıya çıkmış olacak.',
    stepsEyebrow: 'Kurulum · 4 adım',
    nextLabel: 'Sıradaki',
    cta: 'Kuruluma devam et →',
    demoLink: 'Demo videoyu izle (2 dk)',
    resourcesEyebrow: 'İlk gün için',
    steps: [
      { n: '01', t: 'İşletme profilini tamamla', d: 'İsim, telefon, adres. Yorumların altında bu bilgiler görünür.', state: 'done' as const },
      { n: '02', t: 'Sektörünü seç', d: 'Restoran, otel, klinik, perakende — şablonlar buna göre uyarlanır.', state: 'current' as const },
      { n: '03', t: 'Platformları bağla', d: 'Google, Yemeksepeti, Getir, Trendyol GO. Tek panelden hepsi.', state: 'pending' as const },
      { n: '04', t: 'İlk QR kodunu üret', d: 'Masa, paket, fiş — şablon seç, indir, kullanmaya başla.', state: 'pending' as const },
    ],
    resources: [
      { t: '5 yıldız almak için 7 ipucu', s: 'Rehber · 4 dk', icon: '★' },
      { t: 'Düşük puanlara nasıl yanıt verilir', s: 'Şablon · 3 dk', icon: '◐' },
      { t: 'QR\'ı masaya en iyi nasıl yerleştirirsin', s: 'Vaka · 5 dk', icon: '⌖' },
      { t: 'Ekibini panele nasıl davet edersin', s: 'Yardım · 2 dk', icon: '◇' },
    ],
  } : {
    eyebrow: 'Welcome · Issue 1',
    titleHi: 'Hi ${firstName}.',
    titleSub: 'Now we begin.',
    intro: 'Thanks for joining Buaze. Once you finish these 4 steps, your first QR code goes live on a real table.',
    stepsEyebrow: 'Setup · 4 steps',
    nextLabel: 'Next',
    cta: 'Continue setup →',
    demoLink: 'Watch demo (2 min)',
    resourcesEyebrow: 'For your first day',
    steps: [
      { n: '01', t: 'Complete your business profile', d: 'Name, phone, address. These appear under your reviews.', state: 'done' as const },
      { n: '02', t: 'Pick your industry', d: 'Restaurant, hotel, clinic, retail — templates adapt.', state: 'current' as const },
      { n: '03', t: 'Connect platforms', d: 'Google, Yemeksepeti, Getir, Trendyol GO. All from one panel.', state: 'pending' as const },
      { n: '04', t: 'Generate your first QR', d: 'Table, takeaway, receipt — pick a template, download, start.', state: 'pending' as const },
    ],
    resources: [
      { t: '7 tips to earn 5-star reviews', s: 'Guide · 4 min', icon: '★' },
      { t: 'How to reply to low ratings', s: 'Template · 3 min', icon: '◐' },
      { t: 'Best QR placement on tables', s: 'Case · 5 min', icon: '⌖' },
      { t: 'Inviting your team to the panel', s: 'Help · 2 min', icon: '◇' },
    ],
  };

  // DB-driven copy override. Admin edits land in `mail_templates` and merge
  // over the inline default. After merge, runtime placeholders (`${firstName}`)
  // are substituted — admin can keep / move / remove the token and the
  // greeting still personalises per recipient.
  const merged = await loadMailCopy('welcome', locale, inlineDefault);
  const fallbackName = isTr ? 'merhaba' : 'hi';
  const vars = { firstName: params.firstName || fallbackName };
  const copy = deepSubstitute(merged, vars, 'html');
  const copyText = deepSubstitute(merged, vars, 'text');

  const demoUrl = params.demoUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com'}/${isTr ? 'tr' : 'en'}/how-it-works`;

  // Steps — done/current/pending visual states matching welcome.jsx:38-71
  const stepRows = copy.steps.map((s, i) => {
    const bg = s.state === 'done' ? PULSE.graphite : s.state === 'current' ? PULSE.lime : PULSE.n100;
    const fg = s.state === 'done' ? PULSE.pure : PULSE.graphite;
    const opacity = s.state === 'done' ? 'opacity:0.5;' : '';
    const titleStyle = s.state === 'done' ? 'text-decoration:line-through;' : '';
    const numOrCheck = s.state === 'done' ? '✓' : s.n;
    const nextPill = s.state === 'current'
      ? `<span style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.18em;color:${PULSE.graphite};background:${PULSE.limeSoft};padding:4px 8px;border-radius:6px;text-transform:uppercase;font-weight:500;">${copy.nextLabel}</span>`
      : '';
    return `
      <tr style="${opacity}">
        <td valign="top" style="width:56px;padding:18px 0;${i === 0 ? `border-top:1px solid ${PULSE.n200};` : ''}border-bottom:1px solid ${PULSE.n200};">
          <div style="width:36px;height:36px;border-radius:10px;background:${bg};color:${fg};text-align:center;line-height:36px;font-family:${FONTS.mono};font-size:12px;font-weight:500;">${numOrCheck}</div>
        </td>
        <td valign="top" style="padding:18px 0 18px 20px;${i === 0 ? `border-top:1px solid ${PULSE.n200};` : ''}border-bottom:1px solid ${PULSE.n200};">
          <div style="font-family:${FONTS.heading};font-size:18px;font-weight:500;color:${PULSE.graphite};letter-spacing:-0.015em;${titleStyle}">${s.t}</div>
          <div style="height:4px;line-height:1px;font-size:1px;">&nbsp;</div>
          ${renderP(s.d, { size: 13 })}
        </td>
        <td valign="top" align="right" style="padding:18px 0;${i === 0 ? `border-top:1px solid ${PULSE.n200};` : ''}border-bottom:1px solid ${PULSE.n200};">${nextPill}</td>
      </tr>
    `;
  }).join('');

  // Resource grid — 2x2 — matches welcome.jsx:87-113
  const baseAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com';
  const helpHref = `${baseAppUrl}/${isTr ? 'tr' : 'en'}/help/page`;
  const resourceCard = (r: { t: string; s: string; icon: string }) => `
    <a href="${helpHref}" style="display:block;padding:18px;background:${PULSE.n50};border:1px solid ${PULSE.n200};border-radius:12px;text-decoration:none;">
      <div style="margin-bottom:10px;">
        <span style="display:inline-block;width:28px;height:28px;border-radius:8px;background:${PULSE.graphite};color:${PULSE.lime};text-align:center;line-height:28px;font-family:${FONTS.heading};font-size:14px;">${r.icon}</span>
      </div>
      <div style="font-family:${FONTS.heading};font-size:14px;font-weight:500;color:${PULSE.graphite};letter-spacing:-0.01em;line-height:1.35;">${r.t}</div>
      <div style="margin-top:6px;font-size:11px;color:${PULSE.n500};font-family:${FONTS.mono};letter-spacing:0.05em;">${r.s}</div>
    </a>
  `;
  const resourceGrid = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row">
      <tr>
        <td class="col-half" valign="top" style="width:50%;padding:0 6px 12px 0;">${resourceCard(copy.resources[0])}</td>
        <td class="col-half" valign="top" style="width:50%;padding:0 0 12px 6px;">${resourceCard(copy.resources[1])}</td>
      </tr>
      <tr>
        <td class="col-half" valign="top" style="width:50%;padding:0 6px 0 0;">${resourceCard(copy.resources[2])}</td>
        <td class="col-half" valign="top" style="width:50%;padding:0 0 0 6px;">${resourceCard(copy.resources[3])}</td>
      </tr>
    </table>
  `;

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="background:${PULSE.lime};padding:40px 40px 0;">
          <div style="font-family:${FONTS.mono};font-size:11px;letter-spacing:0.18em;color:${PULSE.n800};text-transform:uppercase;font-weight:500;text-align:right;">${copy.eyebrow}</div>
          ${spacer(18)}
          <h1 class="bz-h1-lg" style="font-family:${FONTS.heading};font-size:48px;font-weight:500;letter-spacing:-0.025em;line-height:1.1;color:${PULSE.graphite};margin:0;">
            ${copy.titleHi}<br/>
            <span style="color:${PULSE.n800};font-style:italic;">${copy.titleSub}</span>
          </h1>
          ${spacer(18)}
          <div style="font-family:${FONTS.body};font-size:16px;color:${PULSE.n800};line-height:1.6;">${copy.intro}</div>
          ${spacer(24)}
          <div style="margin:0 -40px -1px;">${renderEcgDivider({ color: PULSE.graphite, height: 22 })}</div>
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:40px 40px 8px;">
          ${renderEyebrow(copy.stepsEyebrow)}
          ${spacer(18)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${stepRows}</table>
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:32px 40px 8px;">
          ${renderButton({ href: params.dashboardUrl, label: copy.cta, size: 'lg' })}
          <span style="margin-left:14px;">
            <a href="${demoUrl}" style="font-size:14px;color:${PULSE.n600};text-decoration:none;border-bottom:1px solid ${PULSE.n300};">${copy.demoLink}</a>
          </span>
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:36px 40px 44px;">
          ${renderEyebrow(copy.resourcesEyebrow)}
          ${spacer(14)}
          ${resourceGrid}
        </td>
      </tr>
    </table>
  `;

  const html = pulseLayout({
    subject,
    preheader,
    content,
    eyebrow: isTr ? 'Hoş geldin' : 'Welcome',
    footer: { locale },
  });
  const text = `${copyText.titleHi} ${copyText.titleSub}\n\n${copyText.intro}\n\n` +
    copyText.steps.map((s) => `${s.n} · ${s.t} — ${s.d}`).join('\n') +
    `\n\n${copyText.cta} ${params.dashboardUrl}\n${copyText.demoLink}: ${demoUrl}`;
  return { subject, html, text };
}
