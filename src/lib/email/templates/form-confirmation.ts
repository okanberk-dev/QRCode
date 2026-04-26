import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderH1, renderP, renderButton, spacer } from '../components';

export type FormType = 'contact' | 'career' | 'roi' | 'newsletter';

export interface FormConfirmationParams {
  formType: FormType;
  name?: string | null;
  details?: Array<{ label: string; value: string }>;
  followUpUrl?: string;
}

export function renderFormConfirmation(params: FormConfirmationParams, locale: 'tr' | 'en' = 'tr'): { subject: string; html: string; text: string } {
  const isTr = locale !== 'en';
  const name = params.name ? escapeHtml(params.name).split(' ')[0] : (isTr ? 'merhaba' : 'hi');

  const FORM_COPY = isTr ? {
    contact: {
      subject: 'Mesajını aldık — yanıt 24 saat içinde',
      preheader: 'İletişim formundan gelen taleplere işletme saatleri içinde dönüyoruz.',
      eyebrow: 'Form · İletişim',
      title: 'Aldık.',
      intro: 'Mesajını ekibimize ilettik. İlgili kişi 24 saat içinde sana yanıt yazacak.',
      timelineHeading: 'Sıradaki adımlar',
      timeline: [
        ['Şimdi', 'Mesajın bize ulaştı'],
        ['1 saat içinde', 'Doğru kişiye yönlendirildi'],
        ['24 saat içinde', 'Yanıt geliyor'],
      ] as Array<[string, string]>,
      cta: 'Buaze ürün sayfasına dön',
    },
    career: {
      subject: 'Başvurun bize ulaştı',
      preheader: 'Buaze HR ekibi başvurunu inceleyip 5 iş günü içinde dönecek.',
      eyebrow: 'Form · Kariyer',
      title: `${name}, başvurun aramızda.`,
      intro: 'Başvurunu aldık ve uygun ekipler arasında dağıttık. 5 iş günü içinde sana yazıyor olacağız — uygun bir pozisyon yoksa bile mutlaka bilgi vereceğiz.',
      timelineHeading: 'Süreç',
      timeline: [
        ['1. gün', 'CV inceleme'],
        ['3. gün', 'İlk görüşme daveti (uygunsa)'],
        ['5. gün', 'Sonuç bildirimi'],
      ] as Array<[string, string]>,
      cta: 'Açık pozisyonları gör →',
    },
    roi: {
      subject: 'ROI hesaplamanı kaydettik',
      preheader: 'Tahmini gelir etkisi ve önerilerin ekibimize iletildi.',
      eyebrow: 'Form · ROI hesaplama',
      title: 'Hesabını yaptık.',
      intro: 'Verdiğin bilgilerle aylık potansiyel etkiyi hesapladık. Detaylı raporu ve sektör karşılaştırmasını e-posta ile sana ulaştırıyor olacağız.',
      timelineHeading: 'Sıradaki adımlar',
      timeline: [
        ['Şimdi', 'Hesaplama kaydedildi'],
        ['2 saat içinde', 'Detaylı PDF raporu hazır'],
        ['1 gün içinde', 'Demo daveti gönderiyoruz'],
      ] as Array<[string, string]>,
      cta: 'Şimdi bir demo seç →',
    },
    newsletter: {
      subject: 'Aboneliğin aktif',
      preheader: 'Pulse bülteni her ayın 1\'inde mailine düşecek.',
      eyebrow: 'Form · Bülten',
      title: 'Aramızdasın.',
      intro: 'Aboneliğini aktive ettik. Pulse bülteni her ayın 1\'inde — vakalar, sektör verileri, ürün haberleri.',
      timelineHeading: 'Ne bekleyeceksin?',
      timeline: [
        ['Her ayın 1\'i', 'Pulse aylık bülten'],
        ['Ara sıra', 'Önemli ürün duyuruları'],
        ['Hiçbir zaman', 'Spam veya 3. taraf paylaşım'],
      ] as Array<[string, string]>,
      cta: 'Buaze\'i keşfet →',
    },
  } : {
    contact: {
      subject: 'Got your message — we\'ll reply within 24h',
      preheader: 'We respond to contact form requests within business hours.',
      eyebrow: 'Form · Contact',
      title: 'Got it.',
      intro: 'Your message reached our team. The right person will reply within 24 hours.',
      timelineHeading: 'What happens next',
      timeline: [
        ['Now', 'Your message arrived'],
        ['Within 1 hour', 'Routed to the right person'],
        ['Within 24 hours', 'Reply on its way'],
      ] as Array<[string, string]>,
      cta: 'Back to Buaze →',
    },
    career: {
      subject: 'Your application reached us',
      preheader: 'Our HR team will review and respond within 5 business days.',
      eyebrow: 'Form · Careers',
      title: `${name}, you\'re in the loop.`,
      intro: 'We received your application and routed it to the relevant teams. We\'ll reach out within 5 business days — even if there\'s no fit, you\'ll hear from us.',
      timelineHeading: 'Process',
      timeline: [
        ['Day 1', 'Resume review'],
        ['Day 3', 'First interview invite (if matching)'],
        ['Day 5', 'Final decision'],
      ] as Array<[string, string]>,
      cta: 'See open roles →',
    },
    roi: {
      subject: 'We saved your ROI estimate',
      preheader: 'Your estimated revenue impact and recommendations are with our team.',
      eyebrow: 'Form · ROI calculator',
      title: 'Crunched the numbers.',
      intro: 'Based on your inputs we estimated monthly potential impact. We\'ll send a detailed PDF report and sector benchmark to your inbox.',
      timelineHeading: 'What happens next',
      timeline: [
        ['Now', 'Estimate saved'],
        ['Within 2 hours', 'Detailed PDF ready'],
        ['Within 1 day', 'Demo invitation sent'],
      ] as Array<[string, string]>,
      cta: 'Pick a demo slot →',
    },
    newsletter: {
      subject: 'Subscription active',
      preheader: 'The Pulse newsletter lands on the 1st of every month.',
      eyebrow: 'Form · Newsletter',
      title: 'You\'re in.',
      intro: 'Your subscription is live. Pulse hits your inbox on the 1st of every month — cases, sector data, product news.',
      timelineHeading: 'What to expect',
      timeline: [
        ['1st of each month', 'Pulse monthly digest'],
        ['Occasionally', 'Major product news'],
        ['Never', 'Spam or 3rd-party sharing'],
      ] as Array<[string, string]>,
      cta: 'Explore Buaze →',
    },
  };

  const copy = FORM_COPY[params.formType];
  const followUpUrl = params.followUpUrl || (process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com');

  const detailsRows = (params.details || []).map((d) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid ${PULSE.n200};font-size:13px;color:${PULSE.n500};">${escapeHtml(d.label)}</td>
      <td align="right" style="padding:8px 0;border-bottom:1px solid ${PULSE.n200};font-size:13px;font-weight:600;color:${PULSE.graphite};">${escapeHtml(d.value)}</td>
    </tr>
  `).join('');

  const timelineRows = copy.timeline.map((t, i) => `
    <tr>
      <td valign="top" style="padding:10px 0;width:120px;font-family:${FONTS.mono};font-size:11px;letter-spacing:0.12em;color:${i === 0 ? PULSE.graphite : PULSE.n500};text-transform:uppercase;">${t[0]}</td>
      <td valign="top" style="padding:10px 0;border-top:${i === 0 ? 'none' : `1px solid ${PULSE.n200}`};font-family:${FONTS.body};font-size:14px;color:${PULSE.graphite};">${t[1]}</td>
    </tr>
  `).join('');

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="padding:40px 40px 32px;">
          ${renderEyebrow(copy.eyebrow)}
          ${spacer(14)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td valign="middle" style="width:46px;">
                <div style="width:40px;height:40px;border-radius:50%;background:${PULSE.lime};text-align:center;line-height:40px;">
                  <span style="font-family:${FONTS.heading};font-size:22px;font-weight:600;color:${PULSE.graphite};">✓</span>
                </div>
              </td>
              <td valign="middle">${renderH1(copy.title, { size: 36 })}</td>
            </tr>
          </table>
          ${spacer(16)}
          ${renderP(copy.intro)}
        </td>
      </tr>
      ${detailsRows ? `
      <tr>
        <td class="bz-pad" style="padding:0 40px 24px;">
          <div style="background:${PULSE.n50};border:1px solid ${PULSE.n200};border-radius:14px;padding:20px 24px;">
            ${renderEyebrow(isTr ? 'Form özeti' : 'Form summary')}
            ${spacer(10)}
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${detailsRows}</table>
          </div>
        </td>
      </tr>` : ''}
      <tr>
        <td class="bz-pad" style="padding:0 40px 24px;">
          ${renderEyebrow(copy.timelineHeading)}
          ${spacer(10)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${timelineRows}</table>
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:0 40px 40px;">
          ${renderButton({ href: followUpUrl, label: copy.cta, size: 'md' })}
        </td>
      </tr>
    </table>
  `;

  const html = pulseLayout({ subject: copy.subject, preheader: copy.preheader, content, eyebrow: isTr ? 'Onay' : 'Confirmation', footer: { locale } });
  const text = `${copy.title}\n\n${copy.intro}\n\n${copy.timelineHeading}:\n` + copy.timeline.map((t) => `· ${t[0]} — ${t[1]}`).join('\n');
  return { subject: copy.subject, html, text };
}
