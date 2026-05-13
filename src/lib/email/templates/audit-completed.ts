// CLAUDE.md §42 Phase 3 — Audit completed notification mail.
//
// Owner'a (restoran.notificationEmail) atanan denetim tamamlandığında
// gönderilir. Skor + geçti/kaldı + panel detay link.

import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderP, renderH2, spacer, renderStatusPill } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

export interface AuditCompletedParams {
  restaurantName: string;
  auditTitle: string;
  respondentName?: string | null;
  score: number;
  passed: boolean | null;
  passingScore: number | null;
  panelUrl: string;
}

// Defense in depth (CLAUDE.md §37.2.G mail recipient guard pattern):
// respondentName submit endpoint'inden gelir, owner inbox'una echo edilir.
// Subject + headers'a girmiyor ama preheader pulseLayout'ta raw template
// literal'a giriyor (layout.ts:75 hidden <div>). Newline/CR/tab strip +
// escape HTML böylece preheader XSS + visual injection kapatılır.
function sanitizeForMail(value: string, max = 200): string {
  return value.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

export async function renderAuditCompleted(
  params: AuditCompletedParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const respondentRaw = params.respondentName?.trim() || (isTr ? 'Bir katılımcı' : 'Someone');
  const respondent = sanitizeForMail(respondentRaw);
  // Subject/preheader'a giren tüm user/owner-controlled strings da
  // sanitize (auditTitle owner-controlled ama owner panel input
  // validation'ı geçmiş; defansif olarak yine strip ediyoruz).
  const auditTitleSafe = sanitizeForMail(params.auditTitle);
  const subject = isTr
    ? `Denetim tamamlandı · ${auditTitleSafe} · ${params.score}/100`
    : `Audit completed · ${auditTitleSafe} · ${params.score}/100`;
  // Preheader hidden <div>'e girer ama HTML parser yine parse eder → escape.
  const preheaderRaw = isTr
    ? `${respondent}, "${auditTitleSafe}" denetimini ${params.score}/100 ile tamamladı.`
    : `${respondent} completed "${auditTitleSafe}" with ${params.score}/100.`;
  const preheader = escapeHtml(preheaderRaw);

  const inlineDefault = isTr
    ? {
        eyebrow: 'Denetim Merkezi · Yeni yanıt',
        titleLine: 'Bir denetim tamamlandı.',
        introLine: '${respondentName}, "${auditTitle}" denetimini tamamladı.',
        scoreLabel: 'Toplam puan',
        passedLabel: 'Sonuç',
        passedYes: 'Geçti',
        passedNo: 'Kaldı',
        passedUnknown: 'Puan hesaplandı',
        ctaLabel: 'Yanıtı incele',
        secondaryLine: 'Detay sayfasından soru-soru cevapları görüp, gerekirse manuel yeniden puanlama yapabilirsin.',
      }
    : {
        eyebrow: 'Audit Center · New response',
        titleLine: 'An audit was completed.',
        introLine: '${respondentName} completed "${auditTitle}".',
        scoreLabel: 'Total score',
        passedLabel: 'Result',
        passedYes: 'Passed',
        passedNo: 'Failed',
        passedUnknown: 'Score recorded',
        ctaLabel: 'Review response',
        secondaryLine: 'Open the detail page to see answers question-by-question and re-score manually if needed.',
      };

  const merged = await loadMailCopy('audit-completed', locale, inlineDefault);
  const vars = {
    respondentName: respondent,
    auditTitle: params.auditTitle,
    restaurantName: params.restaurantName,
    score: String(params.score),
  };
  const copy = deepSubstitute(merged, vars, 'html');
  const copyText = deepSubstitute(merged, vars, 'text');

  const passedBlock =
    params.passed === true
      ? renderStatusPill({ text: copy.passedYes, dotColor: PULSE.lime, textColor: PULSE.graphite, bgColor: '#EAF9B8' })
      : params.passed === false
        ? renderStatusPill({ text: copy.passedNo, dotColor: '#DC2626', textColor: '#991B1B', bgColor: '#FEE2E2' })
        : renderStatusPill({ text: copy.passedUnknown, dotColor: PULSE.n400, textColor: PULSE.n600, bgColor: PULSE.n50 });

  const passingHint =
    params.passingScore != null
      ? `<span style="font-family:${FONTS.mono};color:${PULSE.n500};font-size:12px;">· ${isTr ? 'Eşik' : 'Threshold'} ${params.passingScore}</span>`
      : '';

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PULSE.pure};border-radius:18px;">
      <tr>
        <td class="bz-pad" style="padding:36px 40px 16px;">
          ${renderEyebrow(copy.eyebrow)}
          ${spacer(8)}
          ${renderH2(escapeHtml(copy.titleLine))}
          ${spacer(8)}
          ${renderP(copy.introLine)}
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:8px 40px 24px;">
          <div style="background:${PULSE.n50};border:1px solid ${PULSE.n200};border-radius:14px;padding:20px;">
            <div style="font-family:${FONTS.mono};color:${PULSE.n500};font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">${escapeHtml(copy.scoreLabel)}</div>
            <div style="font-family:${FONTS.heading};font-size:42px;font-weight:600;color:${PULSE.graphite};letter-spacing:-0.025em;line-height:1.1;margin-top:6px;">${params.score}<span style="color:${PULSE.n400};font-size:22px;">/100</span> ${passingHint}</div>
            <div style="margin-top:12px;">${passedBlock}</div>
          </div>
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:0 40px 24px;">
          <a href="${escapeHtml(params.panelUrl)}" style="display:inline-block;background:${PULSE.graphite};color:${PULSE.pure};font-family:${FONTS.heading};font-size:14px;font-weight:500;letter-spacing:-0.01em;text-decoration:none;padding:14px 24px;border-radius:999px;">${escapeHtml(copy.ctaLabel)} →</a>
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:0 40px 36px;">
          ${renderP(copy.secondaryLine, { size: 13 })}
        </td>
      </tr>
    </table>
  `;

  const html = pulseLayout({
    subject,
    preheader,
    content,
    eyebrow: '',
    footer: { locale, unsubText: isTr ? 'Denetim bildirimlerini kapatmak için' : 'To stop audit notifications' },
  });
  const text = `${copyText.titleLine}\n\n${copyText.introLine}\n\n${copyText.scoreLabel}: ${params.score}/100${params.passingScore != null ? ` (${isTr ? 'eşik' : 'threshold'} ${params.passingScore})` : ''}\n\n${params.panelUrl}`;
  return { subject, html, text };
}
