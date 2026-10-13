// Denetim Merkezi — public submit sertleştirmesi (spec §6.8). Saf, DB'siz.
//
// Paylaşım linkleri artık varsayılan olarak SÜREKLİ (reusable) olduğundan,
// bu link bir kez sızarsa tek koruma kalmasın diye:
//   • boyut / sayı sınırları (fotoğraf başına + toplam + gövde)
//   • geçersiz cevap tipleri (data: URL doldurma, dev diziler, tür uyuşmazlığı)
//   • yeniden gönderim (replay) tespiti — çift dokunuş / ağ tekrarı
//   • sahibe giden e-posta politikası (yalnız sorunlu yanıt veya test)
//   • test skorunun katılımcıya sızmaması
// Rota bu fonksiyonları çağırır; böylece mantık birim testlenebilir
// (eskiden test dosyası rota mantığını inline "aynalıyordu").

import { isEmptyAnswerValue } from './misses';
import type { AuditKind } from './kind';
import type { AuditQuestionType } from './types';

// ─── Sabitler ───────────────────────────────────────────────────────────

/** Tek fotoğraf (data URL string uzunluğu). İstemci sıkıştırması bunun altında kalır. */
export const PHOTO_MAX_BYTES = 800 * 1024;
/** Tek gönderimdeki TÜM fotoğrafların toplamı (2.4 MB). */
export const PHOTOS_TOTAL_MAX_BYTES = Math.round(2.4 * 1024 * 1024);
/** İstek gövdesi üst sınırı; aşılırsa 413 PAYLOAD_TOO_LARGE. */
export const REQUEST_MAX_BYTES = 3 * 1024 * 1024;
/** Fotoğraf olmayan string cevaplar (metin, tek seçim…). */
export const TEXT_ANSWER_MAX_CHARS = 4000;
/** Çoklu seçim: en fazla 50 öğe, öğe başına 200 karakter. */
export const MULTI_MAX_ITEMS = 50;
export const MULTI_ITEM_MAX_CHARS = 200;

export interface RateRule {
  max: number;
  windowMs: number;
}

/** IP başına dakikada 20 (bir otelin tabletleri tek NAT'tan çıkar; 5 vardiya değişiminde tıkanırdı). */
export const SUBMIT_IP_RULE: RateRule = { max: 20, windowMs: 60_000 };
/** Link (assignment) başına dakikada 30. */
export const SUBMIT_ASSIGNMENT_RULE: RateRule = { max: 30, windowMs: 60_000 };
/** Link başına günde 300 (aşılırsa 429 `scope: 'daily'`). */
export const SUBMIT_ASSIGNMENT_DAILY_RULE: RateRule = { max: 300, windowMs: 86_400_000 };
/** Aynı denetim için sahibe en fazla saatte 1 e-posta. */
export const OWNER_MAIL_TEMPLATE_RULE: RateRule = { max: 1, windowMs: 3_600_000 };
/** Aynı işletme için günde en fazla 20 denetim e-postası. */
export const OWNER_MAIL_RESTAURANT_DAILY_RULE: RateRule = { max: 20, windowMs: 86_400_000 };
/** Aynı link + IP + User-Agent'tan bu süre içindeki özdeş gönderim = tekrar. */
export const REPLAY_WINDOW_MS = 30_000;

// ─── Cevap doğrulama ────────────────────────────────────────────────────

export interface AnswerPayloadQuestion {
  id: string;
  type: AuditQuestionType | string;
}

export interface AnswerPayloadRow {
  questionId: string;
  value: unknown;
}

export type AnswerValidationCode =
  | 'INVALID_QUESTION_ID'
  | 'INVALID_ANSWER'
  | 'INVALID_PHOTO'
  | 'PHOTO_TOO_LARGE';

export type AnswerValidation =
  | { ok: true; photoBytes: number }
  | { ok: false; code: AnswerValidationCode; message: string; questionId?: string };

function fail(code: AnswerValidationCode, message: string, questionId?: string): AnswerValidation {
  return { ok: false, code, message, questionId };
}

/**
 * Cevap yükünü soru tanımlarına göre doğrular:
 *   • bilinmeyen soru id'si          → INVALID_QUESTION_ID
 *   • aynı soru iki kez              → INVALID_ANSWER (createMany P2002 ile 500 olmasın)
 *   • boş değer (null/''/ [])        → serbest (zorunluluk ayrıca denetlenir)
 *   • file: `data:image/` olmalı, ≤ PHOTO_MAX_BYTES, toplam ≤ PHOTOS_TOTAL_MAX_BYTES
 *   • text/single/yes_no: string ≤ 4000, `data:` ile başlayamaz
 *   • multi: string[] ≤ 50 öğe × ≤ 200 karakter
 *   • scale: sonlu sayı (veya sayısal string)
 *   • diğer her şey                  → INVALID_ANSWER
 */
