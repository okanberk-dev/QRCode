// Operator alert mails (CLAUDE.md §21.33): critical mail send failure and
// OpenAI billing failure. Render-only (like contact-admin / owner-segment-mail):
// no DB-driven copy, not part of SUPPORTED_MAIL_KEYS. Ops works in TR, so TR is
// the default locale; EN exists for parity.
//
// Look: dark header ("OPS" eyebrow), a status hero, a facts card whose values
// are monospace and break anywhere (tokens / long exception messages must never
// widen the shell), an optional metadata card and an action card with numbered
// steps. Card chrome comes from the security notices so ops mails read as part
// of the same family.
//
// PII: the bodies carry exactly what the plain-text alerts already carry (the
// failed recipient address, metadata bag) — nothing more.

import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderButton, renderP, spacer } from '../components';
import { formatFullDateTimeInTimeZone } from '@/lib/timezone';
import { securityContent, securityHero, securityCard, securityMetaGrid } from './security-mail-parts';

const TABLE = 'role="presentation" cellpadding="0" cellspacing="0" border="0"';
const DANGER_TEXT = '#B91C1C';
/** Free-text values (reasons, upstream error bodies) are clipped for display so
 *  one huge response body can't push the mail toward Gmail's ~102KB clip. */
const DISPLAY_CLIP = 600;

type MetadataBag = Record<string, string | number | null | undefined>;

function clip(value: string, max = DISPLAY_CLIP): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/** Escaped, clipped free text that keeps its line breaks (pre-wrap) — stack
 *  traces / multi-line messages stay readable; Outlook ignores pre-wrap and
 *  simply collapses them. */
function freeText(value: string): string {
  return `<span style="white-space:pre-wrap;">${escapeHtml(clip(value))}</span>`;
}

/** Human time in the business display zone + the exact UTC instant (the
 *  plain-text alert only carries the ISO string, ops greps logs with it). */
function timeValue(at: Date, locale: 'tr' | 'en'): string {
  const human = escapeHtml(formatFullDateTimeInTimeZone(at, locale));
  const iso = escapeHtml(at.toISOString());
  return `${human}<div class="bz-break" style="font-family:${FONTS.code};font-size:11.5px;font-weight:400;line-height:1.5;color:${PULSE.n500};margin-top:3px;">${iso}</div>`;
}

// ─── metadata grid (monospace key above value, hairline per row) ────────

function kvCell(key: string, value: string, side: 'left' | 'right' | 'full'): string {
  const pad = side === 'left' ? '0 12px 0 0' : side === 'right' ? '0 0 0 12px' : '0';
  const width = side === 'full' ? '' : 'width:50%;';
  const colspan = side === 'full' ? ' colspan="2"' : '';
  return `<td${colspan} class="stack-col col-half" valign="top" style="${width}padding:${pad};border-top:1px solid ${PULSE.n200};">
      <div style="padding:9px 0;">
        <div class="bz-break" style="font-family:${FONTS.code};font-size:11.5px;line-height:1.5;color:${PULSE.n500};">${key}</div>
        <div class="bz-break" style="margin-top:3px;font-family:${FONTS.code};font-size:13px;font-weight:500;line-height:1.5;color:${PULSE.graphite};">${value}</div>
      </div>
    </td>`;
}

function kvGrid(rows: Array<{ key: string; value: string }>): string {
  const trs: string[] = [];
  for (let i = 0; i < rows.length; i += 2) {
    const a = rows[i];
    const b = rows[i + 1];
    trs.push(
      b
        ? `<tr>${kvCell(a.key, a.value, 'left')}${kvCell(b.key, b.value, 'right')}</tr>`
        : `<tr>${kvCell(a.key, a.value, 'full')}</tr>`,
    );
  }
  return `<table ${TABLE} width="100%" class="stack-row">${trs.join('')}</table>`;
}

