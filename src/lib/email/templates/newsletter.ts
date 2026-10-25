import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderP, renderButton, renderEcgDivider, spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

export interface NewsletterPost {
  title: string;
  excerpt?: string | null;
  url: string;
  category?: string | null;
  readMinutes?: number | null;
}

export interface NewsletterStat {
  /** Big metric, e.g. '%96' or '+184%' */
  value: string;
  /** Caption under the metric, e.g. 'sessiz kalır' */
  label: string;
}

export interface NewsletterParams {
  issueNumber?: number;
  /** Featured headline post (rendered in the dark hero card). When omitted the
   *  monthly cron uses posts[0] automatically. */
  featured?: NewsletterPost;
  posts: NewsletterPost[];
  unsubscribeUrl: string;
  exploreUrl?: string;
  /** Override the hero headline ("Sessiz misafiri duyabilmek sanatı."). When a
   *  NewsletterCampaign authors a custom title, that's the title used here. */
  customTitle?: string | null;
  /** Override the intro paragraph. Shown in place of the default copy. */
  customIntro?: string | null;
  /** Override the subject line. Falls back to the locale-specific default. */
  customSubject?: string | null;
  /** Stats band cells. When omitted (default), the band is hidden. JSX
   *  prototype shipped with `+184% / 1.4s / %96` placeholders that looked
   *  identical month over month — surfacing real metrics is gated behind
   *  caller intent now. */
  stats?: NewsletterStat[];
}

