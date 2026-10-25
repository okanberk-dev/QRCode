// Wave B2 (CLAUDE.md §38.B) — team member accept confirmation.
//
// Fires from /api/team/accept-invite POST after an invitee successfully
// activates their TeamMember row. The mail goes to the OWNER (not the
// joining member), so the owner has a visibility trail of who joined and
// when. Companion to Wave B3 (team-member-removed).

import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderButton, spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

export interface TeamMemberJoinedParams {
  /** Owner first name — addressed in the salutation. */
  ownerName?: string | null;
  /** Joined member display name (or email if name absent). */
  memberName: string;
  /** Display label for the role (TR/EN handled by caller — owner / manager / staff / viewer). */
  roleLabel: string;
  /** Restaurant names the member has access to; null/empty → full workspace. */
  locationNames: string[] | null;
  /** Team admin page deeplink. */
  teamUrl: string;
}

export async function renderTeamMemberJoined(
  params: TeamMemberJoinedParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const ownerName = params.ownerName ? escapeHtml(params.ownerName) : '';
  const memberName = escapeHtml(params.memberName);
  const roleLabel = escapeHtml(params.roleLabel);

  const subject = isTr
    ? `${params.memberName} ekibine katıldı`
    : `${params.memberName} joined your team`;
  const preheader = isTr
    ? `Yeni üye paneline erişim sağladı — ${params.roleLabel} rolüyle.`
    : `New teammate is now in your workspace — ${params.roleLabel}.`;

  const allLocations = !params.locationNames || params.locationNames.length === 0;
  const locationsLine = allLocations
    ? (isTr ? 'Tüm konumlar' : 'All locations')
    : (params.locationNames ?? []).map(escapeHtml).join(' · ');

  const inlineDefault = isTr ? {
    eyebrow: 'Ekip · Yeni üye',
    title: 'Ekibin',
    titleAccent: 'genişledi',
    intro: ownerName
      ? `Merhaba <span style="color:${PULSE.graphite};font-weight:500;">${ownerName}</span>, davet ettiğin <strong>${memberName}</strong> ekibine katıldı.`
      : `Davet ettiğin <strong>${memberName}</strong> ekibine katıldı.`,
    cardEyebrow: 'Yeni üye detayı',
    nameLabel: 'İsim',
    roleLabelKey: 'Rol',
    locationsLabel: 'Erişim',
    cta: 'Ekibi gör →',
    note: 'Bu üyenin yetkilerini istediğin zaman Hesabım → Ekip sekmesinden güncelleyebilirsin.',
  } : {
    eyebrow: 'Team · New member',
    title: 'Your team',
    titleAccent: 'just grew',
    intro: ownerName
      ? `Hi <span style="color:${PULSE.graphite};font-weight:500;">${ownerName}</span>, <strong>${memberName}</strong> accepted your invite and joined the workspace.`
      : `<strong>${memberName}</strong> accepted your invite and joined the workspace.`,
    cardEyebrow: 'Member detail',
    nameLabel: 'Name',
    roleLabelKey: 'Role',
    locationsLabel: 'Access',
    cta: 'Open team →',
    note: 'You can update this member\'s permissions anytime under Account → Team.',
  };

  const merged = await loadMailCopy('team-member-joined', locale, inlineDefault);
  const vars = { ownerName: params.ownerName || '', memberName: params.memberName };
  const copy = deepSubstitute(merged, vars, 'html') as typeof inlineDefault;
  const copyText = deepSubstitute(merged, vars, 'text') as typeof inlineDefault;

  const content = `
    ${renderEyebrow(copy.eyebrow)}
    ${spacer(16)}
    <h1 style="margin:0;font-family:${FONTS.heading};font-size:42px;line-height:1.05;letter-spacing:-0.03em;font-weight:500;color:${PULSE.graphite};">
      ${copy.title} <span style="color:${PULSE.limeDeep};">${copy.titleAccent}</span>
    </h1>
    ${spacer(20)}
    <p style="margin:0;font-family:${FONTS.body};font-size:15px;line-height:1.6;color:${PULSE.n600};">
      ${copy.intro}
    </p>
    ${spacer(28)}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${PULSE.limeSoft};border:1px solid ${PULSE.lime};border-radius:18px;">
      <tr>
        <td style="padding:24px;">
          <div style="font-family:${FONTS.label};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${PULSE.n600};">
            ${copy.cardEyebrow}
          </div>
          ${spacer(14)}
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td valign="top" style="padding-bottom:12px;">
                <div style="font-family:${FONTS.label};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${PULSE.n600};">${copy.nameLabel}</div>
                <div style="margin-top:4px;font-family:${FONTS.heading};font-size:18px;font-weight:500;color:${PULSE.graphite};">${memberName}</div>
              </td>
            </tr>
            <tr>
              <td valign="top" style="padding-bottom:12px;">
                <div style="font-family:${FONTS.label};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${PULSE.n600};">${copy.roleLabelKey}</div>
                <div style="margin-top:4px;font-family:${FONTS.body};font-size:14px;color:${PULSE.graphite};">${roleLabel}</div>
              </td>
            </tr>
            <tr>
              <td valign="top">
                <div style="font-family:${FONTS.label};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${PULSE.n600};">${copy.locationsLabel}</div>
                <div style="margin-top:4px;font-family:${FONTS.body};font-size:14px;color:${PULSE.graphite};">${locationsLine}</div>
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
    `  ${copy.roleLabelKey}: ${params.roleLabel}`,
    `  ${copy.locationsLabel}: ${allLocations ? (isTr ? 'Tüm konumlar' : 'All locations') : (params.locationNames ?? []).join(' · ')}`,
    '',
    `${copy.cta} ${params.teamUrl}`,
    '',
    copyText.note,
  ].join('\n');

  return { subject, html, text };
}