export function validateAnswerPayload(
  questions: readonly AnswerPayloadQuestion[],
  answers: readonly AnswerPayloadRow[],
): AnswerValidation {
  const typeByQid = new Map(questions.map((q) => [q.id, q.type]));
  const seen = new Set<string>();
  let photoBytes = 0;

  for (const a of answers) {
    const type = typeByQid.get(a.questionId);
    if (type === undefined) {
      return fail('INVALID_QUESTION_ID', 'Geçersiz soru id', a.questionId);
    }
    if (seen.has(a.questionId)) {
      return fail('INVALID_ANSWER', 'Geçersiz cevap', a.questionId);
    }
    seen.add(a.questionId);

    const v = a.value;
    if (v === null || v === undefined || v === '') continue; // boş — zorunluluk ayrı

    switch (type) {
      case 'file': {
        if (typeof v !== 'string' || !v.startsWith('data:image/')) {
          return fail('INVALID_PHOTO', 'Geçersiz fotoğraf', a.questionId);
        }
        if (v.length > PHOTO_MAX_BYTES) {
          return fail('PHOTO_TOO_LARGE', 'Fotoğraf çok büyük', a.questionId);
        }
        photoBytes += v.length;
        if (photoBytes > PHOTOS_TOTAL_MAX_BYTES) {
          return fail('PHOTO_TOO_LARGE', 'Fotoğraflar toplamda çok büyük', a.questionId);
        }
        break;
      }

      case 'multi': {
        if (Array.isArray(v) && v.length === 0) break; // boş dizi = boş cevap
        if (
          !Array.isArray(v) ||
          v.length > MULTI_MAX_ITEMS ||
          v.some(
            (x) =>
              typeof x !== 'string' ||
              x.length > MULTI_ITEM_MAX_CHARS ||
              x.startsWith('data:'),
          )
        ) {
          return fail('INVALID_ANSWER', 'Geçersiz cevap', a.questionId);
        }
        break;
      }

      case 'scale': {
        const n =
          typeof v === 'number'
            ? v
            : typeof v === 'string' && v.trim() !== '' && v.length <= 12
              ? Number(v)
              : NaN;
        if (!Number.isFinite(n)) {
          return fail('INVALID_ANSWER', 'Geçersiz cevap', a.questionId);
        }
        break;
      }

      case 'single':
      case 'yes_no':
      case 'text': {
        if (typeof v !== 'string' || v.length > TEXT_ANSWER_MAX_CHARS || v.startsWith('data:')) {
          return fail('INVALID_ANSWER', 'Geçersiz cevap', a.questionId);
        }
        break;
      }

      default:
        return fail('INVALID_ANSWER', 'Geçersiz cevap', a.questionId);
    }
  }

  return { ok: true, photoBytes };
}

/** Yanıtsız bırakılmış ZORUNLU sorular (boş string / boşluk / [] / null dahil). */
export function findMissingRequired<Q extends { id: string; isRequired: boolean }>(
  questions: readonly Q[],
  answers: readonly AnswerPayloadRow[],
): Q[] {
  const byQid = new Map(answers.map((a) => [a.questionId, a]));
  return questions.filter((q) => {
    if (!q.isRequired) return false;
    const a = byQid.get(q.id);
    if (!a) return true;
    return isEmptyAnswerValue(a.value);
  });
}

// ─── Replay ─────────────────────────────────────────────────────────────

export interface ReplayComparable {
  respondentName?: string | null;
  respondentEmail?: string | null;
  respondentPhone?: string | null;
  answers: ReadonlyArray<{ questionId: string; value: unknown }>;
}

function normText(v: string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const t = v.trim().toLowerCase();
  return t === '' ? null : t;
}

/** Cevap değerini karşılaştırma için kanonikleştirir; boş → null. */
function canonValue(v: unknown): string | null {
  if (isEmptyAnswerValue(v)) return null;
  if (Array.isArray(v)) {
    return JSON.stringify(
      v
        .filter((x): x is string => typeof x === 'string')
        .map((x) => x.trim())
        .sort(),
    );
  }
  if (typeof v === 'string') return JSON.stringify(v.trim());
  if (typeof v === 'number') return JSON.stringify(v);
  return JSON.stringify(v);
}

