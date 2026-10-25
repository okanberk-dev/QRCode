// CLAUDE.md §42 Phase 3 — Audit completed notification mail.
//
// Owner'a (restoran.notificationEmail) bir denetim yanıtı geldiğinde gönderilir.
// Spec (Denetim Merkezi §6.8): bu mail artık HER yanıtta değil, yalnız SORUNLU
// yanıtta (geçme puanı altında / dikkat edilecek madde var) veya TEST
// denetimlerinde gider. İçerik: skor + geçti/kaldı + (varsa) kaç madde sorunlu
// + sonuçlar sayfasına link.
//
// Skor `null` olabilir: hiç puanlanabilir sorusu olmayan formlarda (not,
// fotoğraf, doğru cevabı girilmemiş Evet/Hayır) puan hesaplanmaz. O zaman
// konu satırında "/100" yok, skor bloğu yerine "Puanlanmıyor" etiketi çıkar.
//
// Metin DB-driven (loadMailCopy). "Puanlanmıyor" ve "N madde sorunlu" satırları
// KASITLI olarak inline (isTr ternary, "Eşik/Threshold" ipucu gibi) — yeni CMS
// anahtarı yok, bu yüzden placeholders / defaults / seed değişmez.

import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderP, renderH2, renderButton, spacer, renderStatusPill } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

export interface AuditCompletedParams {
  restaurantName: string;
  auditTitle: string;
  respondentName?: string | null;
  /** 0-100. `null` = bu denetim puanlanmıyor (puanlanabilir soru yok). */
  score: number | null;
  passed: boolean | null;
  passingScore: number | null;
  /** Sorunlu (dikkat edilecek) madde sayısı; 0 / yok = satır gösterilmez. */
  attentionCount?: number | null;
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

/** "3 madde sorunlu" | "1 item needs attention" — yalnız sayı enjekte edilir (güvenli). */
function attentionText(count: number, isTr: boolean): string {
  if (isTr) return `${count} madde sorunlu`;
  return count === 1 ? '1 item needs attention' : `${count} items need attention`;
}

export async function renderAuditCompleted(
  params: AuditCompletedParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const respondentRaw = params.respondentName?.trim() || (isTr ? 'Bir katılımcı' : 'Someone');
  const respondent = sanitizeForMail(respondentRaw);
  const hasScore = typeof params.score === 'number' && Number.isFinite(params.score);
  const attention =
    typeof params.attentionCount === 'number' && Number.isFinite(params.attentionCount)
      ? Math.max(0, Math.floor(params.attentionCount))
      : 0;

  // Subject/preheader'a giren tüm user/owner-controlled strings da
  // sanitize (auditTitle owner-controlled ama owner panel input
  // validation'ı geçmiş; defansif olarak yine strip ediyoruz).
  const auditTitleSafe = sanitizeForMail(params.auditTitle);
  const subject = isTr
    ? `Denetim tamamlandı · ${auditTitleSafe}${hasScore ? ` · ${params.score}/100` : ''}`
    : `Audit completed · ${auditTitleSafe}${hasScore ? ` · ${params.score}/100` : ''}`;

  // Preheader hidden <div>'e girer ama HTML parser yine parse eder → escape.
  const preheaderBase = isTr
    ? hasScore
      ? `${respondent}, "${auditTitleSafe}" denetimini ${params.score}/100 ile tamamladı.`
      : `${respondent}, "${auditTitleSafe}" denetimini tamamladı.`
    : hasScore
      ? `${respondent} completed "${auditTitleSafe}" with ${params.score}/100.`
      : `${respondent} completed "${auditTitleSafe}".`;
  const preheaderRaw = attention > 0 ? `${preheaderBase} ${attentionText(attention, isTr)}.` : preheaderBase;
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
    score: hasScore ? String(params.score) : '—',
  };
  const copy = deepSubstitute(merged, vars, 'html');
  const copyText = deepSubstitute(merged, vars, 'text');

  const notScoredLabel = isTr ? 'Puanlanmıyor' : 'Not scored';

