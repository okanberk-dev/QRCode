// Wave C4 (CLAUDE.md §38.194) — KVKK data export confirmation.
//
// /api/account/export-data POST sync olarak JSON döner; bu mail fire-and-
// forget aynı request içinde gider. KVKK §11/§13 transparency requirement:
// "Verilerinizi indirdiniz → kayıt altına aldık → şüpheli görseniz ne
// yapmanız gerek". password-changed paterniyle paralel.

import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderStatusPill, spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

export interface DataExportConfirmationParams {
  firstName?: string | null;
  accountEmail: string;
  ip?: string | null;
  device?: string | null;
  /** Wall-clock of the export request. */
  exportedAt?: Date;
}

export async function renderDataExportConfirmation(
  params: DataExportConfirmationParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const firstName = params.firstName ? escapeHtml(params.firstName) : '';
  const accountEmail = escapeHtml(params.accountEmail);
  const ip = params.ip ? escapeHtml(params.ip) : '—';
  const device = params.device ? escapeHtml(params.device) : '—';
  const exportedAt = (params.exportedAt ?? new Date()).toLocaleString(isTr ? 'tr-TR' : 'en-US', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const subject = isTr ? 'Veri dışa aktarımın tamamlandı' : 'Your data export is complete';
  const preheader = isTr
    ? 'KVKK kapsamında hesabınla ilişkili tüm veri JSON olarak indirildi. Sen yapmadıysan hemen aksiyon al.'
    : 'A KVKK / GDPR data export was just downloaded for your account. If this wasn\'t you, act now.';

  const inlineDefault = isTr ? {
    eyebrow: 'KVKK · Veri indirildi',
    title: 'Veri',
    titleAccent: 'indirildi',
    intro: firstName
      ? `Merhaba <span style="color:${PULSE.graphite};font-weight:500;">${firstName}</span>, hesabınla ilişkili tüm veriler JSON olarak indirildi (KVKK §11 erişim hakkı). Bu işlemi sen yaptıysan ek bir şey yapman gerekmiyor.`
      : 'Hesabınla ilişkili tüm veriler JSON olarak indirildi (KVKK §11 erişim hakkı). Bu işlemi sen yaptıysan ek bir şey yapman gerekmiyor.',
    cardEyebrow: 'İşlem detayı',
    statusText: 'Başarılı · Dosya indirildi',
    metaTime: 'İndirme saati',
    metaIp: 'IP',
    metaDevice: 'Cihaz',
    metaAccount: 'Hesap',
    notYouTitle: 'Sen bunu yapmadıysan?',
    notYouBody: 'Hemen şifreni değiştir (Hesabım → Güvenlik) ve diğer oturumlardan çık. Şüphelendiğin bir durum varsa support@buaze.com\'a yaz.',
  } : {
    eyebrow: 'KVKK · Data downloaded',
    title: 'Your data',
    titleAccent: 'was exported',
    intro: firstName
      ? `Hi <span style="color:${PULSE.graphite};font-weight:500;">${firstName}</span>, all data associated with your account was downloaded as JSON (KVKK §11 / GDPR Art. 20 access right). If this was you, nothing else to do.`
      : 'All data associated with your account was downloaded as JSON (KVKK §11 / GDPR Art. 20 access right). If this was you, nothing else to do.',
    cardEyebrow: 'Export detail',
    statusText: 'Success · File downloaded',
    metaTime: 'Downloaded at',
    metaIp: 'IP',
    metaDevice: 'Device',
    metaAccount: 'Account',
    notYouTitle: "Wasn't you?",
    notYouBody: 'Change your password immediately (Account → Security) and sign out of other sessions. Email support@buaze.com if anything looks off.',
  };

  const merged = await loadMailCopy('data-export-confirmation', locale, inlineDefault);
  const vars = { firstName: params.firstName || '' };
  const copy = deepSubstitute(merged, vars, 'html') as typeof inlineDefault;
  const copyText = deepSubstitute(merged, vars, 'text') as typeof inlineDefault;

  const content = `
    ${renderEyebrow(copy.eyebrow)}
    ${spacer(16)}
    <h1 style="margin:0;font-family:${FONTS.heading};font-size:42px;line-height:1.05;letter-spacing:-0.03em;font-weight:500;color:${PULSE.graphite};">
      ${copy.title} <span style="color:${PULSE.limeDeep};">${copy.titleAccent}</span>
    </h1>
    ${spacer(20)}
    <p style="margin:0;font-family:${FONTS.body};font-size:15px;line-height:1.6;color:${PULSE.n600};">${copy.intro}</p>
    ${spacer(28)}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${PULSE.n50};border:1px solid ${PULSE.n200};border-radius:18px;">
      <tr><td style="padding:24px;">
        <div style="font-family:${FONTS.mono};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${PULSE.n500};">${copy.cardEyebrow}</div>
        ${spacer(12)}
        ${renderStatusPill({ text: copy.statusText, dotColor: PULSE.success, textColor: PULSE.graphite, bgColor: PULSE.limeSoft })}
        ${spacer(20)}
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="stack-row">
          <tr>
            <td class="stack-col" width="50%" valign="top" style="padding-right:12px;">
              <div style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${PULSE.n500};">${copy.metaTime}</div>
              <div style="margin-top:4px;font-family:${FONTS.body};font-size:13px;color:${PULSE.graphite};">${exportedAt}</div>
            </td>
            <td class="stack-col" width="50%" valign="top" style="padding-left:12px;">
              <div style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${PULSE.n500};">${copy.metaIp}</div>
              <div style="margin-top:4px;font-family:${FONTS.body};font-size:13px;color:${PULSE.graphite};">${ip}</div>
            </td>
          </tr>
          <tr>
            <td class="stack-col" width="50%" valign="top" style="padding-right:12px;padding-top:14px;">
              <div style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${PULSE.n500};">${copy.metaDevice}</div>
              <div style="margin-top:4px;font-family:${FONTS.body};font-size:13px;color:${PULSE.graphite};">${device}</div>
            </td>
            <td class="stack-col" width="50%" valign="top" style="padding-left:12px;padding-top:14px;">
              <div style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${PULSE.n500};">${copy.metaAccount}</div>
              <div style="margin-top:4px;font-family:${FONTS.mono};font-size:13px;color:${PULSE.graphite};">${accountEmail}</div>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
    ${spacer(28)}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#FEF2F2;border-left:3px solid ${PULSE.danger};border-radius:12px;">
      <tr><td style="padding:18px 20px;">
        <div style="font-family:${FONTS.heading};font-size:15px;font-weight:500;color:${PULSE.graphite};">${copy.notYouTitle}</div>
        ${spacer(8)}
        <p style="margin:0;font-family:${FONTS.body};font-size:13px;line-height:1.55;color:${PULSE.n700};">${copy.notYouBody}</p>
      </td></tr>
    </table>
  `;

  const html = pulseLayout({ subject, preheader, content });
  const text = [
    copyText.eyebrow, '', `${copy.title} ${copy.titleAccent}`, '',
    copyText.intro.replace(/<[^>]*>/g, ''), '',
    `${copy.cardEyebrow}:`,
    `  ${copy.metaTime}: ${exportedAt}`,
    `  ${copy.metaIp}: ${ip}`,
    `  ${copy.metaDevice}: ${device}`,
    `  ${copy.metaAccount}: ${params.accountEmail}`,
    '',
    `${copy.notYouTitle}: ${copyText.notYouBody}`,
  ].join('\n');
  return { subject, html, text };
}
