// Wave B2 (CLAUDE.md §38.B) — team member accept confirmation.
//
// Fires from /api/team/accept-invite POST after an invitee successfully
// activates their TeamMember row. The mail goes to the OWNER (not the
// joining member), so the owner has a visibility trail of who joined and
// when.

import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderH1, renderP, renderButton, spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';
import { teamContent, teamCard, teamRow, teamRoleChip, teamPerson, teamBulletList } from './team-mail-parts';

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
  const locationsHtml = allLocations
    ? `<div style="font-family:${FONTS.body};font-size:14px;font-weight:500;line-height:1.5;color:${PULSE.graphite};">${isTr ? 'Tüm konumlar' : 'All locations'}</div>`
    : teamBulletList((params.locationNames ?? []).map(escapeHtml), PULSE.graphite);

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

  // margin-top: when the chip wraps onto its own line on a narrow phone it would
  // sit flush under the first line (Poppins' tall line box); this adds the gap.
  const accent = `<span style="display:inline-block;margin-top:6px;background:${PULSE.lime};color:${PULSE.graphite};padding:0 10px;border-radius:8px;">${copy.titleAccent}</span>`;

  const content = teamContent(`
    ${renderEyebrow(copy.eyebrow)}
    ${spacer(14)}
    ${renderH1(`${copy.title} ${accent}`, { size: 44 })}
    ${spacer(18)}
    ${renderP(copy.intro)}
    ${spacer(26)}
    ${teamCard(
      'lime',
      copy.cardEyebrow,
      teamRow('lime', copy.nameLabel, teamPerson('lime', params.memberName, memberName), { first: true }) +
        teamRow('lime', copy.roleLabelKey, teamRoleChip('lime', roleLabel)) +
        teamRow('lime', copy.locationsLabel, locationsHtml, { last: true }),
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
    `  ${copy.roleLabelKey}: ${params.roleLabel}`,
    `  ${copy.locationsLabel}: ${allLocations ? (isTr ? 'Tüm konumlar' : 'All locations') : (params.locationNames ?? []).join(' · ')}`,
    '',
    `${copy.cta} ${params.teamUrl}`,
    '',
    copyText.note,
  ].join('\n');

  return { subject, html, text };
}
