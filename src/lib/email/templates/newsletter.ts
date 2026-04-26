import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderP, renderButton, renderEcgDivider, spacer } from '../components';

export interface NewsletterPost {
  title: string;
  excerpt?: string | null;
  url: string;
  category?: string | null;
  readMinutes?: number | null;
}

export interface NewsletterParams {
  issueNumber?: number;
  /** Featured headline post (rendered in the dark hero card). When omitted the
   *  monthly cron uses posts[0] automatically. */
  featured?: NewsletterPost;
  posts: NewsletterPost[];
  unsubscribeUrl: string;
  exploreUrl?: string;
}

export function renderNewsletter(
  params: NewsletterParams,
  locale: 'tr' | 'en' = 'tr',
): { subject: string; html: string; text: string } {
  const isTr = locale !== 'en';
  const issueLabel = params.issueNumber ? `Pulse #${String(params.issueNumber).padStart(2, '0')}` : 'Pulse';
  const subject = isTr
    ? `${issueLabel} — Yorum yönetiminin geleceği`
    : `${issueLabel} — The future of review management`;
  const preheader = isTr
    ? 'Bu sayıda: AI Co-Pilot 2.0, restoran vakası, sektör verileri.'
    : 'This issue: AI Co-Pilot 2.0, restaurant case, sector data.';

  const monthLabel = new Date().toLocaleDateString(isTr ? 'tr-TR' : 'en-US', { month: 'long', year: 'numeric' });

  // Featured falls back to posts[0]; rest of the list shifts accordingly
  const featured: NewsletterPost | undefined = params.featured ?? params.posts[0];
  const restPosts = params.featured ? params.posts : params.posts.slice(1);

  const copy = isTr ? {
    eyebrowTop: `${monthLabel} · Aylık bülten`,
    titleA: 'Sessiz misafiri',
    titleAccent: 'duyabilmek',
    titleEnd: 'sanatı.',
    intro: 'Müşterilerin yalnızca %4\'ü kötü deneyim yaşadığında konuşur. Geriye kalan %96\'yı duymak için ne gerekiyor — bu sayıda anlatıyoruz.',
    cta: 'Editörün notunu oku →',
    featuredEyebrow: 'Kapak yazısı',
    listEyebrow: 'Bu sayıda',
    statsTitle: 'Bu ayın küçük rakamları',
    stats: [
      { v: '%96', k: 'sessiz kalır' },
      { v: '+184%', k: 'organik yorum' },
      { v: '1.4s', k: 'ortalama yanıt' },
    ],
    futureLabel: 'Önümüzdeki sayıda',
    futureBody: 'Otel sektörü vakası, yeni heatmap görselleri, OAuth entegrasyonları.',
    exploreCta: 'Tüm sayıları gör →',
    readMinutesUnit: 'dk',
    fallbackCategory: 'Yazı',
    featuredReadTime: '12 dk okuma',
    featuredOpen: 'Yazıyı aç →',
  } : {
    eyebrowTop: `${monthLabel} · Monthly newsletter`,
    titleA: 'The art of',
    titleAccent: 'hearing',
    titleEnd: 'the silent guest.',
    intro: 'Only 4% of customers speak up when they have a bad experience. What does it take to hear the silent 96%? This issue dives in.',
    cta: 'Read the editor\'s note →',
    featuredEyebrow: 'Cover story',
    listEyebrow: 'In this issue',
    statsTitle: 'Small numbers, this month',
    stats: [
      { v: '96%', k: 'stay silent' },
      { v: '+184%', k: 'organic reviews' },
      { v: '1.4s', k: 'avg response' },
    ],
    futureLabel: 'Next issue',
    futureBody: 'Hotel sector case, new heatmap visuals, OAuth integrations.',
    exploreCta: 'Browse all issues →',
    readMinutesUnit: 'min',
    fallbackCategory: 'Post',
    featuredReadTime: '12 min read',
    featuredOpen: 'Open article →',
  };

  const exploreUrl = params.exploreUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com'}/${isTr ? 'tr' : 'en'}/blog`;
  const editorNoteUrl = featured?.url ?? exploreUrl;

  // Featured dark card with code block (jsx:42-83)
  const featuredBlock = featured ? `
    <tr>
      <td class="bz-pad" style="padding:36px 40px 8px;">
        ${renderEyebrow(copy.featuredEyebrow)}
        ${spacer(14)}
        <div style="background:${PULSE.graphite};border-radius:14px;padding:32px;color:${PULSE.pure};">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row">
            <tr>
              <td class="stack-col" valign="top" style="width:58%;padding-right:24px;">
                <div style="font-family:${FONTS.mono};font-size:11px;letter-spacing:0.18em;color:${PULSE.lime};text-transform:uppercase;font-weight:600;">${featured.readMinutes ? `${featured.readMinutes} ${copy.readMinutesUnit} okuma` : copy.featuredReadTime}</div>
                ${spacer(12)}
                <h2 style="font-family:${FONTS.heading};font-size:26px;font-weight:500;letter-spacing:-0.02em;line-height:1.2;color:${PULSE.pure};margin:0;">${escapeHtml(featured.title)}</h2>
                ${featured.excerpt ? `${spacer(14)}<div style="font-family:${FONTS.body};font-size:14px;color:${PULSE.n300};line-height:1.55;">${escapeHtml(featured.excerpt)}</div>` : ''}
                ${spacer(18)}
                <a href="${featured.url}" style="display:inline-block;color:${PULSE.graphite};background:${PULSE.lime};padding:10px 18px;border-radius:8px;font-family:${FONTS.body};font-weight:600;font-size:13px;text-decoration:none;">${copy.featuredOpen}</a>
              </td>
              <td class="stack-col" valign="top" style="width:42%;padding-top:8px;">
                <div style="background:${PULSE.n800};border-radius:10px;padding:18px;font-family:${FONTS.mono};font-size:11px;color:${PULSE.n400};line-height:1.7;">
                  <div style="color:${PULSE.lime};">&gt; input.tone</div>
                  <div>"warm, restaurant-owner, 30y"</div>
                  <div style="margin-top:8px;color:${PULSE.lime};">&gt; model.draft</div>
                  <div style="color:${PULSE.pure};">"Selin hanım, kahvenizin..."</div>
                  <div style="margin-top:8px;color:${PULSE.n500};">latency: 1.2s · ✓</div>
                </div>
              </td>
            </tr>
          </table>
        </div>
      </td>
    </tr>` : '';

  // Articles list (jsx:90-112)
  const postRows = restPosts.slice(0, 4).map((p, i) => {
    const num = String(i + 1).padStart(2, '0');
    const cat = p.category ? escapeHtml(p.category) : copy.fallbackCategory;
    const read = p.readMinutes ? `${p.readMinutes} ${copy.readMinutesUnit}` : '';
    const isLast = i === Math.min(restPosts.length, 4) - 1;
    return `
      <tr>
        <td style="padding:18px 0;border-top:1px solid ${PULSE.n200};${isLast ? `border-bottom:1px solid ${PULSE.n200};` : ''}">
          <a href="${p.url}" style="text-decoration:none;display:block;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td valign="top" style="width:36px;font-family:${FONTS.mono};font-size:13px;color:${PULSE.n400};font-weight:500;">${num}</td>
                <td valign="top" style="padding-left:8px;">
                  <div style="font-family:${FONTS.heading};font-size:17px;font-weight:500;color:${PULSE.graphite};letter-spacing:-0.015em;line-height:1.35;">${escapeHtml(p.title)}</div>
                  ${p.excerpt ? `<div style="font-family:${FONTS.body};font-size:13px;color:${PULSE.n600};margin-top:4px;line-height:1.55;">${escapeHtml(p.excerpt)}</div>` : ''}
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

  // Stats band
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
          ${renderEyebrow(copy.eyebrowTop)}
          ${spacer(18)}
          <h1 class="bz-h1-lg" style="font-family:${FONTS.heading};font-size:48px;font-weight:500;letter-spacing:-0.025em;line-height:1.05;color:${PULSE.graphite};margin:0;">
            ${copy.titleA}<br/>
            <span style="display:inline-block;background:${PULSE.lime};padding:0 6px;">${copy.titleAccent}</span> ${copy.titleEnd}
          </h1>
          ${spacer(22)}
          ${renderP(copy.intro, { size: 16 })}
          ${spacer(24)}
          ${renderButton({ href: editorNoteUrl, label: copy.cta, size: 'lg' })}
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:0 40px;">
          ${renderEcgDivider({ color: PULSE.lime, height: 24 })}
        </td>
      </tr>
      ${featuredBlock}
      ${postRows ? `
      <tr>
        <td class="bz-pad" style="padding:36px 40px 8px;">
          ${renderEyebrow(copy.listEyebrow)}
          ${spacer(14)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${postRows}</table>
        </td>
      </tr>` : ''}
      <tr>
        <td class="bz-pad" style="padding:32px 40px 16px;">
          <div style="background:${PULSE.n50};border:1px solid ${PULSE.n200};border-radius:14px;padding:28px;">
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
    eyebrow: `${issueLabel} · ${monthLabel.split(' ')[0]}`,
    footer: {
      locale,
      unsubscribeUrl: params.unsubscribeUrl,
      unsubText: isTr ? 'Aylık bülteni almayı bırakmak için' : 'To stop the monthly digest',
    },
  });
  const text = `${copy.titleA} ${copy.titleAccent} ${copy.titleEnd}\n\n${copy.intro}\n\n` +
    (featured ? `★ ${featured.title} — ${featured.url}\n\n` : '') +
    restPosts.map((p, i) => `${i + 1}. ${p.title} — ${p.url}`).join('\n');
  return { subject, html, text };
}
