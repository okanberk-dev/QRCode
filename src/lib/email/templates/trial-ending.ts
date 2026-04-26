import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderH2, renderP, renderButton, renderBadge, spacer } from '../components';
import { loadMailCopy } from '../copy-loader';

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

  const baseAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com';
  const comparisonUrl = params.comparisonUrl ?? `${baseAppUrl}/${isTr ? 'tr' : 'en'}/pricing`;

  const inlineDefault = isTr ? {
    headerEyebrow: 'Faturalandırma · Hatırlatma',
    eyebrow: `Deneme · ${days} gün kaldı`,
    titleA: '14 gündür birlikteyiz.',
    titleB: 'Devam edelim mi?',
    usageEyebrow: 'Bu 14 günde Buaze\'de',
    statReviews: 'yorum aldın',
    statAvg: 'ortalama puan',
    statAi: 'AI yanıt',
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
    eyebrow: `Trial · ${days} day${days === 1 ? '' : 's'} left`,
    titleA: 'We\'ve been at it for 14 days.',
    titleB: 'Keep going?',
    usageEyebrow: 'In your 14 days on Buaze',
    statReviews: 'reviews handled',
    statAvg: 'average rating',
    statAi: 'AI replies',
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

  // DB-driven override (mail_templates table). Plan/promo copy is the
  // most-tweaked part of trial mail — admin can update CTAs, recommended
  // badge text, plan blurbs without a deploy.
  const copy = await loadMailCopy('trial-ending', locale, inlineDefault);

  // 4-col usage stat grid — JSX:22-34
  const stats = [
    { v: params.usage.reviews?.toString() ?? '—', k: copy.statReviews },
    { v: params.usage.avgRating !== null ? params.usage.avgRating.toFixed(1) : '—', k: copy.statAvg },
    { v: params.usage.aiReplies?.toString() ?? '—', k: copy.statAi },
    { v: params.usage.growthPct !== null ? `${params.usage.growthPct >= 0 ? '+' : ''}${params.usage.growthPct}%` : '—', k: copy.statGrowth },
  ];
  const statCells = stats.map((s, i) => `
    <td class="cell stack-col" valign="top" style="width:25%;padding:0 16px;${i === 0 ? 'padding-left:0;' : ''}${i < stats.length - 1 ? `border-right:1px solid ${PULSE.n800};` : 'padding-right:0;'}">
      <div style="font-family:${FONTS.heading};font-size:30px;font-weight:500;letter-spacing:-0.025em;color:${PULSE.pure};line-height:1;">${escapeHtml(s.v)}</div>
      <div style="margin-top:6px;font-size:11px;color:${PULSE.n400};font-family:${FONTS.mono};letter-spacing:0.05em;">${s.k}</div>
    </td>
  `).join('');

  // Plan cards (JSX:42-67). Pro card has absolute "ÖNERİLEN" badge — MSO needs
  // a VML rect to anchor; everywhere else uses absolute-positioned div.
  const starterCard = `
    <div style="border:1px solid ${PULSE.n200};border-radius:14px;padding:22px;background:${PULSE.pure};">
      <div style="font-family:${FONTS.heading};font-size:16px;font-weight:500;color:${PULSE.graphite};">${copy.starterTitle}</div>
      <div style="margin-top:12px;">
        <span style="font-family:${FONTS.heading};font-size:32px;font-weight:500;letter-spacing:-0.02em;color:${PULSE.graphite};">${prices.starter}</span>
        <span style="font-size:12px;color:${PULSE.n500};margin-left:6px;">${prices.starterPeriod ?? ''}</span>
      </div>
      ${spacer(14)}
      ${renderP(copy.starterBody, { size: 13 })}
    </div>
  `;
  const proCard = `
    <div style="position:relative;border:2px solid ${PULSE.graphite};border-radius:14px;padding:22px;background:${PULSE.limeSoft};">
      ${renderBadge({ text: copy.proBadge, variant: 'lime-on-dark', position: 'absolute-tr' })}
      <div style="font-family:${FONTS.heading};font-size:16px;font-weight:500;color:${PULSE.graphite};">${copy.proTitle}</div>
      <div style="margin-top:12px;">
        <span style="font-family:${FONTS.heading};font-size:32px;font-weight:500;letter-spacing:-0.02em;color:${PULSE.graphite};">${prices.pro}</span>
        <span style="font-size:12px;color:${PULSE.n600};margin-left:6px;">${prices.proPeriod ?? ''}</span>
      </div>
      ${spacer(14)}
      ${renderP(copy.proBody, { size: 13, color: PULSE.n700 })}
    </div>
  `;

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="padding:40px 40px 8px;">
          ${renderEyebrow(copy.eyebrow, PULSE.warning)}
          ${spacer(14)}
          <h1 class="bz-h1" style="font-family:${FONTS.heading};font-size:36px;font-weight:500;letter-spacing:-0.025em;line-height:1.1;color:${PULSE.graphite};margin:0;">
            ${copy.titleA}<br/>
            <span style="color:${PULSE.n500};">${copy.titleB}</span>
          </h1>
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:28px 40px 8px;">
          <div style="background:${PULSE.graphite};border-radius:14px;padding:28px;color:${PULSE.pure};">
            ${renderEyebrow(copy.usageEyebrow, PULSE.lime)}
            ${spacer(18)}
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="grid-4 stack-row">
              <tr>${statCells}</tr>
            </table>
          </div>
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:32px 40px 8px;">
          ${renderEyebrow(copy.plansEyebrow)}
          ${spacer(14)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row">
            <tr>
              <td class="stack-col" valign="top" style="width:50%;padding-right:6px;">${starterCard}</td>
              <td class="stack-col" valign="top" style="width:50%;padding-left:6px;padding-top:0;">${proCard}</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:28px 40px 44px;">
          ${renderButton({ href: params.upgradeUrl, label: copy.cta, size: 'lg' })}
          <span style="margin-left:14px;">
            <a href="${comparisonUrl}" style="font-size:14px;color:${PULSE.n600};text-decoration:none;border-bottom:1px solid ${PULSE.n300};">${copy.comparisonLink}</a>
          </span>
        </td>
      </tr>
    </table>
  `;

  const html = pulseLayout({
    subject,
    preheader,
    content,
    eyebrow: copy.headerEyebrow,
    footer: { locale, unsubText: isTr ? 'Faturalandırma maillerini ayarlamak için' : 'To adjust billing emails' },
  });
  const text = `${copy.titleA} ${copy.titleB}\n\n${stats.map((s) => `${s.v} ${s.k}`).join(' · ')}\n\n${copy.cta} ${params.upgradeUrl}\n${copy.comparisonLink}: ${comparisonUrl}`;
  return { subject, html, text };
}
