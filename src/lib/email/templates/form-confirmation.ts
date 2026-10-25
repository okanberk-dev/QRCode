import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderP, spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';
import { formatCompactStampInTimeZone, resolveDisplayTimeZone } from '@/lib/timezone';

export type FormType = 'contact' | 'career' | 'roi' | 'newsletter';

// Per-variant copy. Each variant is a flat record of strings the admin can
// edit; structural data (`timeline` array, ticket prefix) stays in code.
export type FormVariantCopy = Record<string, string>;

export interface FormConfirmationParams {
  formType: FormType;
  name?: string | null;
  details?: Array<{ label: string; value: string }>;
  followUpUrl?: string;
  ticketId?: string;
}

export async function renderFormConfirmation(
  params: FormConfirmationParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  // Ticket is only ever rendered into HTML (preheader + eyebrow chip), never the
  // plain-text part, so it is escaped once at the source. It is NEVER invented:
  // no caller-supplied id (or the newsletter variant, which has no ticket) means
  // no chip and no ticket text in the preheader.
  const rawTicket = (params.ticketId ?? '').trim();
  const ticket: string | null = rawTicket && params.formType !== 'newsletter' ? escapeHtml(rawTicket) : null;

  const FORM_COPY = isTr ? {
    contact: {
      subject: 'Mesajını aldık — 24 saat içinde döneceğiz',
      preheader: ticket ? `Talep #${ticket} sıraya alındı. İşte özet.` : 'Talebin sıraya alındı. İşte özet.',
      eyebrow: 'İletişim · Onay',
      titleA: 'Aldık',
      titleB: 'Sıradayız.',
      intro: 'Mesajın ekibimize ulaştı. Genelde 24 saat içinde dönüyoruz — haftasonu bu süre 48 saate kadar uzayabilir.',
      formEyebrow: 'Form kaydı',
      timelineEyebrow: 'Sırada ne var',
      timeline: [
        { label: 'Az önce · Tamamlandı', body: 'Mesajını aldık', status: 'done' as const },
        { label: 'İlk 4 saat içinde · Sales', body: 'Ekip atayacağız', status: 'current' as const },
        { label: '24 saat içinde · E-posta veya telefon', body: 'Birebir döneceğiz', status: 'pending' as const },
      ],
      sideEyebrowA: 'Acil durum',
      sideBodyA: 'Daha hızlı destek için canlı sohbeti kullanabilirsin.',
      sideCtaA: 'Sohbeti aç →',
      sideEyebrowB: 'Beklerken',
      sideBodyB: '10 dakikalık ürün turu — kayıt olmadan.',
      sideCtaB: 'Ürün turunu izle →',
    },
    career: {
      subject: 'Başvurun bize ulaştı',
      preheader: ticket ? `Başvuru #${ticket} sıraya alındı. 5 iş gününde dönüyoruz.` : 'Başvurun sıraya alındı. 5 iş gününde dönüyoruz.',
      eyebrow: 'Kariyer · Onay',
      titleA: 'Aldık',
      titleB: 'İnceliyoruz.',
      intro: 'Başvurunu ekibimize ilettik. 5 iş günü içinde mutlaka geri döneceğiz — uygun bir pozisyon yoksa bile haber vereceğiz.',
      formEyebrow: 'Başvuru özeti',
      timelineEyebrow: 'Süreç',
      timeline: [
        { label: '1. gün · Tamamlandı', body: 'Başvurun ulaştı', status: 'done' as const },
        { label: '2-3. gün · İnceleme', body: 'CV ve portfolyon HR\'da', status: 'current' as const },
        { label: '5. gün içinde', body: 'Sonuç bildirimi e-postası', status: 'pending' as const },
      ],
      sideEyebrowA: 'Açık pozisyonlar',
      sideBodyA: 'Diğer rolleri de görmek ister misin?',
      sideCtaA: 'Tüm pozisyonlar →',
      sideEyebrowB: 'Beklerken',
      sideBodyB: 'Buaze ekip kültürünü tanımak için hikâyemizi oku.',
      sideCtaB: 'Ekip blogu →',
    },
    roi: {
      subject: 'ROI hesaplamanı kaydettik',
      preheader: ticket ? `Hesap #${ticket} hazır. Detaylı PDF birazdan inboxuna düşecek.` : 'Hesabın hazır. Detaylı PDF birazdan inboxuna düşecek.',
      eyebrow: 'ROI · Onay',
      titleA: 'Hesapladık',
      titleB: 'Sıradaki adım: demo.',
      intro: 'Verdiğin bilgilerle aylık potansiyel etkiyi hesapladık. Detaylı raporu ve sektör karşılaştırmasını e-posta ile sana ulaştırıyor olacağız.',
      formEyebrow: 'Hesap özeti',
      timelineEyebrow: 'Sırada ne var',
      timeline: [
        { label: 'Az önce · Tamamlandı', body: 'Hesaplamanı kaydettik', status: 'done' as const },
        { label: '2 saat içinde · Sales ekibi', body: 'Detaylı PDF rapor hazırlanıyor', status: 'current' as const },
        { label: '1 gün içinde', body: 'Demo daveti gönderiyoruz', status: 'pending' as const },
      ],
      sideEyebrowA: 'Demo seç',
      sideBodyA: 'Beklemeden bir slot ayırt edebilirsin.',
      sideCtaA: 'Takvimden seç →',
      sideEyebrowB: 'Bu arada',
      sideBodyB: 'Diğer restoranlar Buaze\'i nasıl kullanıyor?',
      sideCtaB: 'Vakaları gör →',
    },
    newsletter: {
      subject: 'Aboneliğin aktif',
      preheader: 'Pulse bülteni her ayın 1\'inde mailine düşecek.',
      eyebrow: 'Bülten · Onay',
      titleA: 'Aramızdasın',
      titleB: 'Pulse her ay 1\'inde gelir.',
      intro: 'Aboneliğini aktive ettik. Pulse bülteni vakalar, sektör verileri, ürün haberleri — sana ayda bir.',
      formEyebrow: 'Abonelik',
      timelineEyebrow: 'Ne bekleyeceksin',
      timeline: [
        { label: 'Şimdi', body: 'Hoş geldin maili (bu mail)', status: 'done' as const },
        { label: 'Her ayın 1\'i', body: 'Pulse aylık bülten', status: 'current' as const },
        { label: 'Hiç', body: 'Spam, 3. taraf paylaşımı, yığın mail — yok', status: 'pending' as const },
      ],
      sideEyebrowA: 'Bu arada',
      sideBodyA: 'Buaze\'i hâlâ keşfediyorsan kısa turdan başla.',
      sideCtaA: 'Buaze nasıl çalışır →',
      sideEyebrowB: 'Beklerken',
      sideBodyB: '5 dakikalık ürün turu — kayıt yok.',
      sideCtaB: 'Ürün turunu izle →',
    },
  } : {
    contact: {
      subject: 'Got your message — we\'ll reply within 24h',
      preheader: ticket ? `Ticket #${ticket} queued. Here's the summary.` : 'Your request is queued. Here\'s the summary.',
      eyebrow: 'Contact · Confirmation',
      titleA: 'Got it',
      titleB: 'In the queue.',
      intro: 'Your message reached our team. We typically reply within 24 hours — weekends may extend this to 48 hours.',
      formEyebrow: 'Form record',
      timelineEyebrow: 'What happens next',
      timeline: [
        { label: 'Now · Done', body: 'We received your message', status: 'done' as const },
        { label: 'Within 4h · Sales', body: 'Routing to the right person', status: 'current' as const },
        { label: 'Within 24h · email or call', body: 'You\'ll hear from a human', status: 'pending' as const },
      ],
      sideEyebrowA: 'Need it faster?',
      sideBodyA: 'Open live chat for instant support.',
      sideCtaA: 'Open chat →',
      sideEyebrowB: 'While you wait',
      sideBodyB: '10-min product tour — no signup.',
      sideCtaB: 'Watch tour →',
    },
    career: {
      subject: 'Your application reached us',
      preheader: ticket ? `Application #${ticket} queued. We'll reply within 5 business days.` : 'Your application is queued. We\'ll reply within 5 business days.',
      eyebrow: 'Careers · Confirmation',
      titleA: 'Got it',
      titleB: 'Reviewing now.',
      intro: 'We\'ve forwarded your application to the team. We\'ll get back within 5 business days — even if there\'s no fit, you\'ll hear from us.',
      formEyebrow: 'Application summary',
      timelineEyebrow: 'Process',
      timeline: [
        { label: 'Day 1 · Done', body: 'Application received', status: 'done' as const },
        { label: 'Day 2-3 · Review', body: 'Resume + portfolio with HR', status: 'current' as const },
        { label: 'By day 5', body: 'Final decision email', status: 'pending' as const },
      ],
      sideEyebrowA: 'Open roles',
      sideBodyA: 'Want to see other positions?',
      sideCtaA: 'All open roles →',
      sideEyebrowB: 'While you wait',
      sideBodyB: 'Read about Buaze culture.',
      sideCtaB: 'Team blog →',
    },
    roi: {
      subject: 'We saved your ROI estimate',
      preheader: ticket ? `Estimate #${ticket} ready. Detailed PDF inbound.` : 'Your estimate is ready. Detailed PDF inbound.',
      eyebrow: 'ROI · Confirmation',
      titleA: 'Crunched',
      titleB: 'Next: demo.',
      intro: 'Based on your inputs we estimated monthly potential impact. We\'ll send a detailed PDF report and sector benchmark.',
      formEyebrow: 'Estimate summary',
      timelineEyebrow: 'What happens next',
      timeline: [
        { label: 'Now · Done', body: 'Estimate saved', status: 'done' as const },
        { label: 'Within 2h · Sales', body: 'Detailed PDF report being prepared', status: 'current' as const },
        { label: 'Within 1 day', body: 'Demo invitation sent', status: 'pending' as const },
      ],
      sideEyebrowA: 'Pick a demo',
      sideBodyA: 'Reserve a slot without waiting.',
      sideCtaA: 'Pick a time →',
      sideEyebrowB: 'Meanwhile',
      sideBodyB: 'How do other restaurants use Buaze?',
      sideCtaB: 'See cases →',
    },
    newsletter: {
      subject: 'Subscription active',
      preheader: 'Pulse newsletter lands on the 1st of every month.',
      eyebrow: 'Newsletter · Confirmation',
      titleA: 'You\'re in',
      titleB: 'Pulse arrives on the 1st.',
      intro: 'Your subscription is live. Pulse covers cases, sector data, and product news — once a month.',
      formEyebrow: 'Subscription',
      timelineEyebrow: 'What to expect',
      timeline: [
        { label: 'Now', body: 'Welcome email (this one)', status: 'done' as const },
        { label: '1st of each month', body: 'Pulse monthly digest', status: 'current' as const },
        { label: 'Never', body: 'Spam, 3rd-party sharing, bulk mail', status: 'pending' as const },
      ],
      sideEyebrowA: 'Meanwhile',
      sideBodyA: 'Still exploring Buaze? Take the short tour.',
      sideCtaA: 'How Buaze works →',
      sideEyebrowB: 'While you wait',
      sideBodyB: '5-min product tour — no signup.',
      sideCtaB: 'Watch tour →',
    },
  };

  // DB merge: top-level keys are formType variants. Admin can override any
  // variant + any string field within it; missing variants/fields fall back
  // to the inline default. Two-level merge so a partially edited variant
  // (e.g. only `cta` rewritten) keeps the rest of its fields from code.
  const merged = await loadMailCopy<typeof FORM_COPY>('form-confirmation', locale, FORM_COPY);
  const variantOverride = (merged[params.formType] ?? {}) as Partial<typeof FORM_COPY[FormType]>;
  const mergedCopy = { ...FORM_COPY[params.formType], ...variantOverride };
  // Placeholder substitution. `${firstName}` admin tarafından subject/intro/
  // sideBody'de kullanılabilir. params.name boşsa fallback'e düşer.
  const fallbackName = isTr ? 'merhaba' : 'hi';
  const vars = { firstName: params.name?.split(' ')[0] || fallbackName };
  const copy = deepSubstitute(mergedCopy, vars, 'html');
  const copyText = deepSubstitute(mergedCopy, vars, 'text');

  const baseAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com';
  const localePath = isTr ? 'tr' : 'en';
  const sideHrefA = `${baseAppUrl}/${localePath}/${params.formType === 'career' ? 'careers' : params.formType === 'newsletter' ? 'how-it-works' : 'contact'}`;
  const sideHrefB = `${baseAppUrl}/${localePath}/how-it-works`;

  // Label over value (not side by side): details carry emails, URLs and free
  // text, and a fixed label column would squeeze them on a 320px phone.
  const detailRows = (params.details || []).map((d, i, arr) => {
    const value = String(d.value ?? '');
    // Unspaced tokens (emails, URLs, file names) need a hard break point.
    const breakCls = !/\s/.test(value) && value.length > 24 ? ' class="bz-break"' : '';
    return `
    <tr>
      <td style="padding:14px 20px;${i < arr.length - 1 ? `border-bottom:1px solid ${PULSE.n200};` : ''}">
        <div style="font-family:${FONTS.label};font-size:10px;line-height:1.4;color:${PULSE.n500};letter-spacing:0.12em;font-weight:600;text-transform:uppercase;">${escapeHtml(d.label)}</div>
        <div${breakCls} style="margin-top:3px;font-family:${FONTS.body};font-size:14px;font-weight:500;color:${PULSE.graphite};line-height:1.5;">${escapeHtml(value)}</div>
      </td>
    </tr>`;
  }).join('');

  // §46 — host TZ (Vercel = UTC) yerine işletme saat dilimi.
  const filedAt = formatCompactStampInTimeZone(new Date(), locale, resolveDisplayTimeZone());

  // Empty details guard — `detailRows` her zaman string (.join('') ile),
  // truthy. Asıl kontrol array length'i. Empty array'de orphan başlık
  // ("Form summary") render edilmez.
  const formCard = (params.details && params.details.length > 0) ? `
    <div style="border:1px solid ${PULSE.n200};border-radius:14px;overflow:hidden;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PULSE.n50};border-bottom:1px solid ${PULSE.n200};">
        <tr>
          <td style="padding:14px 20px;" valign="middle">${renderEyebrow(copy.formEyebrow)}</td>
          <td style="padding:14px 20px 14px 0;white-space:nowrap;" valign="middle" align="right"><span style="font-family:${FONTS.label};font-size:11px;line-height:1.4;color:${PULSE.n500};white-space:nowrap;">${filedAt}</span></td>
        </tr>
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tbody>${detailRows}</tbody>
      </table>
    </div>
  ` : '';

  // Steps: numbered chips + hairlines. No connector line — a fixed-height line
  // can't follow wrapped text on narrow screens and ended up as a stray gap.
  const stepRows = copy.timeline.map((it, i, arr) => {
    const status = it.status ?? (i === 0 ? 'done' : i === 1 ? 'current' : 'pending');
    const chip = status === 'done'
      ? { bg: PULSE.graphite, fg: PULSE.lime, border: PULSE.graphite, glyph: '✓' }
      : status === 'current'
        ? { bg: PULSE.lime, fg: PULSE.graphite, border: PULSE.graphite, glyph: String(i + 1) }
        : { bg: PULSE.n100, fg: PULSE.n500, border: PULSE.n200, glyph: String(i + 1) };
    const line = i < arr.length - 1 ? `border-bottom:1px solid ${PULSE.n200};` : '';
    return `<tr>
      <td valign="top" width="44" style="width:44px;padding:14px 0;${line}">
        <div style="width:24px;height:24px;border:2px solid ${chip.border};border-radius:50%;background:${chip.bg};color:${chip.fg};text-align:center;line-height:24px;font-family:${FONTS.heading};font-size:12px;font-weight:600;">${chip.glyph}</div>
      </td>
      <td valign="top" style="padding:14px 0;${line}">
        <div style="font-family:${FONTS.label};font-size:11px;line-height:1.5;letter-spacing:0.1em;color:${status === 'pending' ? PULSE.n500 : PULSE.graphite};text-transform:uppercase;font-weight:600;">${escapeHtml(it.label)}</div>
        <div style="margin-top:3px;font-family:${FONTS.body};font-size:14px;color:${status === 'pending' ? PULSE.n600 : PULSE.graphite};line-height:1.5;">${escapeHtml(it.body)}</div>
      </td>
    </tr>`;
  }).join('');

  // Card CTA = pill button. `bz-btn` makes it full width on phones (its 10px
  // bottom margin is mirrored by the desktop-only spacer under it).
  const cardCta = (href: string, label: string, bg: string, fg: string, border: string): string => `
      <a href="${href}" class="bz-btn" style="display:inline-block;background:${bg};color:${fg};border:1px solid ${border};padding:12px 18px;border-radius:10px;font-family:${FONTS.body};font-size:13px;font-weight:600;line-height:1.3;text-decoration:none;">${label}</a>
      <div class="bz-hide-mobile" style="height:10px;line-height:10px;font-size:1px;">&nbsp;</div>`;
  // Card = single-cell table (background + radius on the td, padding survives
  // td.stack-col's mobile padding reset). No fixed/percentage heights: they
  // collapse the stacked cards on phones.
  const sideCard = (bg: string, inner: string): string => `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr><td valign="top" style="padding:20px 18px 10px;background:${bg};border-radius:12px;">${inner}</td></tr>
    </table>`;
  const sideCardA = sideCard(PULSE.n50, `
      ${renderEyebrow(copy.sideEyebrowA)}
      ${spacer(8)}
      ${renderP(copy.sideBodyA, { size: 13 })}
      ${spacer(14)}
      ${cardCta(sideHrefA, copy.sideCtaA, PULSE.pure, PULSE.graphite, PULSE.n300)}`);
  const sideCardB = sideCard(PULSE.graphite, `
      ${renderEyebrow(copy.sideEyebrowB, PULSE.lime)}
      ${spacer(8)}
      ${renderP(copy.sideBodyB, { size: 13, color: PULSE.n300 })}
      ${spacer(14)}
      ${cardCta(sideHrefB, copy.sideCtaB, PULSE.lime, PULSE.graphite, PULSE.lime)}`);

  // Chip only when a real ticket id was supplied (never fabricated).
  const ticketChip = ticket
    ? ` <span class="bz-break" style="display:inline-block;margin-left:6px;padding:2px 9px;background:${PULSE.n100};border-radius:6px;font-family:${FONTS.code};font-size:11px;letter-spacing:0.04em;font-weight:500;color:${PULSE.n700};text-transform:none;vertical-align:middle;">#${ticket}</span>`
    : '';

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-ftr" style="padding:40px 40px 12px;text-align:center;">
          <div style="width:64px;height:64px;margin:0 auto 22px;border-radius:50%;background:${PULSE.limeSoft};text-align:center;line-height:64px;">
            <div style="display:inline-block;width:44px;height:44px;border-radius:50%;background:${PULSE.lime};text-align:center;line-height:44px;color:${PULSE.graphite};font-family:${FONTS.heading};font-size:22px;font-weight:600;vertical-align:middle;">✓</div>
          </div>
          <div style="font-family:${FONTS.label};font-size:11px;line-height:1.8;letter-spacing:0.14em;font-weight:600;color:${PULSE.n500};text-transform:uppercase;">${copy.eyebrow.split(' · ')[0]}${ticketChip}</div>
          ${spacer(14)}
          <h1 class="bz-h1" style="font-family:${FONTS.heading};font-size:34px;font-weight:600;letter-spacing:-0.02em;line-height:1.15;color:${PULSE.graphite};margin:0;">
            ${copy.titleA}<span style="color:${PULSE.lime};">.</span><br/><span style="color:${PULSE.n500};">${copy.titleB}</span>
          </h1>
          ${spacer(16)}
          <div style="max-width:440px;margin:0 auto;">${renderP(copy.intro)}</div>
        </td>
      </tr>
      ${formCard ? `<tr><td class="bz-ftr" style="padding:20px 40px 0;">${formCard}</td></tr>` : ''}
      <tr>
        <td class="bz-ftr" style="padding:32px 40px 0;">
          ${renderEyebrow(copy.timelineEyebrow)}
          ${spacer(4)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${stepRows}</table>
        </td>
      </tr>
      <tr>
        <td class="bz-ftr" style="padding:24px 40px 40px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row">
            <tr>
              <td class="stack-col col-half" valign="top" style="width:50%;padding:0 6px 0 0;">${sideCardA}</td>
              <td class="stack-col col-half" valign="top" style="width:50%;padding:0 0 0 6px;">${sideCardB}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  const html = pulseLayout({
    subject: copy.subject,
    preheader: copy.preheader,
    content,
    eyebrow: copy.eyebrow,
    footer: { locale, unsubText: isTr ? 'Onay maillerini kapatmak için' : 'To stop confirmation emails' },
  });
  const text = `${copyText.titleA}. ${copyText.titleB}\n\n${copyText.intro}\n\n${copyText.timelineEyebrow}:\n` +
    copyText.timeline.map((t) => `· ${t.label} — ${t.body}`).join('\n');
  return { subject: copyText.subject, html, text };
}
