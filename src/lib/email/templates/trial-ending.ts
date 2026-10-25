import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderP, renderButton, renderBadge, spacer } from '../components';
import { LC_TABLE, lcPage, lcSection, lcHero, lcTextLink } from './lifecycle-ui';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

export interface TrialEndingParams {
  firstName?: string | null;
  daysLeft: number;
  /** Trial usage proof. The 4-col stat grid mirrors the JSX prototype:
   *  yorum / ortalama / AI yanıt / +X% organik artış. Any null is rendered as
   *  an em-dash so the layout stays even when a metric isn't tracked yet. */
  usage: {
    reviews: number | null;
    avgRating: number | null;
    aiReplies: number | null;
    growthPct: number | null;
  };
  upgradeUrl: string;
  comparisonUrl?: string;
  /** Pricing per locale. Defaults to JSX prototype values (TRY) when omitted. */
  prices?: {
    starter: string;
    pro: string;
    starterPeriod?: string;
    proPeriod?: string;
  };
}

export async function renderTrialEnding(
  params: TrialEndingParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const days = Math.max(0, params.daysLeft);

  const subject = isTr
    ? `Deneme süren ${days} gün sonra bitiyor`
    : `Your trial ends in ${days} day${days === 1 ? '' : 's'}`;
  const preheader = isTr
    ? `${params.usage.reviews ?? 0} yorum yönettin · ${params.usage.avgRating?.toFixed(1) ?? '—'} ortalama. Devam etmek için planı seç.`
    : `You handled ${params.usage.reviews ?? 0} reviews · ${params.usage.avgRating?.toFixed(1) ?? '—'} avg. Pick a plan to continue.`;

  // Pricing fallback. JSX prototip değerleri burada — caller param.prices
  // geçmezse plan kartlarında ₺499 / ₺1.299 görünür. Gerçek pricing
  // değişikliklerini billing UI veya MailTemplate DB content'e (Faz 2)
  // taşımak en doğrusu; şimdilik default fallback olarak kalıyor.
  const prices = params.prices ?? (isTr
    ? { starter: '₺499', pro: '₺1.299', starterPeriod: '/ ay · 1 şube', proPeriod: '/ ay · 5 şube' }
    : { starter: '$19', pro: '$49', starterPeriod: '/ mo · 1 location', proPeriod: '/ mo · 5 locations' });

  const baseAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com';
  const comparisonUrl = params.comparisonUrl ?? `${baseAppUrl}/${isTr ? 'tr' : 'en'}/pricing`;

  const inlineDefault = isTr ? {
    headerEyebrow: 'Faturalandırma · Hatırlatma',
    eyebrow: 'Deneme · ${daysLeft} gün kaldı',
    titleA: '14 gündür birlikteyiz.',
    titleB: 'Devam edelim mi?',
    usageEyebrow: 'Bu 14 günde Buaze\'de',
    statReviews: 'yorum aldın',
    statAvg: 'ortalama puan',
    statAi: 'Pulse AI yanıtı',
    statGrowth: 'organik artış',
    plansEyebrow: 'Plan seç · İlk ay %50',
    starterTitle: 'Pulse Starter',
    starterBody: 'Tek şube, sınırsız QR, 100 AI yanıt/ay.',
    proTitle: 'Pulse Pro',
    proBody: 'Çoklu şube, sınırsız AI, OAuth + webhook, öncelikli destek.',
    proBadge: 'ÖNERİLEN',
    cta: 'Planımı seç →',
    comparisonLink: 'Detaylı karşılaştırma',
  } : {
    headerEyebrow: 'Billing · Reminder',
    eyebrow: 'Trial · ${daysLeft} days left',
    titleA: 'We\'ve been at it for 14 days.',
    titleB: 'Keep going?',
    usageEyebrow: 'In your 14 days on Buaze',
    statReviews: 'reviews handled',
    statAvg: 'average rating',
    statAi: 'Pulse AI replies',
    statGrowth: 'organic growth',
    plansEyebrow: 'Pick a plan · 50% off month one',
    starterTitle: 'Pulse Starter',
    starterBody: 'Single location, unlimited QRs, 100 AI replies/mo.',
    proTitle: 'Pulse Pro',
    proBody: 'Multi-location, unlimited AI, OAuth + webhooks, priority support.',
    proBadge: 'RECOMMENDED',
    cta: 'Pick my plan →',
    comparisonLink: 'Detailed comparison',
  };

  // DB-driven override + placeholder substitution. `${firstName}`,
  // `${restaurantName}`, `${daysLeft}` admin tarafından kullanılabilir.
  const merged = await loadMailCopy('trial-ending', locale, inlineDefault);
  const vars = {
    firstName: params.firstName || (isTr ? 'orada' : 'there'),
    daysLeft: days,
    // restaurantName param'da yok; future-proof olarak whitelist'te tutuluyor
    // ama vars'a boş gelir — kullanılırsa empty string substitute olur.
    restaurantName: '',
  };
  const copy = deepSubstitute(merged, vars, 'html');
  const copyText = deepSubstitute(merged, vars, 'text');

  // Usage proof — 2x2 grid at every width. The old 4-up row left ~95px per
  // cell on desktop (a 7-digit count clipped) and relied on inline-block
  // cells + a media query to reflow on phones; 2x2 needs neither.
  const stats = [
    { v: params.usage.reviews?.toString() ?? '—', k: copy.statReviews },
    { v: params.usage.avgRating !== null ? params.usage.avgRating.toFixed(1) : '—', k: copy.statAvg },
    { v: params.usage.aiReplies?.toString() ?? '—', k: copy.statAi },
    { v: params.usage.growthPct !== null ? `${params.usage.growthPct >= 0 ? '+' : ''}${params.usage.growthPct}%` : '—', k: copy.statGrowth },
  ];
  const statCell = (s: { v: string; k: string }, i: number) => {
    const left = i % 2 === 0;
    const topRow = i < 2;
    const border = `${left ? `border-right:1px solid ${PULSE.n800};` : ''}${topRow ? `border-bottom:1px solid ${PULSE.n800};` : ''}`;
    const pad = `${topRow ? '0' : '18px'} ${left ? '16px' : '0'} ${topRow ? '18px' : '0'} ${left ? '0' : '18px'}`;
    return `
      <td valign="top" width="50%" style="width:50%;padding:${pad};${border}">
        <div class="bz-price-mobile" style="font-family:${FONTS.heading};font-size:32px;font-weight:600;letter-spacing:-0.02em;color:${PULSE.pure};line-height:1.05;">${escapeHtml(s.v)}</div>
        <div style="margin-top:6px;font-family:${FONTS.body};font-size:12px;line-height:1.4;color:${PULSE.n400};">${s.k}</div>
      </td>`;
  };
  const statGrid = `
    <table ${LC_TABLE} width="100%" style="width:100%;">
      <tr>${statCell(stats[0], 0)}${statCell(stats[1], 1)}</tr>
      <tr>${statCell(stats[2], 2)}${statCell(stats[3], 3)}</tr>
    </table>`;

  // Plan cards. The "recommended" badge sits in the title row (not
  // position:absolute — Gmail/Outlook drop it), so both cards keep the same
  // structure and line up when side by side.
  const planCard = (c: { title: string; price: string; period?: string; body: string; badge?: string; featured?: boolean }) => `
    <table ${LC_TABLE} width="100%" height="100%" style="width:100%;height:100%;border-collapse:separate;">
      <tr>
        <td valign="top" style="background:${c.featured ? PULSE.limeSoft : PULSE.pure};border:${c.featured ? `2px solid ${PULSE.graphite}` : `1px solid ${PULSE.n200}`};border-radius:14px;padding:${c.featured ? '21px' : '22px'};">
          <table ${LC_TABLE} width="100%">
            <tr>
              <td valign="middle" height="26" style="height:26px;font-family:${FONTS.heading};font-size:16px;font-weight:600;line-height:1.3;color:${PULSE.graphite};">${c.title}</td>
              ${c.badge ? `<td valign="middle" align="right" style="padding-left:8px;white-space:nowrap;">${renderBadge({ text: c.badge, variant: 'lime-on-dark' })}</td>` : ''}
            </tr>
          </table>
          ${spacer(12)}
          <div class="bz-price-mobile" style="font-family:${FONTS.heading};font-size:28px;font-weight:600;letter-spacing:-0.02em;line-height:1.1;color:${PULSE.graphite};">${escapeHtml(c.price)}</div>
          ${c.period ? `<div style="margin-top:4px;font-family:${FONTS.body};font-size:12px;line-height:1.4;color:${c.featured ? PULSE.n600 : PULSE.n500};">${escapeHtml(c.period)}</div>` : ''}
          ${spacer(14)}
          ${renderP(c.body, { size: 13, color: c.featured ? PULSE.n700 : PULSE.n600 })}
        </td>
      </tr>
    </table>`;
  const starterCard = planCard({ title: copy.starterTitle, price: prices.starter, period: prices.starterPeriod, body: copy.starterBody });
  const proCard = planCard({ title: copy.proTitle, price: prices.pro, period: prices.proPeriod, body: copy.proBody, badge: copy.proBadge, featured: true });

  const content = lcPage([
    lcHero({
      eyebrow: copy.eyebrow,
      eyebrowTone: 'warn',
      title: `${copy.titleA}<br/><span style="color:${PULSE.n500};">${copy.titleB}</span>`,
      titleSize: 36,
    }),
    lcSection(
      `<div class="bz-roi-card" style="background:${PULSE.graphite};border-radius:16px;padding:26px 28px;">
        ${renderEyebrow(copy.usageEyebrow, PULSE.lime)}
        ${spacer(18)}
        ${statGrid}
      </div>`,
      { padding: '24px 40px 8px' },
    ),
    lcSection(
      `${renderEyebrow(copy.plansEyebrow)}
       ${spacer(14)}
       <table ${LC_TABLE} width="100%" class="stack-row">
         <tr>
           <td class="stack-col" valign="top" style="width:50%;padding:0 6px 0 0;">${starterCard}</td>
           <td class="stack-col" valign="top" style="width:50%;padding:0 0 0 6px;">${proCard}</td>
         </tr>
       </table>`,
      { padding: '32px 40px 8px' },
    ),
    lcSection(
      `${renderButton({ href: escapeHtml(params.upgradeUrl), label: copy.cta, size: 'lg' })}${spacer(6)}${lcTextLink(comparisonUrl, copy.comparisonLink)}`,
      { padding: '28px 40px 44px' },
    ),
  ]);

  const html = pulseLayout({
    subject,
    preheader,
    content,
    eyebrow: copy.headerEyebrow,
    footer: { locale, unsubText: isTr ? 'Faturalandırma maillerini ayarlamak için' : 'To adjust billing emails' },
  });
  const text = `${copyText.titleA} ${copyText.titleB}\n\n${stats.map((s) => `${s.v} ${s.k}`).join(' · ')}\n\n${copyText.cta} ${params.upgradeUrl}\n${copyText.comparisonLink}: ${comparisonUrl}`;
  return { subject, html, text };
}
