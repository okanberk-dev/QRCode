import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderH1, renderP, renderButton, renderStatGrid, spacer } from '../components';

export interface TrialEndingParams {
  firstName?: string | null;
  daysLeft: number;
  usage: { reviews: number; avgRating: number | null; growthPct: number | null };
  upgradeUrl: string;
}

export function renderTrialEnding(params: TrialEndingParams, locale: 'tr' | 'en' = 'tr'): { subject: string; html: string; text: string } {
  const isTr = locale !== 'en';
  const name = params.firstName ? escapeHtml(params.firstName) : (isTr ? 'merhaba' : 'hi');
  const days = Math.max(0, params.daysLeft);

  const subject = isTr
    ? `Deneme süren ${days} gün içinde bitiyor`
    : `Your trial ends in ${days} day${days === 1 ? '' : 's'}`;
  const preheader = isTr
    ? `${days} gün sonra Buaze Pro\'ya geçiş yapmazsan veriler arşive alınır.`
    : `In ${days} days, Buaze archives your data unless you upgrade.`;

  const copy = isTr ? {
    eyebrow: `Deneme · ${days} gün kaldı`,
    title: `${name}, son ${days} gün.`,
    intro: 'Deneme süren bittiğinde QR\'lar pasifleşir, yorum akışı durur. Aşağıdaki kullanım rakamları seninle başardığın işin özeti — devam etmek için tek tıkla yükselt.',
    usageEyebrow: 'Bu süreçte yaptıkların',
    statReviews: 'Yorum',
    statAvg: 'Ortalama',
    statGrowth: 'Büyüme',
    plansLabel: 'Plan seç',
    starterTitle: 'Starter',
    starterPrice: '₺349/ay',
    starterBullets: ['1 lokasyon', 'Sınırsız QR', 'Aylık rapor'],
    proTitle: 'Pro · Önerilen',
    proPrice: '₺899/ay',
    proBullets: ['5 lokasyona kadar', 'AI Co-Pilot', 'Heatmap & sentiment', 'Öncelikli destek'],
    cta: 'Pro\'ya yükselt →',
    secondaryCta: 'Starter\'ı seç',
  } : {
    eyebrow: `Trial · ${days} day${days === 1 ? '' : 's'} left`,
    title: `${name}, last ${days} day${days === 1 ? '' : 's'}.`,
    intro: 'When your trial ends, QR codes go inactive and the review feed pauses. Here\'s a recap of what you built — keep it running by upgrading.',
    usageEyebrow: 'What you built',
    statReviews: 'Reviews',
    statAvg: 'Average',
    statGrowth: 'Growth',
    plansLabel: 'Pick a plan',
    starterTitle: 'Starter',
    starterPrice: '$19/mo',
    starterBullets: ['1 location', 'Unlimited QRs', 'Monthly report'],
    proTitle: 'Pro · Recommended',
    proPrice: '$49/mo',
    proBullets: ['Up to 5 locations', 'AI Co-Pilot', 'Heatmap & sentiment', 'Priority support'],
    cta: 'Upgrade to Pro →',
    secondaryCta: 'Pick Starter',
  };

  const stats = [
    { label: copy.statReviews, value: String(params.usage.reviews) },
    { label: copy.statAvg, value: params.usage.avgRating !== null ? params.usage.avgRating.toFixed(1) : '—' },
    { label: copy.statGrowth, value: params.usage.growthPct !== null ? `${params.usage.growthPct >= 0 ? '+' : ''}${params.usage.growthPct}%` : '—' },
  ];

  const renderPlan = (title: string, price: string, bullets: string[], opts: { lime?: boolean }) => `
    <td class="stack-col" valign="top" style="width:50%;padding:0 8px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${opts.lime ? PULSE.lime : PULSE.pure};border:1px solid ${opts.lime ? PULSE.lime : PULSE.n200};border-radius:14px;height:100%;">
        <tr><td style="padding:22px 22px;">
          <div style="font-family:${FONTS.heading};font-size:18px;font-weight:600;color:${PULSE.graphite};">${title}</div>
          <div style="font-family:${FONTS.heading};font-size:28px;font-weight:500;letter-spacing:-0.025em;color:${PULSE.graphite};margin-top:6px;">${price}</div>
          <div style="margin-top:14px;">
            ${bullets.map((b) => `<div style="font-family:${FONTS.body};font-size:13px;color:${opts.lime ? PULSE.n800 : PULSE.n700};padding:4px 0;line-height:1.5;"><span style="color:${opts.lime ? PULSE.graphite : PULSE.lime};margin-right:6px;">●</span>${escapeHtml(b)}</div>`).join('')}
          </div>
        </td></tr>
      </table>
    </td>
  `;

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="padding:36px 40px 28px;">
          ${renderEyebrow(copy.eyebrow, PULSE.warning)}
          ${spacer(12)}
          ${renderH1(copy.title, { size: 36 })}
          ${spacer(14)}
          ${renderP(copy.intro)}
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:0 40px 24px;">
          <div style="background:${PULSE.graphite};border-radius:14px;padding:24px;color:${PULSE.pure};">
            ${renderEyebrow(copy.usageEyebrow, PULSE.lime)}
            ${spacer(14)}
            ${renderStatGrid(stats, { dark: true })}
          </div>
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:0 40px 24px;">
          ${renderEyebrow(copy.plansLabel)}
          ${spacer(12)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row">
            <tr>
              ${renderPlan(copy.starterTitle, copy.starterPrice, copy.starterBullets, {})}
              ${renderPlan(copy.proTitle, copy.proPrice, copy.proBullets, { lime: true })}
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:0 40px 40px;">
          ${renderButton({ href: params.upgradeUrl, label: copy.cta, size: 'lg' })}
        </td>
      </tr>
    </table>
  `;

  const html = pulseLayout({ subject, preheader, content, eyebrow: isTr ? 'Deneme' : 'Trial', footer: { locale } });
  const text = `${copy.title}\n\n${copy.intro}\n\n${copy.statReviews}: ${stats[0].value} · ${copy.statAvg}: ${stats[1].value} · ${copy.statGrowth}: ${stats[2].value}\n\n${copy.cta} ${params.upgradeUrl}`;
  return { subject, html, text };
}