  const passedBlock =
    params.passed === true
      ? renderStatusPill({ text: copy.passedYes, dotColor: PULSE.limeDeep, textColor: PULSE.graphite, bgColor: PULSE.limeSoft })
      : params.passed === false
        ? renderStatusPill({ text: copy.passedNo, dotColor: PULSE.danger, textColor: '#991B1B', bgColor: '#FEE2E2' })
        : hasScore
          ? renderStatusPill({ text: copy.passedUnknown, dotColor: PULSE.n400, textColor: PULSE.n600, bgColor: PULSE.n100 })
          : '';

  const thresholdChip =
    hasScore && params.passingScore != null
      ? renderStatusPill({
          text: `${isTr ? 'Eşik' : 'Threshold'} ${params.passingScore}`,
          dotColor: PULSE.n400,
          textColor: PULSE.n600,
          bgColor: PULSE.n100,
        })
      : '';

  const attentionPill =
    attention > 0
      ? renderStatusPill({ text: attentionText(attention, isTr), dotColor: PULSE.danger, textColor: '#991B1B', bgColor: '#FEE2E2' })
      : '';

  // Score body: big number + progress bar when scored, a "Not scored" pill otherwise.
  const barColor = params.passed === false ? PULSE.danger : params.passed === true ? PULSE.limeDeep : PULSE.graphite;
  const scoreBody = hasScore
    ? `
        <div style="font-family:${FONTS.heading};font-size:56px;font-weight:600;color:${PULSE.graphite};letter-spacing:-0.03em;line-height:1.05;margin-top:10px;">${params.score}<span style="color:${PULSE.n400};font-size:22px;font-weight:500;letter-spacing:0;">/100</span></div>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:14px;">
          <tr>
            <td style="background:${PULSE.n200};border-radius:100px;height:8px;line-height:8px;font-size:1px;">
              <div style="width:${Math.min(100, Math.max(2, Math.round(params.score as number)))}%;background:${barColor};height:8px;border-radius:100px;line-height:8px;font-size:1px;">&nbsp;</div>
            </td>
          </tr>
        </table>`
    : `<div style="margin-top:12px;">${renderStatusPill({ text: notScoredLabel, dotColor: PULSE.n400, textColor: PULSE.n600, bgColor: PULSE.pure })}</div>`;

  const pillsHtml = [passedBlock, thresholdChip, attentionPill]
    .filter(Boolean)
    .map((pill) => `<span style="display:inline-block;margin:0 8px 8px 0;">${pill}</span>`)
    .join('');

  // One padded cell for the whole body: separate bz-pad rows would each get
  // 28px top + bottom on phones and open 56px gaps between every block.
  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PULSE.pure};">
      <tr>
        <td class="bz-pad" style="padding:40px 40px 40px;">
          ${renderEyebrow(copy.eyebrow)}
          ${spacer(12)}
          ${renderH2(escapeHtml(copy.titleLine))}
          ${spacer(10)}
          ${renderP(copy.introLine)}
          ${spacer(24)}
          <div style="background:${PULSE.n50};border:1px solid ${PULSE.n200};border-radius:16px;padding:22px 22px 14px;">
            ${renderEyebrow(escapeHtml(copy.scoreLabel))}
            ${scoreBody}
            ${pillsHtml ? `<div style="margin-top:16px;">${pillsHtml}</div>` : ''}
          </div>
          ${spacer(24)}
          ${renderButton({ href: escapeHtml(params.panelUrl), label: `${escapeHtml(copy.ctaLabel)} →`, size: 'lg' })}
          ${spacer(20)}
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

  const scoreLine = hasScore
    ? `${copyText.scoreLabel}: ${params.score}/100${params.passingScore != null ? ` (${isTr ? 'eşik' : 'threshold'} ${params.passingScore})` : ''}`
    : `${copyText.scoreLabel}: ${notScoredLabel}`;
  const attentionLine = attention > 0 ? `\n${attentionText(attention, isTr)}` : '';
  const text = `${copyText.titleLine}\n\n${copyText.introLine}\n\n${scoreLine}${attentionLine}\n\n${params.panelUrl}`;
  return { subject, html, text };
}
