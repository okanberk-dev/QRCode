/**
 * Buaze customer account mails (CLAUDE.md §61): e-mail confirmation and
 * password reset. Render-only (no DB copy); transactional, sent only for the
 * action the customer just took.
 */
import { PULSE } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderButton, renderEyebrow, renderH1, renderP, spacer } from '../components';

interface Rendered {
  subject: string;
  html: string;
  text: string;
}

function wrap(args: {
  locale: 'tr' | 'en';
  subject: string;
  preheader: string;
  eyebrow: string;
  title: string;
  lines: string[];
  button: { href: string; label: string };
  footnote: string;
}): Rendered {
  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="padding:40px 40px 44px;">
          ${renderEyebrow(escapeHtml(args.eyebrow))}
          ${spacer(12)}
          ${renderH1(escapeHtml(args.title))}
          ${spacer(18)}
          ${args.lines.map((l) => renderP(escapeHtml(l))).join(spacer(8))}
          ${spacer(24)}
          ${renderButton({ href: escapeHtml(args.button.href), label: escapeHtml(args.button.label), variant: 'lime', size: 'lg' })}
          ${spacer(24)}
          ${renderP(escapeHtml(args.footnote), { size: 13, color: PULSE.n500 })}
        </td>
      </tr>
    </table>`;
  const html = pulseLayout({
    subject: escapeHtml(args.subject),
    preheader: escapeHtml(args.preheader),
    content,
    eyebrow: args.eyebrow,
    footer: { locale: args.locale, unsubText: args.locale === 'tr' ? 'Bu e-posta hesap işleminiz için gönderildi.' : 'This e-mail was sent for your account action.' },
  });
  const text = [...args.lines, '', `${args.button.label}: ${args.button.href}`, '', args.footnote].join('\n');
  return { subject: args.subject, html, text };
}

export function renderCustomerVerifyMail(
  p: { firstName: string; url: string },
  locale: 'tr' | 'en' = 'tr',
): Rendered {
  const tr = locale !== 'en';
  return wrap({
    locale,
    subject: tr ? 'Buaze hesabınızı onaylayın' : 'Confirm your Buaze account',
    preheader: tr ? 'E-posta adresinizi tek tıkla onaylayın.' : 'Confirm your e-mail address in one click.',
    eyebrow: tr ? 'Buaze müşteri hesabı' : 'Buaze customer account',
    title: tr ? `Hoş geldiniz, ${p.firstName}.` : `Welcome, ${p.firstName}.`,
    lines: tr
      ? [
          'Buaze hesabınızla katıldığınız işletmelerin sadakat kartlarını tek yerden görebilirsiniz.',
          'Hesabınızı korumak için e-posta adresinizi onaylayın.',
        ]
      : [
          'With your Buaze account you see the loyalty cards of every business you join in one place.',
          'Confirm your e-mail address to keep your account safe.',
        ],
    button: { href: p.url, label: tr ? 'E-postamı onayla' : 'Confirm my e-mail' },
    footnote: tr
      ? 'Bağlantı 7 gün geçerlidir. Bu hesabı siz açmadıysanız bu e-postayı yok sayabilirsiniz.'
      : 'The link is valid for 7 days. If you did not create this account, ignore this e-mail.',
  });
}

export function renderCustomerResetMail(
  p: { firstName: string; url: string },
  locale: 'tr' | 'en' = 'tr',
): Rendered {
  const tr = locale !== 'en';
  return wrap({
    locale,
    subject: tr ? 'Buaze şifrenizi sıfırlayın' : 'Reset your Buaze password',
    preheader: tr ? 'Şifre sıfırlama bağlantınız 30 dakika geçerli.' : 'Your reset link is valid for 30 minutes.',
    eyebrow: tr ? 'Şifre sıfırlama' : 'Password reset',
    title: tr ? `Merhaba ${p.firstName},` : `Hi ${p.firstName},`,
    lines: tr
      ? ['Buaze müşteri hesabınız için şifre sıfırlama istendi. Yeni şifrenizi belirlemek için düğmeyi kullanın.']
      : ['A password reset was requested for your Buaze customer account. Use the button to set a new password.'],
    button: { href: p.url, label: tr ? 'Yeni şifre belirle' : 'Set a new password' },
    footnote: tr
      ? 'Bağlantı 30 dakika geçerlidir ve bir kez kullanılabilir. İsteği siz yapmadıysanız şifreniz değişmez; bu e-postayı yok sayabilirsiniz.'
      : 'The link works once, for 30 minutes. If you did not ask for this, your password stays the same.',
  });
}
