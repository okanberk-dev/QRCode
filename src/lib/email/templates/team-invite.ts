import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { renderEyebrow, renderH1, renderP, renderButton, spacer } from '../components';
import { escapeHtml } from '../escape';
import { teamContent, teamCard, teamRow, teamRoleChip, teamBulletList } from './team-mail-parts';

export interface TeamInviteParams {
  /** Davet edilen kişinin adı (varsa) — selamlama için. */
  name?: string | null;
  /** Davet eden owner'ın görünen adı (panelde "Kim davet etti" görünür). */
  ownerName: string;
  /** Workspace'de erişim verilen restoranların adları — listede görünür. */
  restaurantNames: string[];
  /** Atanan rol — "Yönetici" / "Personel" gibi label. */
  roleLabel: string;
  /** /accept-invite?token=... tam URL'i. */
  acceptUrl: string;
  /** Davet token'ı kaç gün geçerli (default 7). */
  expiresInDays?: number;
}

/**
 * Section 5 — Team davet maili (Faz 4).
 *
 * Pulse layout pattern (CLAUDE.md §21.8). DB-driven copy override yok — minimal
 * MVP scope. Subject + intro + erişim listesi + CTA. Token expiresAt UI'da
 * hatırlatılır ki kullanıcı geç kalmasın.
 */
export function renderTeamInvite(
  params: TeamInviteParams,
  locale: 'tr' | 'en' = 'tr',
): { subject: string; html: string; text: string } {
  const isTr = locale !== 'en';
  const { name, ownerName, restaurantNames, roleLabel, acceptUrl, expiresInDays = 7 } = params;

  const subject = isTr
    ? `${ownerName} seni Buaze ekibine davet etti`
    : `${ownerName} invited you to join their Buaze team`;
  const preheader = isTr
    ? `Daveti ${expiresInDays} gün içinde kabul et — bağlantı süresi sonra dolar.`
    : `Accept the invite within ${expiresInDays} days — link expires after that.`;

  const greeting = name
    ? (isTr ? `Merhaba ${escapeHtml(name)},` : `Hi ${escapeHtml(name)},`)
    : (isTr ? 'Merhaba,' : 'Hi,');

  const intro = isTr
    ? `<strong>${escapeHtml(ownerName)}</strong> seni <strong>Buaze</strong> hesabına ${escapeHtml(roleLabel)} olarak davet etti. Daveti kabul ettiğinde aşağıdaki işletmelere erişim hakkına sahip olacaksın.`
    : `<strong>${escapeHtml(ownerName)}</strong> has invited you to their <strong>Buaze</strong> workspace as <strong>${escapeHtml(roleLabel)}</strong>. Once you accept, you'll have access to the following businesses.`;

  const accessHtml = restaurantNames.length
    ? teamBulletList(restaurantNames.map((n) => escapeHtml(n)))
    : `<div style="font-family:${FONTS.body};font-size:14px;font-weight:500;line-height:1.5;color:${PULSE.n600};">${
        isTr ? 'Tüm konumlar' : 'All locations'
      }</div>`;

  const accessCard = teamCard(
    'neutral',
    null,
    teamRow('neutral', isTr ? 'Rol' : 'Role', teamRoleChip('lime', escapeHtml(roleLabel)), { first: true }) +
      teamRow('neutral', isTr ? 'Erişim' : 'Access', accessHtml, { last: true }),
  );

  const expiryNote = isTr
    ? `Bu davet bağlantısı ${expiresInDays} gün sonra geçersiz olur. Süresi dolarsa hesap sahibinden yeni bir davet isteyebilirsin.`
    : `This invite link expires in ${expiresInDays} days. If it does, ask the workspace owner to send a new one.`;

  const ctaLabel = isTr ? 'Daveti kabul et →' : 'Accept invite →';

  const content = teamContent(`
    ${renderEyebrow(isTr ? 'EKİP DAVETİ' : 'TEAM INVITE')}
    ${spacer(12)}
    ${renderH1(greeting, { size: 34 })}
    ${spacer(16)}
    ${renderP(intro)}
    ${spacer(24)}
    ${accessCard}
    ${spacer(28)}
    ${renderButton({ href: escapeHtml(acceptUrl), label: ctaLabel, variant: 'lime', size: 'lg' })}
    ${spacer(18)}
    ${renderP(expiryNote, { color: PULSE.n500, size: 13 })}
  `);

  const html = pulseLayout({ subject, preheader, content, footer: { locale } });

  const text = [
    `${ownerName} ${isTr ? 'seni Buaze ekibine davet etti.' : 'invited you to their Buaze team.'}`,
    '',
    `${isTr ? 'Rol' : 'Role'}: ${roleLabel}`,
    `${isTr ? 'Erişim' : 'Access'}: ${restaurantNames.length ? restaurantNames.join(', ') : isTr ? 'Tüm konumlar' : 'All locations'}`,
    '',
    `${isTr ? 'Daveti kabul etmek için' : 'To accept the invite, open'}:`,
    acceptUrl,
    '',
    expiryNote,
  ].join('\n');

  return { subject, html, text };
}
