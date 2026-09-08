import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderP, renderTimeline, spacer, renderTwoColCards } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

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
  const ticket = params.ticketId ?? `BUZ-${Math.floor(Math.random() * 9000 + 1000)}`;

  const FORM_COPY = isTr ? {
    contact: {
      subject: 'Mesajını aldık — 24 saat içinde döneceğiz',
      preheader: `Talep #${ticket} sıraya alındı. İşte özet.`,
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
      preheader: `Başvuru #${ticket} sıraya alındı. 5 iş gününde dönüyoruz.`,
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
      preheader: `Hesap #${ticket} hazır. Detaylı PDF birazdan inboxuna düşecek.`,
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
      preheader: `Ticket #${ticket} queued. Here\'s the summary.`,
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
      preheader: `Application #${ticket} queued. We\'ll reply within 5 business days.`,
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
      preheader: `Estimate #${ticket} ready. Detailed PDF inbound.`,
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

  // Form summary table — matches form-confirmation.jsx:51-69
  const detailRows = (params.details || []).map((d, i, arr) => `
    <tr>
      <td valign="top" style="width:110px;padding:12px 16px 12px 0;${i < arr.length - 1 ? `border-bottom:1px solid ${PULSE.n200};` : ''}">
        <div style="font-family:${FONTS.mono};font-size:11px;color:${PULSE.n500};letter-spacing:0.1em;text-transform:uppercase;padding-top:2px;">${escapeHtml(d.label)}</div>
      </td>
      <td valign="top" style="padding:12px 0;${i < arr.length - 1 ? `border-bottom:1px solid ${PULSE.n200};` : ''}">
        <div style="font-family:${FONTS.body};font-size:14px;color:${PULSE.graphite};line-height:1.55;">${escapeHtml(d.value)}</div>
      </td>
    </tr>
  `).join('');

  const filedAt = new Date().toLocaleString(isTr ? 'tr-TR' : 'en-US', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  });

  // Empty details guard — `detailRows` her zaman string (.join('') ile),
  // truthy. Asıl kontrol array length'i. Empty array'de orphan başlık
  // ("Form summary") render edilmez.
  const formCard = (params.details && params.details.length > 0) ? `
    <div style="border:1px solid ${PULSE.n200};border-radius:14px;overflow:hidden;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PULSE.n50};border-bottom:1px solid ${PULSE.n200};">
        <tr>
          <td style="padding:14px 20px;" valign="middle">${renderEyebrow(copy.formEyebrow)}</td>
          <td style="padding:14px 20px;" valign="middle" align="right"><span style="font-family:${FONTS.mono};font-size:11px;color:${PULSE.n500};">${filedAt}</span></td>
        </tr>
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:0;">
        <tbody>${detailRows}</tbody>
      </table>
    </div>
  ` : '';

  const sideCardA = `
    <div style="padding:18px;background:${PULSE.n50};border-radius:12px;height:100%;">
      ${renderEyebrow(copy.sideEyebrowA)}
      ${spacer(8)}
      ${renderP(copy.sideBodyA, { size: 13 })}
      ${spacer(10)}
      <a href="${sideHrefA}" style="font-size:13px;color:${PULSE.graphite};font-weight:500;border-bottom:1px solid ${PULSE.graphite};text-decoration:none;">${copy.sideCtaA}</a>
    </div>
  `;
  const sideCardB = `
    <div style="padding:18px;background:${PULSE.graphite};border-radius:12px;color:${PULSE.pure};height:100%;">
      ${renderEyebrow(copy.sideEyebrowB, PULSE.lime)}
      ${spacer(8)}
      ${renderP(copy.sideBodyB, { size: 13, color: PULSE.n300 })}
      ${spacer(10)}
      <a href="${sideHrefB}" style="font-size:13px;color:${PULSE.lime};font-weight:500;border-bottom:1px solid ${PULSE.lime};text-decoration:none;">${copy.sideCtaB}</a>
    </div>
  `;

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="padding:44px 40px 24px;text-align:center;">
          <div style="width:64px;height:64px;margin:0 auto 24px;border-radius:50%;background:${PULSE.limeSoft};text-align:center;line-height:64px;">
            <div style="display:inline-block;width:44px;height:44px;border-radius:50%;background:${PULSE.lime};text-align:center;line-height:44px;color:${PULSE.graphite};font-family:${FONTS.heading};font-size:22px;font-weight:600;vertical-align:middle;">✓</div>
          </div>
          ${renderEyebrow(`${copy.eyebrow.split(' · ')[0]} · #${ticket}`)}
          ${spacer(14)}
          <h1 class="bz-h1" style="font-family:${FONTS.heading};font-size:36px;font-weight:500;letter-spacing:-0.025em;line-height:1.1;color:${PULSE.graphite};margin:0;">
            ${copy.titleA}<span style="color:${PULSE.lime};">.</span> <span style="color:${PULSE.n500};">${copy.titleB}</span>
          </h1>
          ${spacer(14)}
          <div style="max-width:420px;margin:0 auto;">${renderP(copy.intro)}</div>
        </td>
      </tr>
      ${formCard ? `<tr><td class="bz-pad" style="padding:8px 40px;">${formCard}</td></tr>` : ''}
      <tr>
        <td class="bz-pad" style="padding:32px 40px 8px;">
          ${renderEyebrow(copy.timelineEyebrow)}
          ${spacer(16)}
          ${renderTimeline(copy.timeline)}
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:32px 40px 44px;">
          ${renderTwoColCards({ left: sideCardA, right: sideCardB })}
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
