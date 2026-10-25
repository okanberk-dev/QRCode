// Wave B3 (CLAUDE.md §38.B) — team member removed confirmation.
//
// Fires from /api/team/[id] DELETE after an owner-initiated removal. Mail
// goes to the OWNER to confirm "this is what just happened, the session was
// revoked, here's the audit trail" (CLAUDE.md §37.2.A on UserSession revoke).
// Companion to Wave B2 (team-member-joined).

import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderH1, renderP, renderButton, spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';
import { teamContent, teamCard, teamRow, teamRoleChip, teamPerson } from './team-mail-parts';

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

  const accent = `<span style="color:${PULSE.n500};">${copy.titleAccent}</span>`;

  const content = teamContent(`
    ${renderEyebrow(copy.eyebrow)}
    ${spacer(14)}
    ${renderH1(`${copy.title} ${accent}`, { size: 44 })}
    ${spacer(18)}
    ${renderP(copy.intro)}
    ${spacer(26)}
    ${teamCard(
      'neutral',
      copy.cardEyebrow,
      teamRow('neutral', copy.nameLabel, teamPerson('neutral', params.memberName, memberName), { first: true }) +
        teamRow(
          'neutral',
          copy.emailLabel,
          `<div class="bz-break" style="font-family:${FONTS.body};font-size:14px;font-weight:500;line-height:1.5;color:${PULSE.graphite};">${memberEmail}</div>`,
        ) +
        teamRow('neutral', copy.roleLabelKey, teamRoleChip('neutral', roleLabel)) +
        teamRow(
          'neutral',
          copy.actionLabel,
          `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
            <td valign="top" width="18" style="width:18px;padding:7px 0 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="8" height="8" style="width:8px;height:8px;background:${PULSE.danger};border-radius:4px;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td>
            <td valign="top" style="font-family:${FONTS.body};font-size:14px;font-weight:500;line-height:1.5;color:${PULSE.graphite};">${copy.actionValue}</td>
          </tr></table>`,
          { last: true },
        ),
    )}
    ${spacer(28)}
    ${renderButton({ href: escapeHtml(params.teamUrl), label: copy.cta, variant: 'dark' })}
    ${spacer(20)}
    ${renderP(copy.note, { color: PULSE.n500, size: 13 })}
  `);

  // <title> and the hidden preheader are raw-HTML sinks in pulseLayout; the
  // member name / role label are user text, so both get escaped here.
  const html = pulseLayout({ subject: escapeHtml(subject), preheader: escapeHtml(preheader), content, footer: { locale } });

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
