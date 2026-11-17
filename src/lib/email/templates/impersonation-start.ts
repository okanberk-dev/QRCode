// Impersonation start notice (CLAUDE.md §38.96 KVKK transparency).
//
// Fires from sendImpersonationStartEmail when a Buaze admin opens a support
// session on an owner's account. Render-only (like contact-admin /
// owner-segment-mail): no DB-driven copy, not part of SUPPORTED_MAIL_KEYS.
// Visual language follows the other security notices (password-changed,
// data-export-confirmation): status pill, key-facts card, "didn't expect this?" card.
//
// All admin-supplied strings (username, reason, recipient name) are escaped
// here; callers pass the raw, CRLF-stripped values.

import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderP, spacer } from '../components';
import { formatFullDateTimeInTimeZone } from '@/lib/timezone';
import {
  securityContent,
  securityHero,
  securityCard,
  securityMetaGrid,
  securityNotYou,
} from './security-mail-parts';

export interface ImpersonationStartParams {
  recipientName?: string | null;
  adminUsername: string;
  reason: string;
  endsAt: Date;
}

const SUPPORT_EMAIL = 'support@buaze.com';

/** Left-ruled quiet paragraph — the KVKK / GDPR transparency line. */
function transparencyNote(eyebrow: string, body: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="border-left:3px solid ${PULSE.n300};padding:2px 0 2px 16px;">
          ${renderEyebrow(eyebrow, PULSE.n500)}
          ${spacer(8)}
          ${renderP(body, { size: 13, color: PULSE.n600 })}
        </td>
      </tr>
    </table>
  `;
}

/** "25 Ekim 2026 14:30" / "October 25, 2026 02:30 PM" → date and time each kept
 *  whole (nowrap, NBSP before AM/PM) so a narrow card breaks only between them
 *  instead of orphaning "PM" on its own line. */
function endsAtHtml(label: string): string {
  const m = label.match(/^(.*?)\s+(\d{1,2}:\d{2}(?:\s*[AaPp]\.?[Mm]\.?)?)$/);
  if (!m) return escapeHtml(label);
  const time = m[2].replace(/\s+/g, '\u00A0');
  return `<span style="white-space:nowrap;">${escapeHtml(m[1])}</span> <span style="white-space:nowrap;">${escapeHtml(time)}</span>`;
}

export function renderImpersonationStart(
  params: ImpersonationStartParams,
  locale: 'tr' | 'en' = 'tr',
): { subject: string; html: string; text: string } {
  const isTr = locale !== 'en';
  const name = params.recipientName?.trim() ? params.recipientName.trim() : null;
  const nameHtml = name ? escapeHtml(name) : null;
  const adminHtml = escapeHtml(params.adminUsername);
  const reasonHtml = escapeHtml(params.reason);
  const endsAtLabel = formatFullDateTimeInTimeZone(params.endsAt, locale);

  const subject = isTr
    ? '[Buaze] Hesabınıza destek erişimi açıldı'
    : '[Buaze] An admin opened a support session on your account';
  const preheader = isTr
    ? 'Bir Buaze yöneticisi 30 dakikalık destek oturumu açtı. Bu erişimi bilmiyorsanız hemen bize ulaşın.'
    : 'A Buaze admin opened a 30-minute support session. If you did not expect this, contact us right away.';

  const copy = isTr
    ? {
        eyebrow: 'Güvenlik · Destek erişimi',
        title: 'Hesabınıza destek erişimi',
        accent: 'açıldı',
        intro: nameHtml
          ? `Merhaba <strong style="color:${PULSE.graphite};font-weight:600;">${nameHtml}</strong>, bir Buaze yöneticisi (<strong style="color:${PULSE.graphite};font-weight:600;">${adminHtml}</strong>) hesabınızda 30 dakikalık bir destek oturumu açtı.`
          : `Merhaba, bir Buaze yöneticisi (<strong style="color:${PULSE.graphite};font-weight:600;">${adminHtml}</strong>) hesabınızda 30 dakikalık bir destek oturumu açtı.`,
        cardEyebrow: 'Oturum detayı',
        pill: 'Aktif destek oturumu · 30 dk',
        metaAdmin: 'Yönetici',
        metaDuration: 'Süre',
        metaDurationValue: '30 dakika',
        metaEnds: 'Oturum bitiş',
        metaEndsNote: 'Otomatik kapanır',
        metaReason: 'Sebep',
        transparencyEyebrow: 'Şeffaflık · KVKK / GDPR',
        transparency:
          'Bu bildirim KVKK / GDPR şeffaflık disiplinin bir parçasıdır — bir yönetici hesabınız üzerinden işlem yaptığında her zaman size haber veririz. Bu oturumdaki tüm işlemler denetim kaydına alınır; yönetici yalnızca destek talebiniz kapsamında işlem yapar.',
        notYouTitle: 'Bu erişimi bilmiyor musunuz?',
        notYouBody: `Hemen <a href="mailto:${SUPPORT_EMAIL}" style="color:${PULSE.n700};font-weight:600;text-decoration:underline;">${SUPPORT_EMAIL}</a> adresinden bize ulaşın.`,
        signoff: '— Buaze Ekibi',
      }
    : {
        eyebrow: 'Security · Support access',
        title: 'A support session was',
        accent: 'opened on your account',
        intro: nameHtml
          ? `Hi <strong style="color:${PULSE.graphite};font-weight:600;">${nameHtml}</strong>, a Buaze admin (<strong style="color:${PULSE.graphite};font-weight:600;">${adminHtml}</strong>) just opened a 30-minute support session on your account.`
          : `Hi there, a Buaze admin (<strong style="color:${PULSE.graphite};font-weight:600;">${adminHtml}</strong>) just opened a 30-minute support session on your account.`,
        cardEyebrow: 'Session detail',
        pill: 'Active support session · 30 min',
        metaAdmin: 'Admin',
        metaDuration: 'Duration',
        metaDurationValue: '30 minutes',
        metaEnds: 'Session ends at',
        metaEndsNote: 'Auto-revoke',
        metaReason: 'Reason',
        transparencyEyebrow: 'Transparency · KVKK / GDPR',
        transparency:
          'This is part of KVKK / GDPR transparency — we always notify you when an admin acts on your behalf. Every action taken during this session is recorded in the audit log, and the admin acts only within the scope of your support request.',
        notYouTitle: "Didn't expect this?",
        notYouBody: `Contact our support team immediately at <a href="mailto:${SUPPORT_EMAIL}" style="color:${PULSE.n700};font-weight:600;text-decoration:underline;">${SUPPORT_EMAIL}</a>.`,
        signoff: '— Buaze Team',
      };

  const endsValue = `${endsAtHtml(endsAtLabel)}<div style="font-family:${FONTS.body};font-size:12px;font-weight:400;letter-spacing:0;line-height:1.5;color:${PULSE.n500};margin-top:3px;">${copy.metaEndsNote}</div>`;

  const content = securityContent(`
    ${securityHero({
      eyebrow: copy.eyebrow,
      eyebrowColor: '#B45309',
      title: copy.title,
      accent: copy.accent,
      accentColor: '#D97706',
      breakBeforeAccent: true,
      intro: copy.intro,
    })}
    ${spacer(28)}
    ${securityCard({
      tone: 'neutral',
      eyebrow: copy.cardEyebrow,
      pill: { text: copy.pill, dotColor: PULSE.warning, bgColor: '#FFFBEB' },
      body: securityMetaGrid([
        { label: copy.metaAdmin, value: adminHtml, breakable: true },
        { label: copy.metaDuration, value: copy.metaDurationValue, strong: true },
        { label: copy.metaEnds, value: endsValue, strong: true, full: true },
        // Prose, not a token: wrap on word boundaries (break-all would split words
        // mid-letter); overflow-wrap still lets a pasted URL break instead of growing the shell.
        { label: copy.metaReason, value: `<span style="overflow-wrap:anywhere;word-break:normal;">${reasonHtml}</span>`, full: true },
      ]),
    })}
    ${spacer(24)}
    ${transparencyNote(copy.transparencyEyebrow, copy.transparency)}
    ${spacer(24)}
    ${securityNotYou({
      tone: 'danger',
      title: copy.notYouTitle,
      body: copy.notYouBody,
    })}
    ${spacer(24)}
    ${renderP(copy.signoff, { size: 13, color: PULSE.n500 })}
  `);

  const html = pulseLayout({ subject: escapeHtml(subject), preheader: escapeHtml(preheader), content, footer: { locale } });

  const greeting = name ? (isTr ? `Merhaba ${name},` : `Hi ${name},`) : isTr ? 'Merhaba,' : 'Hi there,';
  const text = isTr
    ? `${greeting}

Bir Buaze yöneticisi (${params.adminUsername}) hesabınızda 30 dakikalık bir destek
oturumu açtı.

Sebep: ${params.reason}
Oturum bitiş: ${endsAtLabel} (otomatik kapanır).

KVKK / GDPR şeffaflık. Bu oturumdaki tüm işlemler denetim kaydına alınır;
yönetici yalnızca destek talebiniz kapsamında işlem yapar. Bu erişimi
bilmiyorsanız ${SUPPORT_EMAIL} adresinden bize ulaşın.

${copy.signoff}`
    : `${greeting}

A Buaze admin (${params.adminUsername}) just opened a 30-minute support session on
your account.

Reason: ${params.reason}
Session ends at: ${endsAtLabel} (auto-revoke).

This is part of KVKK / GDPR transparency. Every action taken during this
session is recorded in the audit log, and the admin acts only within the scope
of your support request. If you didn't expect this contact ${SUPPORT_EMAIL}
immediately.

${copy.signoff}`;

  return { subject, html, text };
}
