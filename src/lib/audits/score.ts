// CLAUDE.md §42 — Audit scoring helper. Saf fonksiyon, DB'ye bağımsız.
// Submit anında veya manuel re-score sonrası AuditAnswer.autoScore +
// AuditResponse.score / scorePercentage / passed alanlarını üretir.
//
// Test edilebilir (CLAUDE.md §32): tests/audits-score.test.ts ile
// kapsanır.
//
// Spec §5.2 (A1) — PUANA YALNIZ PUANLANABİLİR SORULAR KATILIR:
//   Eskiden her soru ortalamaya girerdi; doğru cevabı olmayan sorular
//   (opsiyonel not, fotoğraf, doğru cevabı girilmemiş Evet/Hayır) 0 sayılıyor,
//   hepsi "Evet" doldurulmuş bir kontrol listesi 100 yerine 83 (veya 0)
//   çıkıyordu. Artık:
//     • file                          → puanlanamaz
//     • scale                         → her zaman puanlanabilir
//     • single | multi | yes_no | text → yalnız doğru cevap tanımlıysa
//     • manualScore'u olan herhangi bir cevap, sorusunu puanlanabilir yapar
//   Hiç puanlanabilir soru yoksa skor `null` (UI "Puanlanmıyor" gösterir).

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
  /**
   * 0-100 otomatik puan. Soru TANIM gereği puanlanamazsa (doğru cevabı yok /
   * fotoğraf) `null` — UI "—" gösterir, DB'ye de `null` yazılır (eskiden
   * yanıltıcı `0` yazılıyordu).
   */
  autoScore: number | null;
  /** manualScore ?? autoScore; soru toplama katılmıyorsa `null`. */
  appliedScore: number | null;
  hasCorrectAnswer: boolean;
  /** Bu soru toplam puana katıldı mı? */
  scorable: boolean;
};

export type AuditScoreResult = {
  scoredAnswers: ScoredAnswer[];
  /** 0-100 tam sayı (yuvarlanmış). Puanlanabilir soru yoksa `null`. */
  score: number | null;
  /** 0-10000 (2 ondalık duyarlık × 100). Puanlanabilir soru yoksa `null`. */
  scorePercentage: number | null;
  /** passingScore varsa boolean, yoksa (veya puan yoksa) null. */
  passed: boolean | null;
  /** Toplama katılan soru sayısı. */
  scorableCount: number;
};

// ─── Scorability (spec §5.2) ────────────────────────────────────────────

/**
 * Sorunun kullanılabilir bir doğru cevabı var mı?
 *   - single / yes_no / text : boş olmayan string
 *   - multi                  : en az bir boş olmayan string içeren dizi
 *   - scale                  : sayı (eşik)
 *   - file                   : hiçbir zaman
 * Boş string ("") doğru cevap SAYILMAZ — editör boş bıraktığında `null`
 * yazar, ama elle girilmiş boş string de "doğru cevap yok" demektir.
 */
export function hasUsableCorrectAnswer(
  question: Pick<AuditQuestionInput, 'type' | 'correctAnswer'>,
): boolean {
  const c = question.correctAnswer;
  if (c === null || c === undefined) return false;
  switch (question.type) {
    case 'file':
      return false;
    case 'scale':
      return typeof c === 'number' && Number.isFinite(c);
    case 'multi':
      return (
        Array.isArray(c) && c.some((v) => typeof v === 'string' && v.trim().length > 0)
      );
    case 'single':
    case 'yes_no':
    case 'text':
      return typeof c === 'string' && c.trim().length > 0;
    default:
      return false;
  }
}

/**
 * Manuel puan override'ı (sonlu sayı) mı? `null` / `undefined` / NaN → hayır.
 */
export function finiteManualScore(
  answer: Pick<AuditAnswerInput, 'manualScore'> | null | undefined,
): number | null {
  if (!answer) return null;
  const m = answer.manualScore;
  return typeof m === 'number' && Number.isFinite(m) ? m : null;
}

/**
 * Soru TANIM gereği puanlanabilir mi (manuel puan hesaba katılmadan)?
 * Özet ("dikkat edilecek maddeler") ve submit bu tanımı kullanır.
 */
export function isScorableByDefinition(
  question: Pick<AuditQuestionInput, 'type' | 'correctAnswer'>,
): boolean {
  if (question.type === 'file') return false;
  if (question.type === 'scale') return true;
  return hasUsableCorrectAnswer(question);
}

/**
 * Spec §5.2: tanım gereği puanlanabilir VEYA cevabında sonlu bir
 * `manualScore` var.
 */
export function isScorableQuestion(
  question: Pick<AuditQuestionInput, 'type' | 'correctAnswer'>,
  answer?: Pick<AuditAnswerInput, 'manualScore'> | null,
): boolean {
  if (finiteManualScore(answer) !== null) return true;
  return isScorableByDefinition(question);
}

