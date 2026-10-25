// Wave C4 (CLAUDE.md §38.194) — KVKK data export confirmation.
//
// /api/account/export-data POST sync olarak JSON döner; bu mail fire-and-
// forget aynı request içinde gider. KVKK §11/§13 transparency requirement:
// "Verilerinizi indirdiniz → kayıt altına aldık → şüpheli görseniz ne
// yapmanız gerek". password-changed paterniyle paralel.

import { PULSE } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { spacer } from '../components';
import {
  securityContent,
  securityHero,
  securityCard,
  securityMetaGrid,
  securityNotYou,
} from './security-mail-parts';
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

  const content = securityContent(`
    ${securityHero({
      eyebrow: copy.eyebrow,
      title: copy.title,
      accent: copy.titleAccent,
      accentColor: PULSE.limeDeep,
      intro: copy.intro,
    })}
    ${spacer(28)}
    ${securityCard({
      tone: 'neutral',
      eyebrow: copy.cardEyebrow,
      pill: { text: copy.statusText, dotColor: PULSE.success, bgColor: PULSE.limeSoft },
      body: securityMetaGrid([
        { label: copy.metaTime, value: exportedAt },
        { label: copy.metaIp, value: ip, code: true },
        { label: copy.metaDevice, value: device, breakable: true },
        { label: copy.metaAccount, value: accountEmail, breakable: true, full: params.accountEmail.length > 24 },
      ]),
    })}
    ${spacer(24)}
    ${securityNotYou({ tone: 'danger', title: copy.notYouTitle, body: copy.notYouBody })}
  `);

  const html = pulseLayout({ subject, preheader, content, footer: { locale } });
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
