// Herkese açık denetim doldurma akışının saf kuralları (spec §3.8). React yok.
//
//   • iki mod: kontrol listesi (tek sayfa) ↔ adım adım (test / çok uzun form)
//   • "x/y yanıtlandı" sayacı, eksik zorunlu maddeler
//   • güncellenen soru setiyle cevapları uzlaştırma (canlı düzenleme)
//   • vurgu rengi güvenliği

import { normalizeQuestionOptions } from '@/lib/audits/options';
import type { PublicAnswerValue, PublicQuestion } from '@/components/audits/PublicQuestionInput';

/** Bu sayıdan çok madde → adım adım (tek sayfada kaybolur). */
export const CHECKLIST_MAX_ITEMS = 15;

export type FillMode = 'checklist' | 'steps';

/**
 * Tüm maddeler yes_no | scale | text | file ve ≤ 15 ise tek sayfa kontrol
 * listesi; herhangi bir single / multi varsa ya da > 15 madde varsa adım adım.
 * (Otomatik ilerleme YOK: testte yanlış dokunuş riski, WCAG 3.2.2.)
 */
export function chooseFillMode(questions: ReadonlyArray<{ type: string }>): FillMode {
  if (questions.length > CHECKLIST_MAX_ITEMS) return 'steps';
  for (const q of questions) {
    if (q.type === 'single' || q.type === 'multi') return 'steps';
  }
  return 'checklist';
}

/** Cevap dolu mu? (boş string / boşluk / [] / null / undefined → hayır) */
export function isAnswerFilled(value: PublicAnswerValue | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  return true;
}

/** "{a}/{b} yanıtlandı" için dolu cevap sayısı. */
export function countAnswered(
  questions: ReadonlyArray<{ id: string }>,
  answers: Record<string, PublicAnswerValue>,
): number {
  let n = 0;
  for (const q of questions) if (isAnswerFilled(answers[q.id])) n += 1;
  return n;
}

/** Yanıtsız bırakılmış ZORUNLU maddelerin id'leri (soru sırasıyla). */
export function findMissingRequiredIds(
  questions: ReadonlyArray<{ id: string; isRequired: boolean }>,
  answers: Record<string, PublicAnswerValue>,
): string[] {
  return questions.filter((q) => q.isRequired && !isAnswerFilled(answers[q.id])).map((q) => q.id);
}

/**
 * Mevcut cevapları (taslaktan ya da eski soru setinden) güncel sorularla
 * uzlaştırır: silinmiş soruların cevapları düşer; tür/seçenek artık uymayan
 * cevaplar da düşer (tür değişmiş olabilir). Uyanlar korunur.
 */
export function reconcileAnswers(
  questions: ReadonlyArray<PublicQuestion>,
  answers: Record<string, PublicAnswerValue>,
  locale: 'tr' | 'en' = 'tr',
): Record<string, PublicAnswerValue> {
  const out: Record<string, PublicAnswerValue> = {};
  for (const q of questions) {
    const v = answers[q.id];
    if (v === undefined || v === null) continue;
    const options = normalizeQuestionOptions(q.type, q.options, locale) ?? [];
    switch (q.type) {
      case 'yes_no':
      case 'single':
        if (typeof v === 'string' && options.includes(v)) out[q.id] = v;
        break;
      case 'multi': {
        if (!Array.isArray(v)) break;
        const kept = v.filter((x) => options.includes(x));
        if (kept.length > 0) out[q.id] = kept;
        break;
      }
      case 'scale':
        if (typeof v === 'number' && Number.isFinite(v) && v >= 1 && v <= 5) out[q.id] = v;
        break;
      case 'text':
        if (typeof v === 'string' && v.trim().length > 0) out[q.id] = v;
        break;
      case 'file':
        if (typeof v === 'string' && v.startsWith('data:image/')) out[q.id] = v;
        break;
      default:
        break;
    }
  }
  return out;
}

/** Gönderim gövdesindeki `answers` dizisi: her soru için bir satır. */
export function buildAnswerRows(
  questions: ReadonlyArray<{ id: string }>,
  answers: Record<string, PublicAnswerValue>,
): Array<{ questionId: string; value: PublicAnswerValue }> {
  return questions.map((q) => ({ questionId: q.id, value: answers[q.id] ?? null }));
}

/** Fotoğraf (data URL) cevaplarının toplam uzunluğu — sunucudaki toplam sınırla aynı ölçü. */
export function totalPhotoBytes(
  questions: ReadonlyArray<{ id: string; type: string }>,
  answers: Record<string, PublicAnswerValue>,
): number {
  let total = 0;
  for (const q of questions) {
    if (q.type !== 'file') continue;
    const v = answers[q.id];
    if (typeof v === 'string' && v.startsWith('data:')) total += v.length;
  }
  return total;
}

/**
 * Restoranın `primaryColor`'ı vurgu olarak kullanılır; geçerli hex değilse lime.
 * (Stil değeri olarak güvenli, `readableOn` her durumda anlamlı sonuç verir.)
 */
export function safeAccent(color: string | null | undefined): string {
  const fallback = '#C6F24E';
  if (typeof color !== 'string') return fallback;
  const c = color.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c) ? c : fallback;
}
