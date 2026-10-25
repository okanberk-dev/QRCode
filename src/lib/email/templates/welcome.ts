import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderP, renderButton, renderBadge, spacer } from '../components';
import { LC_TABLE, lcPage, lcSection, lcHero, lcChip, lcTextLink, lcSubLine } from './lifecycle-ui';
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

  const demoUrl = params.demoUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com'}/${isTr ? 'tr' : 'en'}/how-it-works`;

  // Steps — done / current / pending. State colours are explicit (no row
  // opacity: Outlook ignores it) and the "next" badge sits above the title so
  // it can never be squeezed into a third column on phones.
  const stepRows = copy.steps.map((s, i) => {
    const done = s.state === 'done';
    const current = s.state === 'current';
    const chip = lcChip(done ? '✓' : s.n, {
      size: 36,
      bg: done ? PULSE.graphite : current ? PULSE.lime : PULSE.n100,
      fg: done ? PULSE.lime : current ? PULSE.graphite : PULSE.n500,
      fontSize: 12,
    });
    const nextBadge = current
      ? `<div style="margin-bottom:8px;">${renderBadge({ text: copy.nextLabel, variant: 'lime-on-dark' })}</div>`
      : '';
    const border = `${i === 0 ? `border-top:1px solid ${PULSE.n200};` : ''}border-bottom:1px solid ${PULSE.n200};`;
    const titleStyle = done ? `color:${PULSE.n400};text-decoration:line-through;` : `color:${PULSE.graphite};`;
    return `
      <tr>
        <td valign="top" width="52" style="width:52px;padding:18px 16px 18px 0;${border}">${chip}</td>
        <td valign="top" style="padding:16px 0 18px;${border}">
          ${nextBadge}
          <div style="font-family:${FONTS.heading};font-size:16px;font-weight:600;line-height:1.35;letter-spacing:-0.01em;${titleStyle}">${s.t}</div>
          ${spacer(4)}
          ${renderP(s.d, { size: 13, color: done ? PULSE.n400 : PULSE.n600 })}
        </td>
      </tr>`;
  }).join('');

  // Resource list — ONE column at every width: a single rounded panel with
  // hairline-separated rows (chip · title/meta · chevron). Side-by-side cards
  // can't be both equal-height (only sibling cells stretch) and self-stacking
  // (needs inline-block); a list is neither, so it holds up with or without the
  // <style> block (Gmail app on non-Google accounts) and at 320px. Only the
  // title and chevron are links; the cells carry the padding (Outlook drops
  // padding on display:block anchors).
  // CLAUDE.md §38.132 — /help index page mevcut; /help/page route YOK
  // (CLAUDE.md §22 — `/help/[slug]` detail vs `/help` index ayrımı).
  const baseAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com';
  const helpHref = `${baseAppUrl}/${isTr ? 'tr' : 'en'}/help`;
  const resourceRow = (r: { t: string; s: string; icon: string }, i: number) => {
    const rule = i > 0 ? `border-top:1px solid ${PULSE.n200};` : '';
    return `
      <tr>
        <td valign="middle" width="36" style="width:36px;padding:14px 0 14px 16px;${rule}">${lcChip(r.icon, { size: 36, fontSize: 16, radius: 10 })}</td>
        <td valign="middle" style="padding:14px 8px 14px 14px;${rule}">
          <a href="${helpHref}" style="font-family:${FONTS.heading};font-size:14px;font-weight:600;line-height:1.4;letter-spacing:-0.005em;color:${PULSE.graphite};text-decoration:none;">${r.t}</a>
          <div style="margin-top:3px;font-family:${FONTS.label};font-size:11px;font-weight:500;line-height:1.4;letter-spacing:0.04em;color:${PULSE.n500};">${r.s}</div>
        </td>
        <td valign="middle" align="right" width="14" style="width:14px;padding:14px 16px 14px 0;${rule}"><a href="${helpHref}" style="font-family:${FONTS.body};font-size:22px;font-weight:500;line-height:1;color:${PULSE.n400};text-decoration:none;">&rsaquo;</a></td>
      </tr>`;
  };
  const resourceGrid = `
    <table ${LC_TABLE} width="100%" style="width:100%;background:${PULSE.n50};border:1px solid ${PULSE.n200};border-radius:14px;border-collapse:separate;">
      ${copy.resources.map(resourceRow).join('')}
    </table>`;

  const content = lcPage([
    lcHero({
      eyebrow: copy.eyebrow,
      eyebrowColor: PULSE.n800,
      title: `${copy.titleHi}${lcSubLine(copy.titleSub, 44, `color:${PULSE.n800};font-style:italic;`)}`,
      titleSize: 44,
      intro: [copy.intro],
      introSize: 16,
      introColor: PULSE.n800,
      bg: PULSE.lime,
      ecg: 'graphite',
    }),
    lcSection(`${renderEyebrow(copy.stepsEyebrow)}${spacer(14)}<table ${LC_TABLE} width="100%">${stepRows}</table>`, { padding: '40px 40px 8px' }),
    lcSection(`${renderButton({ href: escapeHtml(params.dashboardUrl), label: copy.cta, size: 'lg' })}${spacer(6)}${lcTextLink(demoUrl, copy.demoLink)}`, { padding: '28px 40px 8px' }),
    lcSection(`${renderEyebrow(copy.resourcesEyebrow)}${spacer(14)}${resourceGrid}`, { padding: '36px 40px 44px' }),
  ]);

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
