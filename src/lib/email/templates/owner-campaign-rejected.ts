// Stage 29 §38.105 — Owner notification: campaign rejected.
//
// Admin /admin/campaigns/[id]/reject POST tetikler. reviewerNote zorunlu
// (min 20 char endpoint guard) — owner gerekçeyi mail'de görür ve revize
// edip yeni campaign yaratabilir. Pulse template paterni — DB-driven copy
// + placeholder substitution (CLAUDE.md §21.29 + §21.30).

import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

export interface OwnerCampaignRejectedParams {
  ownerName?: string | null;
  restaurantName: string;
  /** Original campaign subject (owner-authored, escaped). */
  subject: string;
  /** Admin reviewer note — gerekçe (min 20 char endpoint zorunlu). */
  reviewerNote: string;
  /** Owner panel campaign detail URL — locale prefix included. */
  dashboardUrl: string;
}

export async function renderOwnerCampaignRejected(
  params: OwnerCampaignRejectedParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const subject = isTr
    ? `Kampanyanız onaylanmadı — ${params.subject}`
    : `Your campaign was not approved — ${params.subject}`;
  const preheader = isTr
    ? `Buaze ekibi geri bildirim bıraktı; revize edip tekrar gönderebilirsin.`
    : `Buaze team left feedback; you can revise and resubmit.`;

  const inlineDefault = isTr
    ? {
        eyebrow: 'KAMPANYA İNCELEMESİ',
        title: 'Kampanyanız onaylanmadı.',
        intro: 'Merhaba ${ownerName}, ${restaurantName} kampanyanız Buaze ekibi tarafından gözden geçirildi ve şu an onaylanmadı. Aşağıdaki notu inceleyip kampanyayı revize edebilir, yeni bir taslak oluşturup yeniden onaya gönderebilirsin.',
        noteLabel: 'Gerekçe',
        nextStepsTitle: 'Sonraki adımlar',
        nextStepsBody: 'Notu dikkate alıp yeni bir kampanya oluştur, ardından panel üzerinden tekrar onaya gönder. Onay sonrası kampanya otomatik olarak müşterilerine iletilir.',
        ctaLabel: 'Panele dön',
        footerHint: 'Sorularını her zaman support@buaze.com üzerinden iletebilirsin.',
      }
    : {
        eyebrow: 'CAMPAIGN REVIEW',
        title: 'Your campaign was not approved.',
        intro: 'Hi ${ownerName}, your ${restaurantName} campaign was reviewed by the Buaze team and is not currently approved. Read the note below, revise the campaign, create a new draft, and resubmit for approval.',
        noteLabel: 'Reason',
        nextStepsTitle: 'Next steps',
        nextStepsBody: 'Take the note into account, create a new campaign, then resubmit for approval from your panel. Once approved, the campaign is automatically delivered to your customers.',
        ctaLabel: 'Back to panel',
        footerHint: 'You can always reach out via support@buaze.com.',
      };

  const merged = await loadMailCopy('owner-campaign-rejected', locale, inlineDefault);
  const vars = {
    ownerName: params.ownerName?.trim() || (isTr ? 'restoran sahibi' : 'restaurant owner'),
    restaurantName: params.restaurantName,
    subject: params.subject,
    reviewerNote: params.reviewerNote,
    dashboardUrl: params.dashboardUrl,
  };
  const copy = deepSubstitute(merged, vars, 'html');
  const copyText = deepSubstitute(merged, vars, 'text');

  const safeSubject = escapeHtml(params.subject);
  const safeReviewerNote = escapeHtml(params.reviewerNote).replace(/\r?\n/g, '<br />');

  const content = `
    <!-- Header: warn accent + eyebrow -->
    <tr>
      <td class="bz-pad" style="padding:32px 40px 8px;">
        <div style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#92400E;">${copy.eyebrow}</div>
        <h1 style="font-family:${FONTS.heading};font-size:26px;font-weight:500;color:${PULSE.graphite};letter-spacing:-0.02em;margin:8px 0 0;line-height:1.15;">${copy.title}</h1>
      </td>
    </tr>

    <!-- Intro paragraph -->
    <tr>
      <td class="bz-pad" style="padding:14px 40px 22px;">
        <p style="font-family:${FONTS.body};font-size:14px;line-height:1.65;color:${PULSE.graphite};margin:0;">${copy.intro}</p>
      </td>
    </tr>

    <!-- Subject preview -->
    <tr>
      <td class="bz-pad" style="padding:0 40px 14px;">
        <div style="border:1px solid ${PULSE.n200};border-radius:14px;padding:16px 18px;background:${PULSE.n50};">
          <div style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${PULSE.n500};margin-bottom:6px;">${isTr ? 'KAMPANYA KONUSU' : 'CAMPAIGN SUBJECT'}</div>
          <div style="font-family:${FONTS.heading};font-size:15px;font-weight:500;color:${PULSE.graphite};letter-spacing:-0.01em;">${safeSubject}</div>
        </div>
      </td>
    </tr>

    <!-- Reviewer note (warn-bordered) -->
    <tr>
      <td class="bz-pad" style="padding:0 40px 24px;">
        <div style="border-left:3px solid #FDE68A;background:#FFFBEB;padding:14px 18px;border-radius:0 10px 10px 0;">
          <div style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#92400E;margin-bottom:6px;">${copy.noteLabel}</div>
          <div style="font-family:${FONTS.body};font-size:14px;line-height:1.65;color:${PULSE.graphite};">${safeReviewerNote}</div>
        </div>
      </td>
    </tr>
    ${spacer(8)}

    <!-- Next steps -->
    <tr>
      <td class="bz-pad" style="padding:0 40px 22px;">
        <h2 style="font-family:${FONTS.heading};font-size:16px;font-weight:500;color:${PULSE.graphite};letter-spacing:-0.01em;margin:0 0 8px;">${copy.nextStepsTitle}</h2>
        <p style="font-family:${FONTS.body};font-size:13px;line-height:1.6;color:${PULSE.n500};margin:0;">${copy.nextStepsBody}</p>
      </td>
    </tr>

    <!-- CTA + footer hint -->
    <tr>
      <td class="bz-pad" style="padding:0 40px 32px;" align="left">
        <a href="${escapeHtml(params.dashboardUrl)}" style="display:inline-block;background:${PULSE.graphite};color:#FFFFFF;font-family:${FONTS.body};font-size:14px;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:999px;letter-spacing:-0.01em;">
          ${copy.ctaLabel}
        </a>
        <p style="font-family:${FONTS.body};font-size:12px;line-height:1.55;color:${PULSE.n500};margin:18px 0 0;">${copy.footerHint}</p>
      </td>
    </tr>
  `;

  const html = pulseLayout({ subject, preheader, content });

  const text = `${copyText.eyebrow}
${copyText.title}

${copyText.intro}

${isTr ? 'KAMPANYA KONUSU' : 'CAMPAIGN SUBJECT'}: ${params.subject}

${copyText.noteLabel}:
${params.reviewerNote}

${copyText.nextStepsTitle}
${copyText.nextStepsBody}

${copyText.ctaLabel}: ${params.dashboardUrl}

${copyText.footerHint}`.trim();

  return { subject, html, text };
}
