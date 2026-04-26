import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderH1, renderP, renderButton, renderEcgDivider, spacer } from '../components';

export interface NewsletterPost {
  title: string;
  excerpt?: string | null;
  url: string;
  category?: string | null;
  readMinutes?: number | null;
}

export interface NewsletterParams {
  issueNumber?: number;
  posts: NewsletterPost[];
  unsubscribeUrl: string;
  exploreUrl?: string;
}

export function renderNewsletter(params: NewsletterParams, locale: 'tr' | 'en' = 'tr'): { subject: string; html: string; text: string } {
  const isTr = locale !== 'en';
  const issueLabel = params.issueNumber ? `Pulse #${String(params.issueNumber).padStart(2, '0')}` : 'Pulse';
  const subject = isTr
    ? `${issueLabel} · Bu ay Buaze\'de neler oldu`
    : `${issueLabel} · What\'s new at Buaze this month`;
  const preheader = isTr
    ? 'Aylık vakalar, sektör verisi ve perde arkası — 4 dakikada okunur.'
    : 'Monthly cases, sector data, and behind the scenes — 4 min read.';

  const monthLabel = new Date().toLocaleDateString(isTr ? 'tr-TR' : 'en-US', { month: 'long', year: 'numeric' });

  const copy = isTr ? {
    eyebrow: `${issueLabel} · ${monthLabel}`,
    title: 'Sessiz misafiri',
    titleHighlight: 'duyabilmek',
    titleSuffix: 'sanatı.',
    intro: 'Müşterilerin yalnızca %4\'ü kötü deneyim yaşadığında konuşur. Geriye kalan %96\'yı duymak için Buaze ne yapıyor — bu sayıda anlatıyoruz.',
    coverEyebrow: 'Bu sayıda',
    statsTitle: 'Bu ayın küçük rakamları',
    stats: [
      { v: '%96', k: 'sessiz kalır' },
      { v: '+184%', k: 'organik yorum' },
      { v: '1.4s', k: 'ortalama yanıt' },
    ],
    futureLabel: 'Önümüzdeki sayı',
    futureBody: 'Otel sektörü vakası, yeni heatmap görselleri ve OAuth entegrasyonları geliyor.',
    exploreCta: 'Tüm sayıları gör →',
    readMinutesUnit: 'dk',
  } : {
    eyebrow: `${issueLabel} · ${monthLabel}`,
    title: 'The art of',
    titleHighlight: 'hearing',
    titleSuffix: 'the silent guest.',
    intro: 'Only 4% of customers speak up when they have a bad experience. What does Buaze do to hear the silent 96%? This issue dives in.',
    coverEyebrow: 'In this issue',
    statsTitle: 'Small numbers, this month',
    stats: [
      { v: '96%', k: 'stay silent' },
      { v: '+184%', k: 'organic reviews' },
      { v: '1.4s', k: 'avg response' },
    ],
    futureLabel: 'Next issue',
    futureBody: 'Hotel sector case study, new heatmap visualizations, and OAuth integrations.',
    exploreCta: 'Browse all issues →',
    readMinutesUnit: 'min',
  };

  const exploreUrl = params.exploreUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com'}/${isTr ? 'tr' : 'en'}/blog`;

  const postRows = params.posts.slice(0, 4).map((p, i) => {
    const num = String(i + 1).padStart(2, '0');
    const cat = p.category ? escapeHtml(p.category) : (isTr ? 'YAZI' : 'POST');
    const read = p.readMinutes ? `${p.readMinutes} ${copy.readMinutesUnit}` : '';
    const title = escapeHtml(p.title);
    const excerpt = p.excerpt ? escapeHtml(p.excerpt) : '';
    return `
      <tr>
        <td style="padding:18px 0;border-top:1px solid ${PULSE.n200};${i === params.posts.length - 1 ? `border-bottom:1px solid ${PULSE.n200};` : ''}">
          <a href="${p.url}" style="text-decoration:none;display:block;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td valign="top" style="width:36px;font-family:${FONTS.mono};font-size:13px;color:${PULSE.n400};font-weight:500;">${num}</td>
                <td valign="top" style="padding-left:8px;">
                  <div style="font-family:${FONTS.heading};font-size:17px;font-weight:500;color:${PULSE.graphite};letter-spacing:-0.015em;line-height:1.35;">${title}</div>
                  ${excerpt ? `<div style="font-family:${FONTS.body};font-size:13px;color:${PULSE.n600};margin-top:4px;line-height:1.55;">${excerpt}</div>` : ''}
                  <div style="margin-top:8px;font-family:${FONTS.mono};font-size:11px;color:${PULSE.n500};letter-spacing:0.05em;text-transform:uppercase;">${cat}${read ? ` · ${read}` : ''}</div>
                </td>
                <td valign="middle" align="right" style="width:30px;color:${PULSE.n400};font-size:18px;font-family:${FONTS.body};">→</td>
              </tr>
            </table>
          </a>
        </td>
      </tr>
    `;
  }).join('');

  const statCells = copy.stats.map((s, i) => `
    <td class="stack-col" valign="top" style="width:33.33%;padding:0 16px;${i === 0 ? 'padding-left:0;' : ''}${i < copy.stats.length - 1 ? `border-right:1px solid ${PULSE.n200};` : 'padding-right:0;'}">
      <div style="font-family:${FONTS.heading};font-size:32px;font-weight:500;letter-spacing:-0.025em;color:${PULSE.graphite};line-height:1;">${s.v}</div>
      <div style="margin-top:6px;font-family:${FONTS.body};font-size:12px;color:${PULSE.n500};">${s.k}</div>
    </td>
  `).join('');

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="padding:40px 40px 36px;">
          ${renderEyebrow(copy.eyebrow)}
          ${spacer(18)}
          <h1 class="bz-h1-lg" style="font-family:${FONTS.heading};font-size:48px;font-weight:500;letter-spacing:-0.025em;line-height:1.05;color:${PULSE.graphite};margin:0;">
            ${copy.title}<br/>
            <span style="display:inline-block;background:${PULSE.lime};padding:0 6px;">${copy.titleHighlight}</span> ${copy.titleSuffix}
          </h1>
          ${spacer(20)}
          ${renderP(copy.intro, { size: 16 })}
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:0 40px;">
          ${renderEcgDivider({ color: PULSE.lime, height: 22 })}
        </td>
      </tr>
      ${postRows ? `
      <tr>
        <td class="bz-pad" style="padding:32px 40px 16px;">
          ${renderEyebrow(copy.coverEyebrow)}
          ${spacer(14)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${postRows}</table>
        </td>
      </tr>` : ''}
      <tr>
        <td class="bz-pad" style="padding:24px 40px 16px;">
          <div style="background:${PULSE.n50};border:1px solid ${PULSE.n200};border-radius:14px;padding:22px 28px;">
            ${renderEyebrow(copy.statsTitle)}
            ${spacer(14)}
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row">
              <tr>${statCells}</tr>
            </table>
          </div>
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:8px 40px 36px;">
          ${renderEyebrow(copy.futureLabel)}
          ${spacer(8)}
          ${renderP(copy.futureBody, { size: 13, color: PULSE.n600 })}
          ${spacer(18)}
          <a href="${exploreUrl}" style="font-family:${FONTS.body};font-size:14px;color:${PULSE.graphite};font-weight:500;border-bottom:1px solid ${PULSE.graphite};text-decoration:none;">${copy.exploreCta}</a>
        </td>
      </tr>
    </table>
  `;

  const html = pulseLayout({
    subject,
    preheader,
    content,
    eyebrow: issueLabel,
    footer: {
      locale,
      unsubscribeUrl: params.unsubscribeUrl,
      unsubText: isTr ? 'Aylık bülteni almayı bırakmak için' : 'To stop receiving the monthly digest',
    },
  });
  const text = `${copy.title} ${copy.titleHighlight} ${copy.titleSuffix}\n\n${copy.intro}\n\n` +
    params.posts.map((p, i) => `${i + 1}. ${p.title} — ${p.url}`).join('\n');
  return { subject, html, text };
}
