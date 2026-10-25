import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderP, renderButton, renderBadge, spacer } from '../components';
import { LC_TABLE, lcPage, lcSection, lcHero, lcTextLink, lcSubLine } from './lifecycle-ui';
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
    const pad = `${topRow ? '0' : '18px'} ${left ? '14px' : '0'} ${topRow ? '18px' : '0'} ${left ? '0' : '14px'}`;
    return `
      <td valign="top" width="50%" style="width:50%;padding:${pad};${border}">
        <div class="bz-price-mobile" style="font-family:${FONTS.heading};font-size:30px;font-weight:600;letter-spacing:-0.02em;color:${PULSE.pure};line-height:1.05;">${escapeHtml(s.v)}</div>
        <div style="margin-top:6px;font-family:${FONTS.body};font-size:12px;line-height:1.4;color:${PULSE.n400};">${s.k}</div>
      </td>`;
  };
  const statGrid = `
    <table ${LC_TABLE} width="100%" style="width:100%;">
      <tr>${statCell(stats[0], 0)}${statCell(stats[1], 1)}</tr>
      <tr>${statCell(stats[2], 2)}${statCell(stats[3], 3)}</tr>
    </table>`;

  // Plan cards — full-width "pricing rows", one per plan, stacked. Side-by-side
  // cards were never reliably equal-height (only sibling cells stretch, nested
  // height:100% tables don't) and overflowed phones as soon as the <style> block
  // was stripped (two 28px prices + a badge have a ~290px min-content). A single
  // card is one cell, so it is robust either way.
  // Inside: [badge + title | price + period] on one line, body underneath. The
  // inner cells carry stack-col so phones read title → price → body. The
  // "recommended" badge sits above the title (not position:absolute — Gmail /
  // Outlook drop it, and beside the title it would squeeze the price).
  const planCard = (c: { title: string; price: string; period?: string; body: string; badge?: string; featured?: boolean }) => `
    <table ${LC_TABLE} width="100%" style="width:100%;border-collapse:separate;">
      <tr>
        <td style="background:${c.featured ? PULSE.limeSoft : PULSE.pure};border:${c.featured ? `2px solid ${PULSE.graphite}` : `1px solid ${PULSE.n200}`};border-radius:14px;padding:${c.featured ? '18px 15px' : '19px 16px'};">
          <table ${LC_TABLE} width="100%" class="stack-row" style="width:100%;">
            <tr>
              <td class="stack-col" valign="middle" style="padding:0 8px 0 0;">
                ${c.badge ? `<div style="margin-bottom:8px;">${renderBadge({ text: c.badge, variant: 'lime-on-dark' })}</div>` : ''}
                <div style="font-family:${FONTS.heading};font-size:17px;font-weight:600;line-height:1.3;color:${PULSE.graphite};">${c.title}</div>
              </td>
              <td class="stack-col" valign="middle" align="right" style="padding:0;text-align:right;">
                <div class="bz-price-mobile" style="font-family:${FONTS.heading};font-size:26px;font-weight:600;letter-spacing:-0.02em;line-height:1.1;color:${PULSE.graphite};">${escapeHtml(c.price)}</div>
                ${c.period ? `<div style="margin-top:3px;font-family:${FONTS.body};font-size:12px;line-height:1.4;color:${c.featured ? PULSE.n600 : PULSE.n500};">${escapeHtml(c.period)}</div>` : ''}
              </td>
            </tr>
            <tr>
              <td class="stack-col" colspan="2" valign="top" style="padding:12px 0 0;">${renderP(c.body, { size: 13, color: c.featured ? PULSE.n700 : PULSE.n600 })}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
  const starterCard = planCard({ title: copy.starterTitle, price: prices.starter, period: prices.starterPeriod, body: copy.starterBody });
  const proCard = planCard({ title: copy.proTitle, price: prices.pro, period: prices.proPeriod, body: copy.proBody, badge: copy.proBadge, featured: true });

  const content = lcPage([
    lcHero({
      eyebrow: copy.eyebrow,
      eyebrowTone: 'warn',
      title: `${copy.titleA}${lcSubLine(copy.titleB, 36, `color:${PULSE.n500};`)}`,
      titleSize: 36,
    }),
    lcSection(
      `<div class="bz-roi-card" style="background:${PULSE.graphite};border-radius:16px;padding:26px 22px;">
        ${renderEyebrow(copy.usageEyebrow, PULSE.lime)}
        ${spacer(18)}
        ${statGrid}
      </div>`,
      { padding: '24px 40px 8px' },
    ),
    lcSection(
      `${renderEyebrow(copy.plansEyebrow)}
       ${spacer(14)}
       ${starterCard}
       ${spacer(12)}
       ${proCard}`,
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
    // Inline wrap guard: "FATURALANDIRMA" is a ~150px unbreakable word that
    // would otherwise stretch the shell on clients that strip <style> (320px).
    eyebrow: `<span style="overflow-wrap:anywhere;word-break:break-word;">${copy.headerEyebrow}</span>`,
    footer: { locale, unsubText: isTr ? 'Faturalandırma maillerini ayarlamak için' : 'To adjust billing emails' },
  });
  const text = `${copyText.titleA} ${copyText.titleB}\n\n${stats.map((s) => `${s.v} ${s.k}`).join(' · ')}\n\n${copyText.cta} ${params.upgradeUrl}\n${copyText.comparisonLink}: ${comparisonUrl}`;
  return { subject, html, text };
}
