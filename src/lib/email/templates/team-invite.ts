import { PULSE } from '../tokens';
import { pulseLayout } from '../layout';
import { renderEcgDivider, renderEyebrow, renderH1, renderP, renderButton } from '../components';

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
    ? (isTr ? `Merhaba ${escape(name)},` : `Hi ${escape(name)},`)
    : (isTr ? 'Merhaba,' : 'Hi,');

  const intro = isTr
    ? `<strong>${escape(ownerName)}</strong> seni <strong>Buaze</strong> hesabına ${escape(roleLabel)} olarak davet etti. Daveti kabul ettiğinde aşağıdaki işletmelere erişim hakkına sahip olacaksın.`
    : `<strong>${escape(ownerName)}</strong> has invited you to their <strong>Buaze</strong> workspace as <strong>${escape(roleLabel)}</strong>. Once you accept, you'll have access to the following businesses.`;

  const restaurantsList = restaurantNames.length
    ? restaurantNames
        .map(
          (n) =>
            `<li style="margin:0 0 6px 0;font:14px/1.5 sans-serif;color:${PULSE.graphite};">• ${escape(n)}</li>`,
        )
        .join('')
    : `<li style="margin:0;font:14px/1.5 sans-serif;color:${PULSE.n500};">${
        isTr ? 'Tüm konumlar' : 'All locations'
      }</li>`;

  const expiryNote = isTr
    ? `Bu davet bağlantısı ${expiresInDays} gün sonra geçersiz olur. Süresi dolarsa hesap sahibinden yeni bir davet isteyebilirsin.`
    : `This invite link expires in ${expiresInDays} days. If it does, ask the workspace owner to send a new one.`;

  const ctaLabel = isTr ? 'Daveti kabul et →' : 'Accept invite →';

  const content = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:32px 32px 0 32px;">
        ${renderEyebrow(isTr ? 'EKİP DAVETİ' : 'TEAM INVITE', PULSE.lime)}
      </td></tr>
      <tr><td style="padding:8px 32px 0 32px;">
        ${renderH1(greeting)}
      </td></tr>
      <tr><td style="padding:12px 32px 0 32px;">
        ${renderP(intro)}
      </td></tr>
      <tr><td style="padding:18px 32px 0 32px;">
        <ul style="margin:0;padding:0 0 0 4px;list-style:none;">${restaurantsList}</ul>
      </td></tr>
      <tr><td style="padding:24px 32px 0 32px;" align="left">
        ${renderButton({ href: acceptUrl, label: ctaLabel, variant: 'lime', size: 'lg' })}
      </td></tr>
      <tr><td style="padding:18px 32px 0 32px;">
        ${renderP(expiryNote, { color: PULSE.n500, size: 12 })}
      </td></tr>
      <tr><td style="padding:24px 32px 32px 32px;">
        ${renderEcgDivider()}
      </td></tr>
    </table>
  `;

  const html = pulseLayout({ subject, preheader, content });

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

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
