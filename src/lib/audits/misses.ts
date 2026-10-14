// Denetim Merkezi — "Dikkat edilecek maddeler" (spec §5.3). Saf, DB'siz.
//
// DEPOLANMIŞ `autoScore` KULLANILMAZ. Sebepler:
//   • Eski satırlarda puanlanamayan sorular (not, fotoğraf) için `autoScore=0`
//     yazılmış — sahte alarm üretirdi.
//   • `autoScore < 100` bir Likert 4/5'i (80) "sorunlu" saymak olurdu.
//   • Public client her soru için satır gönderir; atlanan opsiyonel maddeler
//     `value: null` satırı olarak saklanır.
// Bunun yerine her cevap GÜNCEL soru tanımına göre değerlendirilir.

import { hasUsableCorrectAnswer } from './score';
import type { AuditQuestionType } from './types';

/** Likert (eşiksiz) ölçekte bu değer ve altı "sorunlu" sayılır (3/5 ve 4/5 değil). */
export const SCALE_ISSUE_MAX = 2;

export interface MissQuestion {
  id: string;
  type: AuditQuestionType | string;
  correctAnswer?: unknown;
}

export interface MissAnswerRow {
  questionId: string;
  value: unknown;
}

export interface MissSummaryItem {
  questionId: string;
  /** Değerlendirilebilen (boş olmayan, uygulanabilir) cevap sayısı. */
  answered: number;
  /** Bunlardan sorunlu olanlar. */
  missed: number;
  /** missed / answered (0..1). */
  missRate: number;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/** Atlanan opsiyonel madde: null / undefined / '' (boşluk dahil) / []. */
export function isEmptyAnswerValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * Tek bir cevap için:
 *   true  → sorunlu
 *   false → tamam
 *   null  → UYGULANMAZ (hem `answered` hem `missed` dışında bırakılır)
 *
 * Kurallar (§5.3):
 *   - boş cevap                      → null
 *   - file                           → null
 *   - text                           → doğru cevap (string) yoksa null; varsa uyuşmazlık = sorun
 *   - yes_no / single                → doğru cevap (string) yoksa null; uyuşmazlık = sorun
 *   - multi                          → doğru cevap (dolu dizi) yoksa null; küme eşit değilse sorun
 *   - scale                          → eşik (sayı) varsa value < eşik = sorun;
 *                                      yoksa Likert: value <= SCALE_ISSUE_MAX = sorun
 */
export function isIssueAnswer(question: MissQuestion, value: unknown): boolean | null {
  if (isEmptyAnswerValue(value)) return null;

  const type = question.type as AuditQuestionType;
  const correct = question.correctAnswer;

  switch (type) {
    case 'file':
      return null;

    case 'text':
    case 'yes_no':
    case 'single': {
      if (!hasUsableCorrectAnswer({ type, correctAnswer: correct })) return null;
      if (typeof value !== 'string') return true;
      return norm(value) !== norm(correct as string);
    }

    case 'multi': {
      if (!hasUsableCorrectAnswer({ type, correctAnswer: correct })) return null;
      if (!Array.isArray(value)) return true;
      const want = new Set(
        (correct as unknown[])
          .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
          .map(norm),
      );
      const got = new Set(
        value.filter((v): v is string => typeof v === 'string').map(norm),
      );
      if (want.size !== got.size) return true;
      for (const w of want) if (!got.has(w)) return true;
      return false;
    }

    case 'scale': {
      const num = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(num)) return null;
      if (typeof correct === 'number' && Number.isFinite(correct)) {
        return num < correct;
      }
      return num <= SCALE_ISSUE_MAX;
    }

    default:
      return null;
  }
}

/**
 * Cevap satırlarından soru başına özet. Yalnız `answered > 0` olan sorular
 * döner (sırası `questions` sırasıdır; sıralama çağıranın işi). Manuel
 * reviewer override'ları yok sayılır — cevap-değeri tabanlıdır.
 */
export function summarizeMisses(
  questions: readonly MissQuestion[],
  rows: readonly MissAnswerRow[],
): MissSummaryItem[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const acc = new Map<string, { answered: number; missed: number }>();

  for (const row of rows) {
    const q = byId.get(row.questionId);
    if (!q) continue;
    const verdict = isIssueAnswer(q, row.value);
    if (verdict === null) continue;
    const cur = acc.get(q.id) ?? { answered: 0, missed: 0 };
    cur.answered += 1;
    if (verdict) cur.missed += 1;
    acc.set(q.id, cur);
  }

  const out: MissSummaryItem[] = [];
  for (const q of questions) {
    const cur = acc.get(q.id);
    if (!cur || cur.answered === 0) continue;
    out.push({
      questionId: q.id,
      answered: cur.answered,
      missed: cur.missed,
      missRate: cur.missed / cur.answered,
    });
  }
  return out;
}

/**
 * TEK bir yanıttaki sorunlu madde sayısı (sahibe giden e-posta politikası ve
 * "x madde sorunlu" satırı için). `answers`: bu yanıtın cevap satırları.
 */
export function countIssues(
  questions: readonly MissQuestion[],
  answers: readonly MissAnswerRow[],
): number {
  const byId = new Map(questions.map((q) => [q.id, q]));
  let n = 0;
  for (const a of answers) {
    const q = byId.get(a.questionId);
    if (!q) continue;
    if (isIssueAnswer(q, a.value) === true) n += 1;
  }
  return n;
}

/** Özet satırlarını missRate azalan, sonra missed azalan sıralar; `missed > 0` olanları tutar. */
export function rankMisses(items: readonly MissSummaryItem[], limit = 20): MissSummaryItem[] {
  return items
    .filter((i) => i.missed > 0)
    .slice()
    .sort((a, b) => b.missRate - a.missRate || b.missed - a.missed)
    .slice(0, limit);
}