function metadataCard(metadata: MetadataBag | undefined, copy: { eyebrow: string; none: string }): string {
  const rows = Object.entries(metadata ?? {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => ({ key: escapeHtml(k), value: freeText(String(v)) }));
  return securityCard({
    tone: 'neutral',
    eyebrow: copy.eyebrow,
    body: rows.length
      ? kvGrid(rows)
      : renderP(copy.none, { size: 13, color: PULSE.n500 }),
  });
}

// ─── bullets + numbered action card ─────────────────────────────────────

function bulletList(items: string[], dot: string): string {
  const rows = items
    .map(
      (text) => `<tr>
        <td valign="top" width="18" style="width:18px;padding:9px 0 0;"><table ${TABLE}><tr><td width="6" height="6" style="width:6px;height:6px;background:${dot};border-radius:3px;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td>
        <td valign="top" style="padding:3px 0;font-family:${FONTS.body};font-size:14px;font-weight:500;line-height:1.55;color:${PULSE.graphite};">${text}</td>
      </tr>`,
    )
    .join('');
  return `<table ${TABLE} width="100%">${rows}</table>`;
}

function stepRow(n: number, text: string): string {
  return `<tr>
      <td valign="top" width="36" style="width:36px;padding:2px 12px 12px 0;">
        <table ${TABLE} width="24" style="width:24px;border-collapse:separate;"><tr><td width="24" height="24" align="center" valign="middle" style="width:24px;height:24px;background:${PULSE.graphite};border-radius:12px;font-family:${FONTS.label};font-size:12px;font-weight:600;line-height:1;color:${PULSE.lime};text-align:center;">${n}</td></tr></table>
      </td>
      <td valign="top" style="padding:3px 0 12px;font-family:${FONTS.body};font-size:14px;line-height:1.6;color:${PULSE.n700};">${text}</td>
    </tr>`;
}

/** Lime action card: heading, numbered steps, optional full-width-on-mobile CTA. */
function actionCard(title: string, steps: string[], cta?: { href: string; label: string }): string {
  return `
    <table ${TABLE} width="100%" style="background:${PULSE.limeSoft};border-left:4px solid ${PULSE.limeDeep};border-radius:6px 14px 14px 6px;border-collapse:separate;border-spacing:0;">
      <tr>
        <td style="padding:20px 20px 12px;">
          <div style="font-family:${FONTS.heading};font-size:16px;font-weight:600;line-height:1.3;color:${PULSE.graphite};">${title}</div>
          ${spacer(14)}
          <table ${TABLE} width="100%">${steps.map((s, i) => stepRow(i + 1, s)).join('')}</table>
          ${cta ? `${spacer(4)}${renderButton({ href: escapeHtml(cta.href), label: cta.label, variant: 'dark' })}${spacer(8)}` : ''}
        </td>
      </tr>
    </table>
  `;
}

function opsLayout(args: { subject: string; preheader: string; content: string; locale: 'tr' | 'en' }): string {
  return pulseLayout({
    subject: escapeHtml(args.subject),
    preheader: escapeHtml(args.preheader),
    content: args.content,
    eyebrow: 'OPS',
    darkHeader: true,
    footer: { locale: args.locale },
  });
}

// ─── 1. Critical mail send failure ──────────────────────────────────────

export interface OpsMailFailureAlertParams {
  /** Which template failed — 'low-rating-alert', 'forgot-password', etc. */
  template: string;
  /** Original recipient (the user / owner who didn't get the mail). */
  recipient: string;
  reason?: string;
  metadata?: MetadataBag;
  occurredAt?: Date;
}

export function renderOpsMailFailureAlert(
  params: OpsMailFailureAlertParams,
  locale: 'tr' | 'en' = 'tr',
): { subject: string; html: string; text: string } {
  const isTr = locale !== 'en';
  const at = params.occurredAt ?? new Date();

  const subject = isTr
    ? `[OPS] Mail gönderilemedi: ${params.template}`
    : `[OPS] Mail send failed: ${params.template}`;
  const preheader = isTr
    ? `${params.template} şablonu gönderilemedi. Alıcı mailbox'ını ve Resend dashboard'unu kontrol edin.`
    : `The ${params.template} template failed to send. Check the recipient mailbox and the Resend dashboard.`;

  const copy = isTr
    ? {
        eyebrow: 'Ops · Mail teslimat hatası',
        title: 'Kritik mail',
        accent: 'gönderilemedi',
        intro: 'Kritik bir mail gönderilemedi.',
        cardEyebrow: 'Hata detayı',
        pill: 'Gönderim başarısız',
        template: 'Şablon',
        recipient: 'Alıcı',
        reason: 'Sebep',
        reasonNone: 'bilinmiyor (uygulama loglarına bakın)',
        when: 'Zaman',
        metaEyebrow: 'Metadata',
        metaNone: '(yok)',
        actionTitle: 'Aksiyon',
        steps: [
          'Alıcı mailbox\'ını / Resend dashboard\'unu kontrol edin.',
          'Upstream kayıt hâlâ geçerliyse admin panelinden tekrar tetikleyin.',
        ],
        cta: 'Resend dashboard\'unu aç →',
      }
    : {
        eyebrow: 'Ops · Mail delivery failure',
        title: 'A critical mail',
        accent: 'failed to send',
        intro: 'A critical mail failed to send.',
        cardEyebrow: 'Failure detail',
        pill: 'Send failed',
        template: 'Template',
        recipient: 'Recipient',
        reason: 'Reason',
        reasonNone: 'unknown (see app logs)',
        when: 'When',
        metaEyebrow: 'Metadata',
        metaNone: '(none)',
        actionTitle: 'Action',
        steps: [
          'Investigate the recipient mailbox / Resend dashboard.',
          'Re-trigger from the admin panel if the upstream record is still actionable.',
        ],
        cta: 'Open Resend dashboard →',
      };

  const content = securityContent(`
    ${securityHero({
      eyebrow: copy.eyebrow,
      eyebrowColor: DANGER_TEXT,
      title: copy.title,
      accent: copy.accent,
      accentColor: PULSE.danger,
      breakBeforeAccent: true,
      intro: copy.intro,
    })}
    ${spacer(28)}
    ${securityCard({
      tone: 'danger',
      eyebrow: copy.cardEyebrow,
      pill: { text: copy.pill, dotColor: PULSE.danger, bgColor: PULSE.pure },
      body: securityMetaGrid(
        [
          { label: copy.template, value: escapeHtml(params.template), code: true },
          { label: copy.recipient, value: escapeHtml(params.recipient), code: true },
          { label: copy.reason, value: freeText(params.reason ?? copy.reasonNone), code: true, full: true },
          { label: copy.when, value: timeValue(at, locale), full: true },
        ],
        'danger',
      ),
    })}
    ${spacer(20)}
    ${metadataCard(params.metadata, { eyebrow: copy.metaEyebrow, none: copy.metaNone })}
    ${spacer(24)}
    ${actionCard(copy.actionTitle, copy.steps, { href: 'https://resend.com/emails', label: copy.cta })}
  `);

  const html = opsLayout({ subject, preheader, content, locale });

  const metaLines = Object.entries(params.metadata ?? {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');
  const text = isTr
    ? [
        `Kritik bir mail gönderilemedi.`,
        ``,
        `Şablon:    ${params.template}`,
        `Alıcı:     ${params.recipient}`,
        `Sebep:     ${params.reason ?? copy.reasonNone}`,
        ``,
        `Metadata:`,
        metaLines || '  (yok)',
        ``,
        `Zaman:     ${at.toISOString()}`,
        ``,
        `Aksiyon: alıcı mailbox'ını / Resend dashboard'unu kontrol edin, sonra`,
        `upstream kayıt hâlâ geçerliyse admin panelinden tekrar tetikleyin.`,
      ].join('\n')
    : [
        `A critical mail failed to send.`,
        ``,
        `Template:   ${params.template}`,
        `Recipient:  ${params.recipient}`,
        `Reason:     ${params.reason ?? copy.reasonNone}`,
        ``,
        `Metadata:`,
        metaLines || '  (none)',
        ``,
        `When:       ${at.toISOString()}`,
        ``,
        `Action: investigate the recipient mailbox / Resend dashboard, then`,
        `re-trigger from the admin panel if the upstream record is still`,
        `actionable.`,
      ].join('\n');

  return { subject, html, text };
}

// ─── 2. OpenAI billing failure ──────────────────────────────────────────

export interface OpsOpenAiBillingAlertParams {
  /** OpenAI HTTP status (typically 429 for billing/quota issues). */
  status: number;
  /** 'billing_not_active', 'insufficient_quota', ... */
  errorType?: string;
  /** Error message snippet from the OpenAI response body. */
  message?: string;
  /** Which Buaze surface triggered the call (analytics-themes, suggest-reply, ...). */
  source?: string;
  occurredAt?: Date;
}

export function renderOpsOpenAiBillingAlert(
  params: OpsOpenAiBillingAlertParams,
  locale: 'tr' | 'en' = 'tr',
): { subject: string; html: string; text: string } {
  const isTr = locale !== 'en';
  const at = params.occurredAt ?? new Date();
  const billingUrl = 'https://platform.openai.com/account/billing';

  const subject = isTr
    ? `[OPS] OpenAI ${params.errorType || 'billing'} — AI özellikleri kapalı`
    : `[OPS] OpenAI ${params.errorType || 'billing'} — AI features offline`;
  const preheader = isTr
    ? 'Pulse AI taslakları, tema çıkarımı ve haftalık insight şu an template fallback\'te. Kart / kredi durumunu kontrol edin.'
    : 'Pulse AI drafts, theme extraction and weekly insight are on template fallback. Check card / credit status.';

  const copy = isTr
    ? {
        eyebrow: 'Ops · OpenAI faturalandırma',
        title: 'OpenAI billing',
        accent: 'arızası',
        intro: 'Buaze AI özellikleri şu an template fallback\'e düştü.',
        affectedEyebrow: 'Etkilenen özellikler',
        affectedPill: 'Template fallback',
        affected: ['Pulse AI taslak', 'Analytics tema çıkarımı', 'Haftalık insight'],
        cardEyebrow: 'Hata detayı',
        pill: 'Billing arızası',
        errorType: 'Hata tipi',
        status: 'HTTP status',
        source: 'Kaynak',
        message: 'Mesaj',
        unknown: 'bilinmiyor',
        none: '(yok)',
        when: 'Zaman',
        actionTitle: 'Aksiyon',
        steps: [
          'OpenAI billing sayfasında kart / credit durumunu kontrol edin, gerekirse kredi yükleyin.',
          'Düzeldikten sonra owner\'lar dashboard yenileyince AI taslakları tekrar üretilir (cache yok, anlık).',
        ],
        cta: 'OpenAI billing\'i aç →',
        footnote: 'Bu uyarı 5 dakikada bir kez atılır — aynı hata içinde tekrarlamaz.',
      }
    : {
        eyebrow: 'Ops · OpenAI billing',
        title: 'OpenAI billing',
        accent: 'failure',
        intro: 'Buaze AI features have dropped to the template fallback.',
        affectedEyebrow: 'Affected features',
        affectedPill: 'Template fallback',
        affected: ['Pulse AI drafts', 'Analytics theme extraction', 'Weekly insight'],
        cardEyebrow: 'Failure detail',
        pill: 'Billing failure',
        errorType: 'Error type',
        status: 'HTTP status',
        source: 'Source',
        message: 'Message',
        unknown: 'unknown',
        none: '(none)',
        when: 'When',
        actionTitle: 'Action',
        steps: [
          'Check the card / credit balance on the OpenAI billing page and top up if needed.',
          'Once fixed, AI drafts are generated again as owners refresh their dashboard (no cache, instant).',
        ],
        cta: 'Open OpenAI billing →',
        footnote: 'This alert is sent at most once every 5 minutes — it does not repeat within the same error.',
      };

  const content = securityContent(`
    ${securityHero({
      eyebrow: copy.eyebrow,
      eyebrowColor: DANGER_TEXT,
      title: copy.title,
      accent: copy.accent,
      accentColor: PULSE.danger,
      breakBeforeAccent: true,
      intro: copy.intro,
    })}
    ${spacer(28)}
    ${securityCard({
      tone: 'danger',
      eyebrow: copy.cardEyebrow,
      pill: { text: copy.pill, dotColor: PULSE.danger, bgColor: PULSE.pure },
      body: securityMetaGrid(
        [
          { label: copy.errorType, value: escapeHtml(params.errorType ?? copy.unknown), code: true },
          { label: copy.status, value: escapeHtml(String(params.status)), strong: true, color: PULSE.danger },
          { label: copy.source, value: escapeHtml(params.source ?? copy.unknown), code: true, full: true },
          { label: copy.message, value: freeText(params.message ?? copy.none), code: true, full: true },
          { label: copy.when, value: timeValue(at, locale), full: true },
        ],
        'danger',
      ),
    })}
    ${spacer(20)}
    ${securityCard({
      tone: 'neutral',
      eyebrow: copy.affectedEyebrow,
      pill: { text: copy.affectedPill, dotColor: PULSE.warning, bgColor: '#FFFBEB' },
      body: bulletList(copy.affected.map(escapeHtml), PULSE.warning),
    })}
    ${spacer(24)}
    ${actionCard(copy.actionTitle, copy.steps, { href: billingUrl, label: copy.cta })}
    ${spacer(20)}
    ${renderP(copy.footnote, { size: 12, color: PULSE.n500 })}
  `);

  const html = opsLayout({ subject, preheader, content, locale });

  const text = isTr
    ? [
        `OpenAI billing arızası — Buaze AI özellikleri (Pulse AI taslak, analytics`,
        `tema çıkarımı, haftalık insight) şu an template fallback'e düştü.`,
        ``,
        `Hata tipi:    ${params.errorType ?? copy.unknown}`,
        `HTTP status:  ${params.status}`,
        `Kaynak:       ${params.source ?? copy.unknown}`,
        `Mesaj:        ${params.message ?? copy.none}`,
        ``,
        `Zaman:        ${at.toISOString()}`,
        ``,
        `Aksiyon: ${billingUrl} → kart/credit kontrol et,`,
        `gerekirse kredi yükle. Düzeldikten sonra owner'lar dashboard yenileyince`,
        `AI taslakları tekrar üretilir (cache yok, anlık).`,
        ``,
        `Bu uyarı 5 dakikada bir kez atılır — aynı hata içinde tekrarlamaz.`,
      ].join('\n')
    : [
        `OpenAI billing failure — Buaze AI features (Pulse AI drafts, analytics`,
        `theme extraction, weekly insight) have dropped to the template fallback.`,
        ``,
        `Error type:   ${params.errorType ?? copy.unknown}`,
        `HTTP status:  ${params.status}`,
        `Source:       ${params.source ?? copy.unknown}`,
        `Message:      ${params.message ?? copy.none}`,
        ``,
        `When:         ${at.toISOString()}`,
        ``,
        `Action: ${billingUrl} → check card/credit,`,
        `top up if needed. Once fixed, AI drafts are generated again as owners`,
        `refresh their dashboard (no cache, instant).`,
        ``,
        `This alert is sent at most once every 5 minutes — it does not repeat within the same error.`,
      ].join('\n');

  return { subject, html, text };
}