function canonAnswers(
  answers: ReplayComparable['answers'],
  ignore?: ReadonlySet<string>,
): Map<string, string> {
  const out = new Map<string, string>();
  for (const a of answers) {
    if (ignore?.has(a.questionId)) continue;
    const c = canonValue(a.value);
    if (c !== null) out.set(a.questionId, c);
  }
  return out;
}

/**
 * Aynı link + IP + User-Agent'tan ≤ 30 sn önce kaydedilmiş yanıt (`candidate`)
 * ile gelen gönderim (`incoming`) özdeş mi? Özdeşse çift dokunuş / ağ tekrarı
 * kabul edilir: rota yeni satır açmadan `200 { duplicate: true }` döner.
 *
 * Özdeşlik = katılımcı adı (+ varsa e-posta/telefon) ve boş-olmayan cevapların
 * tümü eşit. Boş değer ≡ eksik değer. `file` cevapları yüklenmediği için
 * rota onları HER İKİ taraftan da dışarıda bırakır (`ignoreQuestionIds`).
 */
export function isReplaySubmission(
  candidate: ReplayComparable & { createdAt: Date | string | number },
  incoming: ReplayComparable,
  opts: { now?: number; windowMs?: number; ignoreQuestionIds?: ReadonlySet<string> } = {},
): boolean {
  const now = opts.now ?? Date.now();
  const windowMs = opts.windowMs ?? REPLAY_WINDOW_MS;
  const created =
    candidate.createdAt instanceof Date
      ? candidate.createdAt.getTime()
      : new Date(candidate.createdAt).getTime();
  if (!Number.isFinite(created)) return false;
  if (now - created > windowMs) return false;

  if (normText(candidate.respondentName) !== normText(incoming.respondentName)) return false;
  if (normText(candidate.respondentEmail) !== normText(incoming.respondentEmail)) return false;
  if (normText(candidate.respondentPhone) !== normText(incoming.respondentPhone)) return false;

  const a = canonAnswers(candidate.answers, opts.ignoreQuestionIds);
  const b = canonAnswers(incoming.answers, opts.ignoreQuestionIds);
  if (a.size !== b.size) return false;
  for (const [qid, val] of a) {
    if (b.get(qid) !== val) return false;
  }
  return true;
}

// ─── Sahibe e-posta politikası ──────────────────────────────────────────

/**
 * Süreklilik linkleri günlük kullanılınca sahibe "kişi başı, gün başı, denetim
 * başı" e-posta yağardı (ve sızmış bir link e-posta bombası olurdu). Artık
 * yalnız:
 *   • yanıt SORUNLU ise (`passed === false` veya `attentionCount > 0`), ya da
 *   • denetim bir TEST ise (aday sonucu) gönderilir.
 * Temiz kontrol listesi yanıtları mail üretmez; sahibi Sonuçlar'da görür.
 */
export function shouldNotifyOwner(input: {
  passed: boolean | null | undefined;
  attentionCount: number;
  kind: AuditKind;
}): boolean {
  if (input.kind === 'quiz') return true;
  if (input.passed === false) return true;
  return input.attentionCount > 0;
}

// ─── Skor görünürlüğü ───────────────────────────────────────────────────

/**
 * Katılımcıya dönen skor: test (quiz) ve puanlanamayan formlarda `null` —
 * böylece skor üzerinden doğru cevaplar yoklanamaz. Sahibi gerçek skoru
 * Sonuçlar'da görür.
 */
export function visibleScore(input: {
  score: number | null | undefined;
  kind: AuditKind;
}): number | null {
  if (input.kind === 'quiz') return null;
  return typeof input.score === 'number' && Number.isFinite(input.score) ? input.score : null;
}

/** JSON yanıt için `score / scorePercentage / passed` üçlüsü — skor görünmüyorsa üçü de null. */
export function visibleOutcome(input: {
  score: number | null | undefined;
  scorePercentage: number | null | undefined;
  passed: boolean | null | undefined;
  kind: AuditKind;
}): { score: number | null; scorePercentage: number | null; passed: boolean | null } {
  const score = visibleScore({ score: input.score, kind: input.kind });
  if (score === null) return { score: null, scorePercentage: null, passed: null };
  return {
    score,
    // scorePercentage 0-10000 saklanır; JSON'da 0-100 ondalıklı döner (eski sözleşme).
    scorePercentage:
      typeof input.scorePercentage === 'number' && Number.isFinite(input.scorePercentage)
        ? input.scorePercentage / 100
        : score,
    passed: input.passed ?? null,
  };
}
