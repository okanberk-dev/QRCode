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
      subject: 'Mesajınızı aldık',
      preheader: ticket ? `Talep #${ticket} kaydedildi. Hafta içi genellikle bir iş günü içinde yanıt veriyoruz.` : 'Mesajınız destek ekibimize ulaştı. Hafta içi genellikle bir iş günü içinde yanıt veriyoruz.',
      eyebrow: 'İletişim · Onay',
      titleA: 'Aldık',
      titleB: 'Size yazacağız.',
      intro: 'Mesajınız destek ekibimize ulaştı. Hafta içi 09:00–18:00 (TSİ) arasında çalışıyoruz ve genellikle bir iş günü içinde yanıt veriyoruz.',
      formEyebrow: 'Form kaydı',
      timelineEyebrow: 'Sırada ne var',
      timeline: [
        { label: 'Az önce · Tamamlandı', body: 'Mesajınızı aldık', status: 'done' as const },
        { label: 'Hafta içi 09:00–18:00', body: 'Ekibimiz mesajınızı okur', status: 'current' as const },
        { label: 'Genellikle bir iş günü içinde', body: 'Formda bıraktığınız e-posta adresine yanıt veririz', status: 'pending' as const },
      ],
      sideEyebrowA: 'Yardım merkezi',
      sideBodyA: 'Sık sorulan soruların yanıtlarını yardım merkezinde bulabilirsiniz.',
      sideCtaA: 'Yardım merkezine git →',
      sideEyebrowB: 'Beklerken',
      sideBodyB: 'QR yorum akışının nasıl çalıştığını adım adım görün.',
      sideCtaB: 'Nasıl çalışır →',
    },
    career: {
      subject: 'Başvurunuz bize ulaştı',
      preheader: ticket ? `Başvuru #${ticket} kaydedildi.` : 'Başvurunuz ekibimize ulaştı.',
      eyebrow: 'Kariyer · Onay',
      titleA: 'Aldık',
      titleB: 'Teşekkür ederiz.',
      intro: 'Başvurunuzu aldık ve ekibimize ilettik. Uygun bir pozisyon olduğunda sizinle e-postayla iletişime geçeceğiz.',
      formEyebrow: 'Başvuru özeti',
      timelineEyebrow: 'Süreç',
      timeline: [
        { label: 'Az önce · Tamamlandı', body: 'Başvurunuz ulaştı', status: 'done' as const },
        { label: 'İnceleme', body: 'Ekibimiz başvurunuzu inceler', status: 'current' as const },
        { label: 'Uygun pozisyon olduğunda', body: 'Size e-postayla yazarız', status: 'pending' as const },
      ],
      sideEyebrowA: 'Kariyer',
      sideBodyA: 'Açık pozisyonları kariyer sayfasında duyuruyoruz.',
      sideCtaA: 'Kariyer sayfası →',
      sideEyebrowB: 'Buaze hakkında',
      sideBodyB: 'Ne yaptığımızı ve nasıl çalıştığımızı okuyun.',
      sideCtaB: 'Hakkımızda →',
    },
    roi: {
      subject: 'ROI tahmininiz kaydedildi',
      preheader: ticket ? `Tahmin #${ticket} kaydedildi.` : 'Girdiğiniz bilgilerle hesaplanan tahmin hazır.',
      eyebrow: 'ROI · Onay',
      titleA: 'Hesapladık',
      titleB: 'Sonuçlar bir tahmindir.',
      intro: 'Girdiğiniz bilgilerle tahmini zaman tasarrufunu hesapladık. Gerçek sonuçlar işletmenize ve yorum hacminize göre değişir.',
      formEyebrow: 'Tahmin özeti',
      timelineEyebrow: 'Sırada ne var',
      timeline: [
        { label: 'Az önce · Tamamlandı', body: 'Tahmininizi kaydettik', status: 'done' as const },
        { label: 'Bu e-postada', body: 'Girdiğiniz bilgilerin özeti', status: 'current' as const },
        { label: 'İsterseniz', body: '14 gün ücretsiz deneyle kendi verilerinizi görün', status: 'pending' as const },
      ],
      sideEyebrowA: 'Planlar',
      sideBodyA: 'Planları ve fiyatları karşılaştırın.',
      sideCtaA: 'Fiyatlandırma →',
      sideEyebrowB: 'Nasıl çalışır',
      sideBodyB: 'QR yorum akışını adım adım görün.',
      sideCtaB: 'Nasıl çalışır →',
    },
    newsletter: {
      subject: 'Bülten aboneliğiniz başladı',
      preheader: 'Son blog yazılarımızı ayda bir e-postayla göndereceğiz.',
      eyebrow: 'Bülten · Onay',
      titleA: 'Aramızdasınız',
      titleB: 'Bülten ayda bir gelir.',
      intro: 'Aboneliğiniz başladı. Pulse bülteniyle son blog yazılarımızı ve ürün haberlerini ayda bir gönderiyoruz. Her e-postada abonelikten çıkma bağlantısı bulunur.',
      formEyebrow: 'Abonelik',
      timelineEyebrow: 'Ne bekleyebilirsiniz',
      timeline: [
        { label: 'Şimdi', body: 'Bu onay e-postası', status: 'done' as const },
        { label: 'Ayda bir', body: 'Son blog yazıları ve ürün haberleri', status: 'current' as const },
        { label: 'Her e-postada', body: 'Abonelikten çıkma bağlantısı', status: 'pending' as const },
      ],
      sideEyebrowA: 'Bu arada',
      sideBodyA: 'Buaze\'i yeni tanıyorsanız QR yorum akışını adım adım görün.',
      sideCtaA: 'Nasıl çalışır →',
      sideEyebrowB: 'Blog',
      sideBodyB: 'Yorum yönetimi üzerine yazılarımızı blogda okuyabilirsiniz.',
      sideCtaB: 'Bloga git →',
    },
  } : {
    contact: {
      subject: 'We received your message',
      preheader: ticket ? `Request #${ticket} saved. On weekdays we usually reply within one business day.` : 'Your message reached our support team. On weekdays we usually reply within one business day.',
      eyebrow: 'Contact · Confirmation',
      titleA: 'Got it',
      titleB: 'We\'ll write back.',
      intro: 'Your message reached our support team. We work weekdays 09:00–18:00 (Turkey time) and usually reply within one business day.',
      formEyebrow: 'Form record',
      timelineEyebrow: 'What happens next',
      timeline: [
        { label: 'Just now · Done', body: 'We received your message', status: 'done' as const },
        { label: 'Weekdays 09:00–18:00', body: 'Our team reads your message', status: 'current' as const },
        { label: 'Usually within one business day', body: 'We reply to the e-mail address you entered', status: 'pending' as const },
      ],
      sideEyebrowA: 'Help center',
      sideBodyA: 'Answers to common questions are in the help center.',
      sideCtaA: 'Go to the help center →',
      sideEyebrowB: 'While you wait',
      sideBodyB: 'See how the QR review flow works, step by step.',
      sideCtaB: 'How it works →',
    },
    career: {
      subject: 'Your application reached us',
      preheader: ticket ? `Application #${ticket} saved.` : 'Your application reached our team.',
      eyebrow: 'Careers · Confirmation',
      titleA: 'Got it',
      titleB: 'Thank you.',
      intro: 'We received your application and passed it to our team. When there is a suitable role, we\'ll contact you by e-mail.',
      formEyebrow: 'Application summary',
      timelineEyebrow: 'Process',
      timeline: [
        { label: 'Just now · Done', body: 'Application received', status: 'done' as const },
        { label: 'Review', body: 'Our team reviews your application', status: 'current' as const },
        { label: 'When a role fits', body: 'We\'ll e-mail you', status: 'pending' as const },
      ],
      sideEyebrowA: 'Careers',
      sideBodyA: 'We announce open roles on our careers page.',
      sideCtaA: 'Careers page →',
      sideEyebrowB: 'About Buaze',
      sideBodyB: 'Read what we do and how we work.',
      sideCtaB: 'About us →',
    },
    roi: {
      subject: 'Your ROI estimate is saved',
      preheader: ticket ? `Estimate #${ticket} saved.` : 'The estimate based on your inputs is ready.',
      eyebrow: 'ROI · Confirmation',
      titleA: 'Calculated',
      titleB: 'The results are an estimate.',
      intro: 'We estimated the time you could save from the figures you entered. Actual results depend on your business and your review volume.',
      formEyebrow: 'Estimate summary',
      timelineEyebrow: 'What happens next',
      timeline: [
        { label: 'Just now · Done', body: 'Estimate saved', status: 'done' as const },
        { label: 'In this e-mail', body: 'A summary of your inputs', status: 'current' as const },
        { label: 'If you like', body: 'Try it free for 14 days with your own data', status: 'pending' as const },
      ],
      sideEyebrowA: 'Plans',
      sideBodyA: 'Compare plans and prices.',
      sideCtaA: 'Pricing →',
      sideEyebrowB: 'How it works',
      sideBodyB: 'See the QR review flow step by step.',
      sideCtaB: 'How it works →',
    },
    newsletter: {
      subject: 'Your newsletter subscription has started',
      preheader: 'We\'ll send our latest blog posts once a month.',
      eyebrow: 'Newsletter · Confirmation',
      titleA: 'You\'re in',
      titleB: 'The newsletter arrives once a month.',
      intro: 'Your subscription has started. The Pulse newsletter brings our latest blog posts and product news once a month. Every e-mail has an unsubscribe link.',
      formEyebrow: 'Subscription',
      timelineEyebrow: 'What to expect',
      timeline: [
        { label: 'Now', body: 'This confirmation e-mail', status: 'done' as const },
        { label: 'Once a month', body: 'Latest blog posts and product news', status: 'current' as const },
        { label: 'In every e-mail', body: 'An unsubscribe link', status: 'pending' as const },
      ],
      sideEyebrowA: 'Meanwhile',
      sideBodyA: 'New to Buaze? See how the QR review flow works, step by step.',
      sideCtaA: 'How it works →',
      sideEyebrowB: 'Blog',
      sideBodyB: 'Read our posts about review management.',
      sideCtaB: 'Go to the blog →',
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
  // Each side card links to a page that exists and matches its text.
  const SIDE_PATHS: Record<FormType, [string, string]> = {
    contact: ['help', 'how-it-works'],
    newsletter: ['how-it-works', 'blog'],
    career: ['careers', 'about'],
    roi: ['pricing', 'how-it-works'],
  };
  const [sidePathA, sidePathB] = SIDE_PATHS[params.formType];
  const sideHrefA = `${baseAppUrl}/${localePath}/${sidePathA}`;
  const sideHrefB = `${baseAppUrl}/${localePath}/${sidePathB}`;

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
