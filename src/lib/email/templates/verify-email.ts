import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderButton, renderStatusPill, spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

export interface VerifyEmailParams {
  firstName?: string | null;
  verifyUrl: string;
}

export async function renderVerifyEmail(
  params: VerifyEmailParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const subject = isTr ? 'E-postanı onayla — Buaze' : 'Verify your email — Buaze';
  const preheader = isTr
    ? 'Linki 24 saat içinde kullan. Sen istemediysen, görmezden gel.'
    : 'Use the link within 24 hours. If you didn\'t request this, ignore.';

  // Display-friendly truncation of the verify URL (matches forgot-password pattern).
  const displayUrl = (() => {
    try {
      const u = new URL(params.verifyUrl);
      const tail = (u.searchParams.get('token') || u.searchParams.get('t') || '').slice(0, 24);
      return `${u.host}${u.pathname}?t=${tail || '••••'}`;
    } catch {
      return params.verifyUrl.slice(0, 80);
    }
  })();

  const inlineDefault = isTr ? {
    eyebrow: 'E-POSTA ONAYI',
    title: 'Hesabını birkaç',
    titleAccent: 'saniyede aç',
    intro: 'Merhaba <strong style="color:' + PULSE.graphite + ';font-weight:500;">${firstName}</strong>. Buaze hesabını oluşturduğun için teşekkürler. Devam edebilmek için aşağıdaki butonla e-posta adresini onayla. Bağlantı 24 saat geçerli.',
    cardEyebrow: 'Tek kullanımlık link',
    statusText: 'Aktif · 24 saat geçerli',
    cta: 'E-postamı onayla →',
    notYouTitle: 'Sen değil misin?',
    notYouBody: 'Bu maili görmezden gel. Hesap aktive edilmez, daha sonra otomatik silinir.',
  } : {
    eyebrow: 'EMAIL VERIFICATION',
    title: 'Activate your account',
    titleAccent: 'in seconds',
    intro: 'Hi <strong style="color:' + PULSE.graphite + ';font-weight:500;">${firstName}</strong>. Thanks for creating a Buaze account. To continue, confirm your email address with the button below. The link is valid for 24 hours.',
    cardEyebrow: 'One-time link',
    statusText: 'Active · 24h valid',
    cta: 'Verify my email →',
    notYouTitle: 'Not you?',
    notYouBody: 'Ignore this email. The account stays inactive and is removed automatically.',
  };

  const merged = await loadMailCopy('verify-email', locale, inlineDefault);
  const fallbackName = isTr ? 'merhaba' : 'hi';
  const vars = { firstName: params.firstName || fallbackName };
  const copy = deepSubstitute(merged, vars, 'html');
  const copyText = deepSubstitute(merged, vars, 'text');

  const verifyHrefSafe = escapeHtml(params.verifyUrl);
  const displayUrlSafe = escapeHtml(displayUrl);

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="padding:36px 40px 0;">
          ${renderEyebrow(copy.eyebrow)}
          ${spacer(18)}
          <h1 class="bz-h1-lg" style="font-family:${FONTS.heading};font-size:44px;font-weight:500;letter-spacing:-0.025em;line-height:1.1;color:${PULSE.graphite};margin:0;">
            ${copy.title}<br/>
            <span style="color:${PULSE.lime};">${copy.titleAccent}.</span>
          </h1>
          ${spacer(18)}
          <p style="font-family:${FONTS.body};font-size:16px;color:${PULSE.n800};line-height:1.6;margin:0;">${copy.intro}</p>
          ${spacer(28)}
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:0 40px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PULSE.n50};border:1px solid ${PULSE.n200};border-radius:14px;">
            <tr>
              <td style="padding:22px 24px 8px;">
                <div style="display:flex;align-items:center;justify-content:space-between;">
                  <span style="font-family:${FONTS.mono};font-size:11px;letter-spacing:0.18em;color:${PULSE.n600};text-transform:uppercase;">${copy.cardEyebrow}</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 14px;">
                <div style="font-family:${FONTS.mono};font-size:12px;color:${PULSE.n600};word-break:break-all;">${displayUrlSafe}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 22px;">
                ${renderStatusPill({ text: copy.statusText, dotColor: PULSE.lime, textColor: PULSE.graphite })}
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 24px;">
                ${renderButton({ href: verifyHrefSafe, label: copy.cta, size: 'lg' })}
              </td>
            </tr>
          </table>
          ${spacer(28)}
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:0 40px 40px;">
          <div style="border-top:1px solid ${PULSE.n200};padding-top:20px;">
            <div style="font-family:${FONTS.heading};font-size:14px;font-weight:500;color:${PULSE.graphite};letter-spacing:-0.01em;margin:0 0 6px;">${copy.notYouTitle}</div>
            <p style="font-family:${FONTS.body};font-size:13px;color:${PULSE.n600};line-height:1.6;margin:0;">${copy.notYouBody}</p>
          </div>
        </td>
      </tr>
    </table>
  `;

  const html = pulseLayout({
    subject,
    preheader,
    content,
    eyebrow: isTr ? 'E-posta onayı' : 'Email verification',
    footer: { locale },
  });

  const text = `${copyText.title} ${copyText.titleAccent}\n\n${copyText.intro.replace(/<[^>]+>/g, '')}\n\n${copyText.cta} ${params.verifyUrl}\n\n${copyText.notYouTitle}\n${copyText.notYouBody}`;

  return { subject, html, text };
}
