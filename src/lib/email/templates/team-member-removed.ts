// Wave B3 (CLAUDE.md §38.B) — team member removed confirmation.
//
// Fires from /api/team/[id] DELETE after an owner-initiated removal. Mail
// goes to the OWNER to confirm "this is what just happened, the session was
// revoked, here's the audit trail" (CLAUDE.md §37.2.A on UserSession revoke).
// Companion to Wave B2 (team-member-joined).

import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderButton, spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

export interface TeamMemberRemovedParams {
  ownerName?: string | null;
  /** Removed member display name. */
  memberName: string;
  /** Member's email for audit clarity. */
  memberEmail: string;
  /** Display label for the role they held. */
  roleLabel: string;
  /** Team admin page deeplink. */
  teamUrl: string;
}

export async function renderTeamMemberRemoved(
  params: TeamMemberRemovedParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const ownerName = params.ownerName ? escapeHtml(params.ownerName) : '';
  const memberName = escapeHtml(params.memberName);
  const memberEmail = escapeHtml(params.memberEmail);
  const roleLabel = escapeHtml(params.roleLabel);

  const subject = isTr
    ? `${params.memberName} ekipten ayrıldı`
    : `${params.memberName} was removed from your team`;
  const preheader = isTr
    ? 'Üyenin paneline erişimi kapatıldı. Yeni davet göndermek istersen ekip sekmesinden başla.'
    : 'Workspace access has been revoked. Send a fresh invite from the team tab if needed.';

  const inlineDefault = isTr ? {
    eyebrow: 'Ekip · Üye çıkarıldı',
    title: 'Bir üye',
    titleAccent: 'ayrıldı',
    intro: ownerName
      ? `Merhaba <span style="color:${PULSE.graphite};font-weight:500;">${ownerName}</span>, <strong>${memberName}</strong> ekipten çıkarıldı. Paneline erişimi anında kapatıldı.`
      : `<strong>${memberName}</strong> ekipten çıkarıldı. Paneline erişimi anında kapatıldı.`,
    cardEyebrow: 'Audit kaydı',
    nameLabel: 'İsim',
    emailLabel: 'E-posta',
    roleLabelKey: 'Rol',
    actionLabel: 'Aksiyon',
    actionValue: 'Erişim kapatıldı · Oturumlar sonlandırıldı',
    cta: 'Ekibi gör →',
    note: 'Bu işlemi sen yapmadıysan Hesabım → Audit log\'undan kaydı inceleyebilirsin.',
  } : {
    eyebrow: 'Team · Member removed',
    title: 'A teammate',
    titleAccent: 'has left',
    intro: ownerName
      ? `Hi <span style="color:${PULSE.graphite};font-weight:500;">${ownerName}</span>, <strong>${memberName}</strong> has been removed from your workspace. Their access was revoked instantly.`
      : `<strong>${memberName}</strong> has been removed from your workspace. Their access was revoked instantly.`,
    cardEyebrow: 'Audit record',
    nameLabel: 'Name',
    emailLabel: 'Email',
    roleLabelKey: 'Role',
    actionLabel: 'Action',
    actionValue: 'Access revoked · Sessions ended',
    cta: 'Open team →',
    note: 'If you didn\'t make this change, review the entry under Account → Audit log.',
  };

  const merged = await loadMailCopy('team-member-removed', locale, inlineDefault);
  const vars = { ownerName: params.ownerName || '', memberName: params.memberName };
  const copy = deepSubstitute(merged, vars, 'html') as typeof inlineDefault;
  const copyText = deepSubstitute(merged, vars, 'text') as typeof inlineDefault;

  const content = `
    ${renderEyebrow(copy.eyebrow)}
    ${spacer(16)}
    <h1 style="margin:0;font-family:${FONTS.heading};font-size:42px;line-height:1.05;letter-spacing:-0.03em;font-weight:500;color:${PULSE.graphite};">
      ${copy.title} <span style="color:${PULSE.n500};">${copy.titleAccent}</span>
    </h1>
    ${spacer(20)}
    <p style="margin:0;font-family:${FONTS.body};font-size:15px;line-height:1.6;color:${PULSE.n600};">
      ${copy.intro}
    </p>
    ${spacer(28)}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${PULSE.n50};border:1px solid ${PULSE.n200};border-radius:18px;">
      <tr>
        <td style="padding:24px;">
          <div style="font-family:${FONTS.mono};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${PULSE.n500};">
            ${copy.cardEyebrow}
          </div>
          ${spacer(14)}
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td valign="top" style="padding-bottom:12px;">
                <div style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${PULSE.n500};">${copy.nameLabel}</div>
                <div style="margin-top:4px;font-family:${FONTS.heading};font-size:18px;font-weight:500;color:${PULSE.graphite};">${memberName}</div>
              </td>
            </tr>
            <tr>
              <td valign="top" style="padding-bottom:12px;">
                <div style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${PULSE.n500};">${copy.emailLabel}</div>
                <div style="margin-top:4px;font-family:${FONTS.mono};font-size:13px;color:${PULSE.graphite};">${memberEmail}</div>
              </td>
            </tr>
            <tr>
              <td valign="top" style="padding-bottom:12px;">
                <div style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${PULSE.n500};">${copy.roleLabelKey}</div>
                <div style="margin-top:4px;font-family:${FONTS.body};font-size:14px;color:${PULSE.graphite};">${roleLabel}</div>
              </td>
            </tr>
            <tr>
              <td valign="top">
                <div style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${PULSE.n500};">${copy.actionLabel}</div>
                <div style="margin-top:4px;font-family:${FONTS.body};font-size:13px;color:${PULSE.graphite};">${copy.actionValue}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    ${spacer(28)}
    ${renderButton({ href: params.teamUrl, label: copy.cta, variant: 'dark' })}
    ${spacer(20)}
    <p style="margin:0;font-family:${FONTS.body};font-size:12.5px;line-height:1.55;color:${PULSE.n500};">
      ${copy.note}
    </p>
  `;

  const html = pulseLayout({ subject, preheader, content });

  const text = [
    copyText.eyebrow,
    '',
    `${copy.title} ${copy.titleAccent}`,
    '',
    copyText.intro.replace(/<[^>]*>/g, ''),
    '',
    `${copy.cardEyebrow}:`,
    `  ${copy.nameLabel}: ${params.memberName}`,
    `  ${copy.emailLabel}: ${params.memberEmail}`,
    `  ${copy.roleLabelKey}: ${params.roleLabel}`,
    `  ${copy.actionLabel}: ${copyText.actionValue}`,
    '',
    `${copy.cta} ${params.teamUrl}`,
    '',
    copyText.note,
  ].join('\n');

  return { subject, html, text };
}
