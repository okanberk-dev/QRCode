// CLAUDE.md §42 — Audit scoring helper. Saf fonksiyon, DB'ye bağımsız.
// Submit anında veya manuel re-score sonrası AuditAnswer.autoScore +
// AuditResponse.score / scorePercentage / passed alanlarını üretir.
//
// Test edilebilir (CLAUDE.md §32): tests/audits-score.test.ts ile
// kapsanır.

import type {
  AuditQuestionType,
  AuditScoringMode,
} from './types';

export type AuditQuestionInput = {
  id: string;
  type: AuditQuestionType;
  // Quiz mode için doğru cevap. type'a göre string veya string[].
  correctAnswer?: unknown;
  weight: number;
  isRequired: boolean;
};

export type AuditAnswerInput = {
  questionId: string;
  value: unknown;
  // Reviewer manuel puan override (subjective text answer'lar için).
  manualScore?: number | null;
};

export type ScoredAnswer = {
  questionId: string;
  autoScore: number; // 0-100 her soru için (weighted ortalama bunu kullanır)
  appliedScore: number; // manualScore ?? autoScore
  hasCorrectAnswer: boolean;
};

export type AuditScoreResult = {
  scoredAnswers: ScoredAnswer[];
  score: number; // 0-100 tam sayı (yuvarlanmış)
  scorePercentage: number; // 0-10000 (2 ondalık duyarlık × 100)
  passed: boolean | null; // pass_fail veya passingScore varsa boolean, yoksa null
};

/**
 * Tek soruya verilen cevap için otomatik puan (0-100).
 *
 *  - single / yes_no: correctAnswer string ile eşitlik → 100, aksi 0.
 *  - multi: correctAnswer string[] ile tam eşitlik (set eşitliği) → 100;
 *    kısmi eşleşmede partial credit (intersect / union) × 100. Yanlış
 *    cevaplar union'ı büyütüp puanı düşürür.
 *  - scale: correctAnswer Int (0-100) eşik puan ise → answer >= eşik → 100,
 *    altı 0. correctAnswer yoksa cevap 1-5 → değer × 20 (1=20, 5=100).
 *  - text: correctAnswer string ise (case-insensitive trim) eşitlik 100/0.
 *    Aksi halde 0 (manuel re-score bekler).
 *  - file: 0 (henüz desteklenmiyor; manuel review).
 *
 * Boş/null cevap her zaman 0.
 */
export function scoreAnswer(
  question: AuditQuestionInput,
  answer: AuditAnswerInput | undefined,
): number {
  if (!answer || answer.value === null || answer.value === undefined) {
    return 0;
  }

  const value = answer.value;
  const correct = question.correctAnswer;

  switch (question.type) {
    case 'single':
    case 'yes_no': {
      if (typeof correct !== 'string' || typeof value !== 'string') return 0;
      return normalizeStr(value) === normalizeStr(correct) ? 100 : 0;
    }

    case 'multi': {
      if (!Array.isArray(correct) || !Array.isArray(value)) return 0;
      const correctSet = new Set(
        correct.filter((v): v is string => typeof v === 'string').map(normalizeStr),
      );
      const answerSet = new Set(
        value.filter((v): v is string => typeof v === 'string').map(normalizeStr),
      );
      if (correctSet.size === 0) return 0;
      let intersect = 0;
      correctSet.forEach((c) => {
        if (answerSet.has(c)) intersect += 1;
      });
      const union = new Set([...correctSet, ...answerSet]).size;
      if (union === 0) return 0;
      // Jaccard benzeri: intersect / union × 100. Tam eşit → 100.
      return Math.round((intersect / union) * 100);
    }

    case 'scale': {
      const num = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(num)) return 0;
      if (typeof correct === 'number' && Number.isFinite(correct)) {
        // Eşik puan modeli: cevap >= eşik → 100
        return num >= correct ? 100 : 0;
      }
      // Likert 1-5 fallback: 1→20, 5→100. Clamp.
      const clamped = Math.max(1, Math.min(5, num));
      return Math.round(clamped * 20);
    }

    case 'text': {
      if (typeof correct !== 'string' || typeof value !== 'string') return 0;
      return normalizeStr(value) === normalizeStr(correct) ? 100 : 0;
    }

    case 'file':
      return 0;

    default:
      return 0;
  }
}

function normalizeStr(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Tüm yanıtları skorla ve toplam puan üret.
 *
 *  - percentage: ortalama autoScore (her soru eşit ağırlık)
 *  - weighted:  Σ(autoScore × weight) / Σ(weight)
 *  - pass_fail: percentage ile aynı hesap, ama passed = score >= passingScore
 *
 * `passingScore` set edildiyse pass_fail modu dışında da `passed` boolean
 * üretilir (UI rozeti için). Set edilmediyse `passed = null`.
 */
export function computeAuditScore(
  questions: AuditQuestionInput[],
  answers: AuditAnswerInput[],
  mode: AuditScoringMode,
  passingScore: number | null | undefined,
): AuditScoreResult {
  const answerByQid = new Map(answers.map((a) => [a.questionId, a]));

  const scored: ScoredAnswer[] = questions.map((q) => {
    const a = answerByQid.get(q.id);
    const auto = scoreAnswer(q, a);
    const applied =
      a && typeof a.manualScore === 'number' && Number.isFinite(a.manualScore)
        ? Math.max(0, Math.min(100, a.manualScore))
        : auto;
    return {
      questionId: q.id,
      autoScore: auto,
      appliedScore: applied,
      hasCorrectAnswer: q.correctAnswer !== null && q.correctAnswer !== undefined,
    };
  });

  // Hiç soru yoksa skor 0.
  if (scored.length === 0) {
    return {
      scoredAnswers: scored,
      score: 0,
      scorePercentage: 0,
      passed: passingScore != null ? false : null,
    };
  }

  let percentage: number;

  if (mode === 'weighted') {
    let weightedSum = 0;
    let totalWeight = 0;
    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i];
      const s = scored[i];
      const w = Math.max(1, Math.min(10, q.weight || 1));
      weightedSum += s.appliedScore * w;
      totalWeight += w;
    }
    percentage = totalWeight === 0 ? 0 : weightedSum / totalWeight;
  } else {
    // percentage + pass_fail: basit ortalama
    const sum = scored.reduce((acc, s) => acc + s.appliedScore, 0);
    percentage = sum / scored.length;
  }

  const score = Math.round(percentage);
  const scorePercentage = Math.round(percentage * 100); // 2 ondalık duyarlık × 100

  let passed: boolean | null;
  if (mode === 'pass_fail' || passingScore != null) {
    passed = passingScore != null ? score >= passingScore : null;
  } else {
    passed = null;
  }

  return { scoredAnswers: scored, score, scorePercentage, passed };
}
