import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderP, spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';
import { formatCompactStampInTimeZone, resolveDisplayTimeZone } from '@/lib/timezone';

export interface LowRatingAlertParams {
  rating: number;
  restaurantName: string;
  customerName?: string | null;
  comment?: string | null;
  branch?: string | null;
  tableNumber?: string | null;
  reviewUrl: string;
  /** Optional already-generated AI reply suggestion. When omitted the AI box
   *  is hidden — alert still fires with the customer block + quick actions. */
  aiDraft?: string | null;
  aiTone?: string | null;
  aiLatencyMs?: number | null;
  /** Up to 3 short tag chips ("servis-yavaş" tarzı). Free-form, hashed in UI */
  tags?: string[];
  customerSubtitle?: string | null;
  platformLabel?: string | null;
  /** Yorumun bırakıldığı an (`Feedback.createdAt`). Verilmezse render anı
   *  kullanılır — eski davranış, ama cron/retry akışlarında yanıltıcı. */
  submittedAt?: Date | string | null;
  /** Gösterim saat dilimi (IANA). Default `Europe/Istanbul`. Sunucu process
   *  TZ'si UTC olduğu için bu parametre olmadan damga 3 saat geri düşerdi. */
  timeZone?: string | null;
}

export async function renderLowRatingAlert(
  params: LowRatingAlertParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  // Subject deliverability §21.23: emoji çıkarıldı (⚠ spam tetikçi).
  // "★" rating'in görsel sinyalini koruyor.
  const subject = isTr
    ? `Düşük puan · ${params.restaurantName}${params.branch ? ' · ' + params.branch : ''} · ${params.rating}★`
    : `Low rating · ${params.restaurantName}${params.branch ? ' · ' + params.branch : ''} · ${params.rating}★`;
  const preheader = isTr
    ? `${params.customerName ?? 'Müşteri'} az önce ${params.rating} yıldız bıraktı. ${params.aiDraft ? 'AI yanıt taslağı hazır.' : 'Hızlı aksiyon önerileri içeride.'}`
    : `${params.customerName ?? 'A customer'} just left ${params.rating} stars. ${params.aiDraft ? 'AI reply draft inside.' : 'Quick actions inside.'}`;

  const customerName = params.customerName ? escapeHtml(params.customerName) : (isTr ? 'Anonim' : 'Anonymous');
  const customerInitial = (params.customerName || '?').trim().charAt(0).toUpperCase() || '?';
  const rating = Math.max(0, Math.min(5, Math.round(params.rating)));
  const customerSubtitle = params.customerSubtitle
    ? escapeHtml(params.customerSubtitle)
    : (params.platformLabel ? escapeHtml(params.platformLabel) : '');

  const reviewHref = escapeHtml(params.reviewUrl);
  const safeComment = params.comment ? escapeHtml(params.comment).replace(/\n/g, '<br>') : '';
  const tags = (params.tags ?? []).slice(0, 4);

  const inlineDefault = isTr ? {
    eyebrowAlert: 'Anlık uyarı · Düşük puan',
    eyebrowAction: 'Aksiyon gerektiriyor · 1 saat içinde dön',
    title: '${rating} yıldız geldi.',
    titleSub: 'Önce dinleyelim.',
    aiEyebrow: 'Pulse AI taslağı',
    toneLabel: params.aiTone ?? 'Ton: profesyonel · empati yüksek',
    aiEdit: 'Düzenle',
    aiApprove: 'Onayla & Yanıtla →',
    quickEyebrow: 'Hızlı aksiyon',
    quickActions: [
      { l: 'Şefle paylaş', s: 'Mutfak Slack' },
      { l: 'Vardiya notu', s: 'Servis ekibi' },
      { l: 'Tüm yorumlar', s: 'Panele git' },
    ],
    noComment: 'Yorum bırakılmadı.',
  } : {
    eyebrowAlert: 'Live alert · Low rating',
    eyebrowAction: 'Action needed · reply within 1 hour',
    title: 'A ${rating}-star review just landed.',
    titleSub: 'Listen first.',
    aiEyebrow: 'Pulse AI draft',
    toneLabel: params.aiTone ?? 'Tone: professional · high empathy',
    aiEdit: 'Edit',
    aiApprove: 'Approve & Reply →',
    quickEyebrow: 'Quick actions',
    quickActions: [
      { l: 'Share with chef', s: 'Kitchen Slack' },
      { l: 'Shift note', s: 'Service team' },
      { l: 'All reviews', s: 'Open panel' },
    ],
    noComment: 'No comment left.',
  };

  // DB-merged copy. Quick action labels (`quickActions`) are structural —
  // admin UI doesn't expose them, so the inline defaults always win.
  const merged = await loadMailCopy('low-rating-alert', locale, inlineDefault);
  const vars = {
    rating: params.rating,
    restaurantName: params.restaurantName,
    customerName: params.customerName ?? (isTr ? 'Anonim' : 'Anonymous'),
    branch: params.branch ?? '',
  };
  const copy = deepSubstitute(merged, vars, 'html');
  const copyText = deepSubstitute(merged, vars, 'text');

  // Yorumun bırakıldığı an, işletmenin yerel saatinde. `new Date()` +
  // TZ'siz `toLocaleString` ikilisi sunucuda (UTC) render edildiği için
  // owner'a saati 3 saat geri gösteriyordu; ayrıca render anını damgalıyordu.
  const timestamp = formatCompactStampInTimeZone(
    params.submittedAt ?? new Date(),
    locale,
    resolveDisplayTimeZone(params.timeZone),
  );
  const subTitle = params.branch
    ? `${escapeHtml(params.restaurantName)} · ${escapeHtml(params.branch)}${params.tableNumber ? ` · QR: ${escapeHtml(params.tableNumber)}` : ''}`
    : escapeHtml(params.restaurantName);

  // Star row — nowrap so a narrow card never splits it 3 + 2.
  const starsHtml = `<span style="font-family:${FONTS.body};font-size:18px;line-height:1;letter-spacing:2px;white-space:nowrap;color:${PULSE.warning};">${'★'.repeat(rating)}<span style="color:${PULSE.n300};">${'★'.repeat(5 - rating)}</span></span>`;

  // Tags — chips wrap onto new rows; a single long tag may break inside itself.
  const tagsHtml = tags.length
    ? `<div style="margin-top:16px;line-height:1.4;">${tags.map((t) => `<span style="display:inline-block;max-width:100%;font-family:${FONTS.label};font-size:11px;line-height:1.4;color:${PULSE.n600};background:${PULSE.n100};padding:5px 10px;border-radius:6px;margin:0 6px 6px 0;">#${escapeHtml(t)}</span>`).join('')}</div>`
    : '';

  // AI Draft card — dark editor card. Buttons are `bz-btn` so on phones they go
  // full width and stack (edit above approve).
  const aiBlock = params.aiDraft ? `
        ${spacer(32)}
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td valign="middle" style="width:32px;">
              <span style="display:inline-block;width:24px;height:24px;border-radius:6px;background:${PULSE.lime};text-align:center;line-height:24px;color:${PULSE.graphite};font-family:${FONTS.label};font-size:11px;font-weight:600;">AI</span>
            </td>
            <td valign="middle" style="padding-left:6px;">${renderEyebrow(`${copy.aiEyebrow}${params.aiLatencyMs ? ' · ' + (params.aiLatencyMs / 1000).toFixed(1) + 's' : ''}`)}</td>
          </tr>
        </table>
        ${spacer(14)}
        <div style="background:${PULSE.graphite};border-radius:14px;padding:24px;color:${PULSE.pure};">
          ${renderP(escapeHtml(params.aiDraft).replace(/\n/g, '<br>'), { size: 14, color: PULSE.n300 })}
          <div style="margin-top:20px;padding-top:18px;border-top:1px solid ${PULSE.n700};">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row">
              <tr>
                <td class="stack-col" valign="middle" style="font-family:${FONTS.label};font-size:11px;line-height:1.5;color:${PULSE.n400};">${escapeHtml(copy.toneLabel)}</td>
                <td class="stack-col" valign="middle" align="right">
                  <a href="${reviewHref}" class="bz-btn" style="display:inline-block;font-family:${FONTS.body};font-size:13px;font-weight:500;line-height:1.2;color:${PULSE.pure};text-decoration:none;padding:10px 16px;border:1px solid ${PULSE.n600};border-radius:8px;margin-right:6px;">${copy.aiEdit}</a>
                  <a href="${reviewHref}" class="bz-btn" style="display:inline-block;font-family:${FONTS.body};font-size:13px;font-weight:600;line-height:1.2;color:${PULSE.graphite};background:${PULSE.lime};text-decoration:none;padding:11px 16px;border-radius:8px;">${copy.aiApprove}</a>
                </td>
              </tr>
            </table>
          </div>
        </div>
` : '';

  // Quick actions — 3-col grid on desktop, stacked cards on phones.
  const baseAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com';
  const localePath = isTr ? 'tr' : 'en';
  const quickHrefs = [reviewHref, reviewHref, escapeHtml(`${baseAppUrl}/${localePath}/dashboard/feedbacks`)];
  const quickCards = copy.quickActions.map((a, i) => `
    <td class="stack-col" valign="top" style="width:33.33%;padding:0 ${i === 0 ? '6px 0 0' : i === copy.quickActions.length - 1 ? '0 0 6px' : '6px'};">
      <a href="${quickHrefs[i]}" style="display:block;padding:16px;border:1px solid ${PULSE.n200};border-radius:10px;text-decoration:none;">
        <div style="font-family:${FONTS.heading};font-size:14px;font-weight:600;line-height:1.35;color:${PULSE.graphite};margin-bottom:4px;">${a.l} →</div>
        <div style="font-size:11px;line-height:1.45;color:${PULSE.n500};font-family:${FONTS.label};letter-spacing:0.03em;">${a.s}</div>
      </a>
    </td>
  `).join('');

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-ftr" style="background:${PULSE.graphite};padding:14px 40px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td valign="middle" style="font-family:${FONTS.label};font-size:11px;font-weight:500;line-height:1.45;color:${PULSE.pure};">
                <span style="display:inline-block;width:6px;height:6px;background:${PULSE.warning};border-radius:50%;vertical-align:middle;margin-right:8px;"></span><span style="vertical-align:middle;">${copy.eyebrowAlert}</span>
              </td>
              <td align="right" valign="middle" style="padding-left:12px;white-space:nowrap;">
                <span style="font-family:${FONTS.label};font-size:11px;color:${PULSE.n400};white-space:nowrap;">${timestamp}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td class="bz-ftr" style="background:${PULSE.pure};padding:16px 40px;border-bottom:1px solid ${PULSE.n200};">
          <div style="font-family:${FONTS.label};font-size:11px;letter-spacing:0.12em;line-height:1.6;color:${PULSE.n500};text-transform:uppercase;font-weight:600;">${subTitle}</div>
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:36px 40px 44px;">
          ${renderEyebrow(copy.eyebrowAction, PULSE.warning)}
          ${spacer(14)}
          <h1 class="bz-h1" style="font-family:${FONTS.heading};font-size:34px;font-weight:600;letter-spacing:-0.02em;line-height:1.15;color:${PULSE.graphite};margin:0;">
            ${copy.title}<br/>
            <span style="color:${PULSE.n500};">${copy.titleSub}</span>
          </h1>
          ${spacer(26)}
          <div style="border:1px solid ${PULSE.n200};border-radius:14px;overflow:hidden;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PULSE.n50};border-bottom:1px solid ${PULSE.n200};">
              <tr>
                <td style="padding:16px 24px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row">
                    <tr>
                      <td class="stack-col" valign="middle" style="padding:0;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td valign="middle" style="width:40px;">
                              <div style="width:40px;height:40px;border-radius:50%;background:#FEF3C7;text-align:center;line-height:40px;font-family:${FONTS.heading};font-weight:600;font-size:16px;color:${PULSE.graphite};">${escapeHtml(customerInitial)}</div>
                            </td>
                            <td valign="middle" style="padding-left:12px;">
                              <div style="font-family:${FONTS.body};font-size:14px;font-weight:600;line-height:1.4;color:${PULSE.graphite};">${customerName}</div>
                              ${customerSubtitle ? `<div style="font-size:12px;line-height:1.45;color:${PULSE.n500};">${customerSubtitle}</div>` : ''}
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td class="stack-col" valign="middle" align="right" style="padding:0;">
                        ${starsHtml}
                        <span style="font-size:11px;line-height:1.4;color:${PULSE.n500};font-family:${FONTS.label};margin-left:8px;white-space:nowrap;">${params.rating.toFixed(1)} / 5.0</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <div style="padding:24px;">
              ${safeComment
                ? `<p style="font-family:${FONTS.body};font-size:15px;line-height:1.65;color:${PULSE.n800};margin:0;">“${safeComment}”</p>`
                : `<p style="font-family:${FONTS.body};font-size:13px;line-height:1.55;color:${PULSE.n500};margin:0;">${copy.noComment}</p>`}
              ${tagsHtml}
            </div>
          </div>
          ${aiBlock}
          ${spacer(32)}
          ${renderEyebrow(copy.quickEyebrow)}
          ${spacer(12)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row"><tr>${quickCards}</tr></table>
        </td>
      </tr>
    </table>
  `;

  // pulseLayout interpolates subject/preheader into <title> and the hidden
  // preheader div verbatim, so they are escaped here.
  const html = pulseLayout({
    subject: escapeHtml(subject),
    preheader: escapeHtml(preheader),
    content,
    eyebrow: '',
    footer: { locale, unsubText: isTr ? 'Düşük puan uyarılarını ayarlamak için' : 'To adjust low-rating alerts' },
  });
  const text = `${copyText.title} ${copyText.titleSub}\n\n${customerName} · ${params.rating}★\n${safeComment ? '"' + (params.comment || '') + '"\n' : ''}\n${params.reviewUrl}`;
  return { subject, html, text };
}