// ─── Single answer ──────────────────────────────────────────────────────

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
 *  - file: 0 (manuel review).
 *
 * Boş/null cevap her zaman 0. NOT: bu fonksiyon "puanlanabilir mi" kararı
 * VERMEZ — o karar `isScorableByDefinition` / `computeAuditScore`'da.
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

// ─── Whole response ─────────────────────────────────────────────────────

/**
 * Tüm yanıtları skorla ve toplam puan üret. Yalnız PUANLANABİLİR sorular
 * hem pay hem paydaya girer (spec §5.2).
 *
 *  - percentage: ortalama appliedScore (her puanlanabilir soru eşit ağırlık)
 *  - weighted:  Σ(appliedScore × weight) / Σ(weight)  (puanlanabilir alt küme)
 *  - pass_fail: percentage ile aynı hesap, passed = score >= passingScore
 *
 * Puanlanabilir bir sorunun cevabı eksikse yine 0 sayılır (değişmedi).
 * `passingScore` set edildiyse mod fark etmeksizin `passed` boolean üretilir.
 *
 * Özel durumlar:
 *   - Hiç soru yok                        → score 0, passed = passingScore ? false : null
 *   - Soru var ama hiçbiri puanlanamıyor  → score/scorePercentage/passed = null
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
    const manual = finiteManualScore(a);
    const byDefinition = isScorableByDefinition(q);
    const scorable = manual !== null || byDefinition;
    const auto = byDefinition ? scoreAnswer(q, a) : null;
    const applied = manual !== null ? Math.max(0, Math.min(100, manual)) : auto;
    return {
      questionId: q.id,
      autoScore: auto,
      appliedScore: scorable ? applied : null,
      hasCorrectAnswer: hasUsableCorrectAnswer(q),
      scorable,
    };
  });

  // Hiç soru yoksa skor 0 (eski davranış korunur).
  if (scored.length === 0) {
    return {
      scoredAnswers: scored,
      score: 0,
      scorePercentage: 0,
      passed: passingScore != null ? false : null,
      scorableCount: 0,
    };
  }

  const scorableCount = scored.filter((s) => s.scorable).length;
  if (scorableCount === 0) {
    return {
      scoredAnswers: scored,
      score: null,
      scorePercentage: null,
      passed: null,
      scorableCount: 0,
    };
  }

  let percentage: number;

  if (mode === 'weighted') {
    let weightedSum = 0;
    let totalWeight = 0;
    for (let i = 0; i < questions.length; i += 1) {
      const s = scored[i];
      if (!s.scorable || s.appliedScore === null) continue;
      const w = Math.max(1, Math.min(10, questions[i].weight || 1));
      weightedSum += s.appliedScore * w;
      totalWeight += w;
    }
    percentage = totalWeight === 0 ? 0 : weightedSum / totalWeight;
  } else {
    // percentage + pass_fail: puanlanabilir sorularda basit ortalama
    let sum = 0;
    for (const s of scored) {
      if (s.scorable && s.appliedScore !== null) sum += s.appliedScore;
    }
    percentage = sum / scorableCount;
  }

  const score = Math.round(percentage);
  const scorePercentage = Math.round(percentage * 100); // 2 ondalık duyarlık × 100
  const passed = passingScore != null ? score >= passingScore : null;

  return { scoredAnswers: scored, score, scorePercentage, passed, scorableCount };
}

// ─── Re-score rules (spec §6.6 / A10) ───────────────────────────────────

/**
 * `PATCH …/responses/[respId]` yalnız gövdede `overrides` varsa (ve en az bir
 * anahtar içeriyorsa) skoru yeniden hesaplar. Salt inceleme notu kaydı
 * `score / scorePercentage / passed` alanlarına DOKUNMAZ — şablon sonradan
 * düzenlendiyse eski bir yanıtın puanı bir not kaydıyla sessizce değişmesin.
 *
 * Boş `{}` bir override YOK demektir (yapacak bir şey yok), bu yüzden hesap
 * tetiklemez.
 */
export function shouldRecompute(
  body: { overrides?: Record<string, unknown> | null } | null | undefined,
): boolean {
  const overrides = body?.overrides;
  return (
    overrides !== null &&
    overrides !== undefined &&
    typeof overrides === 'object' &&
    Object.keys(overrides).length > 0
  );
}

/**
 * Yeniden hesapta kullanılacak sorular: yanıtın GERÇEKTEN cevap satırı olan
 * soruları. Yanıt gönderildikten sonra denetime eklenen bir soru (cevap
 * satırı yok) eski yanıt için 0 sayılmaz, `passed`'i çevirmez.
 * (Public submit her soru için satır yazar — atlanan opsiyoneller `null` değerli
 * satırdır; bu yüzden "satırı olan" = "gönderim anında var olan".)
 */
export function questionsForRecompute<Q extends { id: string }>(
  templateQuestions: readonly Q[],
  answeredQuestionIds: Iterable<string>,
): Q[] {
  const answered = new Set(answeredQuestionIds);
  return templateQuestions.filter((q) => answered.has(q.id));
}