export async function renderNewsletter(
  params: NewsletterParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const issueLabel = params.issueNumber ? `Pulse #${String(params.issueNumber).padStart(2, '0')}` : 'Pulse';
  const subject = params.customSubject?.trim() || (isTr
    ? `${issueLabel} — Yorum yönetiminin geleceği`
    : `${issueLabel} — The future of review management`);
  // Default preheader is generic; specific issue copy comes from the
  // featured post excerpt (when one is selected) so it stays relevant.
  const featuredPostForPreheader = params.featured ?? params.posts[0];
  const preheader = featuredPostForPreheader?.excerpt
    ? featuredPostForPreheader.excerpt.slice(0, 110) + (featuredPostForPreheader.excerpt.length > 110 ? '…' : '')
    : isTr
      ? 'Bu ayın seçtiğimiz vakaları, sektör verileri ve ürün haberleri.'
      : 'This month\'s curated cases, sector data, and product news.';

  const monthLabel = new Date().toLocaleDateString(isTr ? 'tr-TR' : 'en-US', { month: 'long', year: 'numeric' });

  // Featured falls back to posts[0]; rest of the list shifts accordingly
  const featured: NewsletterPost | undefined = params.featured ?? params.posts[0];
  const restPosts = params.featured ? params.posts : params.posts.slice(1);

  const inlineDefault = isTr ? {
    eyebrowTop: `${monthLabel} · Aylık bülten`,
    titleA: 'Sessiz misafiri',
    titleAccent: 'duyabilmek',
    titleEnd: 'sanatı.',
    intro: 'Müşterilerin yalnızca %4\'ü kötü deneyim yaşadığında konuşur. Geriye kalan %96\'yı duymak için ne gerekiyor — bu sayıda anlatıyoruz.',
    cta: 'Editörün notunu oku →',
    featuredEyebrow: 'Kapak yazısı',
    listEyebrow: 'Bu sayıda',
    statsTitle: 'Bu ayın küçük rakamları',
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
    futureLabel: 'Next issue',
    futureBody: 'Hotel sector case, new heatmap visuals, OAuth integrations.',
    exploreCta: 'Browse all issues →',
    readMinutesUnit: 'min',
    fallbackCategory: 'Post',
    featuredReadTime: '12 min read',
    featuredOpen: 'Open article →',
  };

  // DB-driven copy override + placeholder substitution. `${firstName}` admin
  // tarafından subject/intro'da kullanılabilir; her abone için cron call'unda
  // gerçek değerle dolar. Bu render fn `firstName` param almıyor çünkü
  // newsletter aboneye özel kişiselleştirilmiyor — `firstName` placeholder'ı
  // future-proof; kullanılırsa empty substitute olur.
  const merged = await loadMailCopy('newsletter', locale, inlineDefault);
  const vars = { firstName: '' };
  const copy = deepSubstitute(merged, vars, 'html');
  const copyText = deepSubstitute(merged, vars, 'text');

  const exploreUrl = params.exploreUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com'}/${isTr ? 'tr' : 'en'}/blog`;
  const editorNoteUrl = featured?.url ?? exploreUrl;

  // Layout note: layout.ts forces `.bz-pad` to 28/22 on EVERY cell that carries
  // it on mobile, so the whole body lives in ONE padded cell and sections are
  // separated with spacers (a bz-pad cell per section stacked 56px gaps).

  // Featured dark card. JSX prototipinde sağda statik bir Pulse AI demo
  // code block vardı ("input.tone / model.draft / latency: 1.2s") — sadece
  // o sayının kapak yazısı için anlamlıydı. Gerçek mailde her ay farklı bir
  // post seçildiğinden çelişkili duruyordu, kaldırdık. Card artık tek sütun:
  // okuma süresi + başlık + excerpt + CTA.
  const featuredBlock = featured ? `
    ${spacer(32)}
    ${renderEyebrow(copy.featuredEyebrow)}
    ${spacer(14)}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:separate;border-spacing:0;">
      <tr>
        <td class="bz-pad-tight" style="background:${PULSE.graphite};border-radius:16px;padding:32px;color:${PULSE.pure};">
          <div style="font-family:${FONTS.label};font-size:11px;letter-spacing:0.12em;line-height:1.5;color:${PULSE.lime};text-transform:uppercase;font-weight:600;">${featured.readMinutes ? `${featured.readMinutes} ${copy.readMinutesUnit} ${isTr ? 'okuma' : 'read'}` : copy.featuredReadTime}</div>
          ${spacer(12)}
          <h2 style="font-family:${FONTS.heading};font-size:26px;font-weight:600;letter-spacing:-0.02em;line-height:1.25;color:${PULSE.pure};margin:0;">${escapeHtml(featured.title)}</h2>
          ${featured.excerpt ? `${spacer(14)}<div style="font-family:${FONTS.body};font-size:15px;color:${PULSE.n300};line-height:1.65;">${escapeHtml(featured.excerpt)}</div>` : ''}
          ${spacer(22)}
          ${renderButton({ href: escapeHtml(featured.url), label: copy.featuredOpen, variant: 'lime' })}
        </td>
      </tr>
    </table>` : '';

  // Articles list (jsx:90-112). Link lives on the title + arrow (an <a> around
  // a whole <table> breaks in Outlook); the row stays one tap target on mobile.
  const visiblePosts = restPosts.slice(0, 4);
  const postRows = visiblePosts.map((p, i) => {
    const num = String(i + 1).padStart(2, '0');
    const cat = p.category ? escapeHtml(p.category) : copy.fallbackCategory;
    const read = p.readMinutes ? `${p.readMinutes} ${copy.readMinutesUnit}` : '';
    const isLast = i === visiblePosts.length - 1;
    const href = escapeHtml(p.url);
    return `
      <tr>
        <td style="padding:18px 0;border-top:1px solid ${PULSE.n200};${isLast ? `border-bottom:1px solid ${PULSE.n200};` : ''}">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td valign="top" width="34" style="width:34px;padding-top:3px;font-family:${FONTS.label};font-size:13px;line-height:1.4;color:${PULSE.n400};font-weight:600;">${num}</td>
              <td valign="top">
                <a href="${href}" style="font-family:${FONTS.heading};font-size:17px;font-weight:600;color:${PULSE.graphite};letter-spacing:-0.01em;line-height:1.35;text-decoration:none;">${escapeHtml(p.title)}</a>
                ${p.excerpt ? `<div style="font-family:${FONTS.body};font-size:13px;color:${PULSE.n600};margin-top:6px;line-height:1.6;">${escapeHtml(p.excerpt)}</div>` : ''}
                <div style="margin-top:10px;font-family:${FONTS.label};font-size:11px;font-weight:600;color:${PULSE.n500};letter-spacing:0.08em;line-height:1.5;text-transform:uppercase;">${cat}${read ? ` · ${read}` : ''}</div>
              </td>
              <td valign="top" align="right" width="28" style="width:28px;padding-top:1px;font-family:${FONTS.body};font-size:18px;line-height:1.4;"><a href="${href}" style="color:${PULSE.n400};text-decoration:none;">→</a></td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }).join('');

  // Stats band — opsiyonel. Caller `params.stats` geçerse render edilir,
  // yoksa block tamamen gizlenir. JSX prototip değerleri (+184% / 1.4s)
  // gerçek metrik üretmediği için her ay aynı görünmesindense yokluğu
  // tercih edildi. Each cell opens with a short lime bar so stacked cells on
  // phones still read as separate stats.
  const statsList = params.stats ?? [];
  const statsBlock = statsList.length > 0 ? `
    ${spacer(32)}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:separate;border-spacing:0;">
      <tr>
        <td class="bz-pad-tight" style="background:${PULSE.n50};border:1px solid ${PULSE.n200};border-radius:16px;padding:28px;">
          ${renderEyebrow(copy.statsTitle)}
          ${spacer(16)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row">
            <tr>${statsList.map((s, i) => `
              <td class="stack-col" valign="top" style="width:${(100 / statsList.length).toFixed(2)}%;padding:0 14px;${i === 0 ? 'padding-left:0;' : ''}${i < statsList.length - 1 ? `border-right:1px solid ${PULSE.n200};` : 'padding-right:0;'}">
                <div style="width:24px;height:3px;background:${PULSE.lime};border-radius:2px;font-size:1px;line-height:3px;">&nbsp;</div>
                <div style="margin-top:12px;font-family:${FONTS.heading};font-size:26px;font-weight:600;letter-spacing:-0.02em;color:${PULSE.graphite};line-height:1.1;">${escapeHtml(s.value)}</div>
                <div style="margin-top:6px;font-family:${FONTS.body};font-size:12px;line-height:1.5;color:${PULSE.n500};">${escapeHtml(s.label)}</div>
              </td>
            `).join('')}</tr>
          </table>
        </td>
      </tr>
    </table>` : '';

  // Custom title/intro override the default Pulse copy. When admin authors a
  // campaign with its own headline, the lime-highlight styling falls away and
  // we render plain text — the operator's words are already the hook.
  const customTitleTrimmed = params.customTitle?.trim();
  const customIntroTrimmed = params.customIntro?.trim();
  const titleHtml = customTitleTrimmed
    ? escapeHtml(customTitleTrimmed)
    : `${copy.titleA}<br/><span style="display:inline-block;margin-top:8px;background:${PULSE.lime};padding:0 8px;border-radius:8px;">${copy.titleAccent}</span> ${copy.titleEnd}`;
  const introText = customIntroTrimmed ?? copy.intro;
  // The campaign intro is admin-typed plain text (textarea); the default copy is
  // trusted, already-substituted HTML. Only the custom text needs escaping.
  const introHtml = customIntroTrimmed !== undefined ? escapeHtml(customIntroTrimmed) : copy.intro;

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="padding:40px;">
          ${renderEyebrow(copy.eyebrowTop)}
          ${spacer(16)}
          <h1 class="bz-h1-lg" style="font-family:${FONTS.heading};font-size:44px;font-weight:600;letter-spacing:-0.02em;line-height:1.15;color:${PULSE.graphite};margin:0;">
            ${titleHtml}
          </h1>
          ${spacer(20)}
          ${renderP(introHtml, { size: 16 })}
          ${spacer(24)}
          ${renderButton({ href: escapeHtml(editorNoteUrl), label: copy.cta, size: 'lg' })}
          ${spacer(36)}
          ${renderEcgDivider({ color: PULSE.lime, height: 24 })}
          ${featuredBlock}
          ${restPosts.length > 0 ? `
          ${spacer(36)}
          ${renderEyebrow(copy.listEyebrow)}
          ${spacer(10)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${postRows}</table>` : ''}
          ${statsBlock}
          ${spacer(36)}
          ${renderEyebrow(copy.futureLabel)}
          ${spacer(8)}
          ${renderP(copy.futureBody, { size: 13, color: PULSE.n600 })}
          ${spacer(18)}
          <a href="${escapeHtml(exploreUrl)}" class="bz-btn" style="display:inline-block;color:${PULSE.graphite};border:1px solid ${PULSE.graphite};padding:12px 22px;border-radius:10px;font-family:${FONTS.body};font-weight:600;font-size:14px;line-height:1.2;text-decoration:none;mso-padding-alt:0;">${copy.exploreCta}</a>
        </td>
      </tr>
    </table>
  `;

  // Subject (admin-authored campaign subject) and preheader (a post excerpt)
  // land in <title> / the hidden preheader div — escape both for those sinks.
  const html = pulseLayout({
    subject: escapeHtml(subject),
    preheader: escapeHtml(preheader),
    content,
    eyebrow: `${issueLabel} · ${monthLabel.split(' ')[0]}`,
    footer: {
      locale,
      unsubscribeUrl: params.unsubscribeUrl,
      unsubText: isTr ? 'Aylık bülteni almayı bırakmak için' : 'To stop the monthly digest',
    },
  });
  const textTitle = customTitleTrimmed ?? `${copyText.titleA} ${copyText.titleAccent} ${copyText.titleEnd}`;
  const text = `${textTitle}\n\n${introText}\n\n` +
    (featured ? `★ ${featured.title} — ${featured.url}\n\n` : '') +
    restPosts.map((p, i) => `${i + 1}. ${p.title} — ${p.url}`).join('\n');
  return { subject, html, text };
}
