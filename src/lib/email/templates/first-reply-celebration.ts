// Wave C3 (CLAUDE.md §38.194) — owner ilk Google review yanıtını gönderdiğinde
// fire-once celebration. /api/restaurants/[id]/google/business/reviews/reply
// POST sonrasında sync trigger; LifecycleEmailLog cooldown lifetime per
// restaurant (idempotent — yalnız ilk yanıtta gönderir).

import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderButton, spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

export interface FirstReplyCelebrationParams {
  ownerName?: string | null;
  restaurantName: string;
  /** Reviews dashboard deeplink (Google reviews page). */
  reviewsUrl: string;
}

export async function renderFirstReplyCelebration(
  params: FirstReplyCelebrationParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const ownerName = params.ownerName ? escapeHtml(params.ownerName) : '';
  const restaurantName = escapeHtml(params.restaurantName);

  const subject = isTr ? 'İlk Google yanıtın gitti' : 'Your first Google reply is live';
  const preheader = isTr
    ? 'Müşteriyle ilk kez kalıcı bir kayıtta konuştun. Bu basit refleks itibarı katlar.'
    : 'You just spoke to a customer in a permanent record for the first time. This habit multiplies reputation.';

  const inlineDefault = isTr ? {
    eyebrow: 'Reputation OS · İlk yanıt',
    title: 'İlk Google',
    titleAccent: 'yanıtın gitti',
    intro: ownerName
      ? `Bravo <span style="color:${PULSE.graphite};font-weight:500;">${ownerName}</span>, <strong>${restaurantName}</strong> için ilk Google yorum yanıtını gönderdin. Yanıtlanan yorumlar yanıtlanmayanlara göre %33 daha fazla yeni müşteriye dönüşür (Google internal data).`
      : `Bravo, <strong>${restaurantName}</strong> için ilk Google yorum yanıtını gönderdin. Yanıtlanan yorumlar yanıtlanmayanlara göre %33 daha fazla yeni müşteriye dönüşür (Google internal data).`,
    habitTitle: 'Sıradaki refleks',
    habitBody: 'Her sabah 5 dakika ayır: yeni gelen yorumları tara, 5 puanlara teşekkür et, 1-3 puanlara önce dinle sonra çöz yaklaşımıyla yaz.',
    cta: 'Yorum panelini aç →',
    note: 'Pulse AI tonu uyacak şekilde taslakları otomatik hazırlar. Onayla + minik dokunuş + gönder; 60 saniyede biten bir refleks.',
  } : {
    eyebrow: 'Reputation OS · First reply',
    title: 'Your first Google',
    titleAccent: 'reply is live',
    intro: ownerName
      ? `Well done <span style="color:${PULSE.graphite};font-weight:500;">${ownerName}</span>, you just sent the first Google review reply for <strong>${restaurantName}</strong>. Replied reviews convert new customers 33% better than unreplied ones (Google internal data).`
      : `You just sent the first Google review reply for <strong>${restaurantName}</strong>. Replied reviews convert new customers 33% better than unreplied ones (Google internal data).`,
    habitTitle: 'The habit that follows',
    habitBody: 'Block 5 minutes every morning: scan new reviews, thank 5-stars, listen-then-fix the 1-3s.',
    cta: 'Open reviews panel →',
    note: 'Pulse AI drafts replies in your tone. Approve + tweak + send — a 60-second daily habit.',
  };

  const merged = await loadMailCopy('first-reply-celebration', locale, inlineDefault);
  const vars = { ownerName: params.ownerName || '', restaurantName: params.restaurantName };
  const copy = deepSubstitute(merged, vars, 'html') as typeof inlineDefault;
  const copyText = deepSubstitute(merged, vars, 'text') as typeof inlineDefault;

  const content = `
    ${renderEyebrow(copy.eyebrow)}
    ${spacer(16)}
    <h1 style="margin:0;font-family:${FONTS.heading};font-size:42px;line-height:1.05;letter-spacing:-0.03em;font-weight:500;color:${PULSE.graphite};">
      ${copy.title} <span style="color:${PULSE.limeDeep};">${copy.titleAccent}</span>
    </h1>
    ${spacer(20)}
    <p style="margin:0;font-family:${FONTS.body};font-size:15px;line-height:1.6;color:${PULSE.n600};">
      ${copy.intro}
    </p>
    ${spacer(28)}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${PULSE.limeSoft};border-left:3px solid ${PULSE.limeDeep};border-radius:12px;">
      <tr><td style="padding:18px 20px;">
        <div style="font-family:${FONTS.heading};font-size:15px;font-weight:500;color:${PULSE.graphite};">${copy.habitTitle}</div>
        ${spacer(8)}
        <p style="margin:0;font-family:${FONTS.body};font-size:13px;line-height:1.55;color:${PULSE.n700};">${copy.habitBody}</p>
      </td></tr>
    </table>
    ${spacer(28)}
    ${renderButton({ href: params.reviewsUrl, label: copy.cta, variant: 'dark' })}
    ${spacer(20)}
    <p style="margin:0;font-family:${FONTS.body};font-size:12.5px;line-height:1.55;color:${PULSE.n500};">
      ${copy.note}
    </p>
  `;

  const html = pulseLayout({ subject, preheader, content });
  const text = [
    copyText.eyebrow, '', `${copy.title} ${copy.titleAccent}`, '',
    copyText.intro.replace(/<[^>]*>/g, ''), '',
    `${copy.habitTitle}: ${copyText.habitBody}`, '',
    `${copy.cta} ${params.reviewsUrl}`, '',
    copyText.note,
  ].join('\n');
  return { subject, html, text };
}
