// Denetim Merkezi — canlı denetim düzenleme: soru listesi DIFF planlayıcısı.
//
// Spec §6.3 (A3). `PATCH …/templates/[tplId]` eskiden "hepsini sil + yeniden
// oluştur" yapıyordu. `AuditAnswer.question` `onDelete: Cascade` olduğundan
// bu, yanıtları silip her soru id'sini değiştirirdi (açık formdaki bir
// katılımcının cevapları da kırılırdı). Bunun yerine:
//
//   • Gelen `id` bu şablonun mevcut id'lerinden biri  → GÜNCELLE
//       – yanıt almış soruda yalnız prompt / helpText / isRequired / sortOrder
//         değişebilir; type / options / correctAnswer / weight değişimi
//         `QUESTION_LOCKED`
//   • Gelen `id` yok VEYA bu şablonun id'si değil     → OLUŞTUR (sunucu üretir)
//       – istemcinin gönderdiği id ASLA birincil anahtar olmaz: yabancı bir id
//         ne çakışabilir ne de başka şablonun sorusunu ele geçirebilir
//   • Aynı id payload'da iki kez                      → `DUPLICATE_QUESTION_ID`
//   • Mevcut id gelen listede yok                     → yanıtlıysa
//       `QUESTION_HAS_ANSWERS`, değilse SİL
//
// Saf fonksiyon: DB'ye dokunmaz. Rota planı tek `$transaction`'da uygular.
// Hata önceliği: DUPLICATE → QUESTION_LOCKED (gelen sıraya göre ilk) →
// QUESTION_HAS_ANSWERS (mevcut sıraya göre ilk).

import type { AuditQuestionType } from './types';

export interface ExistingQuestionRow {
  id: string;
  type: string;
  prompt: string;
  helpText: string | null;
  /** Prisma Json? — string[] | null | (bozuk veri) */
  options: unknown;
  /** Prisma Json? — string | string[] | number | null */
  correctAnswer: unknown;
  weight: number;
  isRequired: boolean;
  sortOrder: number;
}

export interface IncomingQuestionInput {
  id?: string | null;
  type: AuditQuestionType;
  prompt: string;
  helpText?: string | null;
  options?: string[] | null;
  correctAnswer?: unknown;
  weight?: number;
  isRequired?: boolean;
  sortOrder?: number;
}

/** Yanıt almış bir soruda değiştirilemeyen alanlar. */
export type LockedField = 'type' | 'options' | 'correctAnswer' | 'weight';

/** DB'ye yazılacak soru alanları (id YOK — sunucu üretir). */
export interface QuestionWriteData {
  type: AuditQuestionType;
  prompt: string;
  helpText: string | null;
  options: string[] | null;
  correctAnswer: unknown;
  weight: number;
  isRequired: boolean;
  sortOrder: number;
}

export interface PlannedCreate {
  /** Gelen listedeki 0-tabanlı konum. */
  index: number;
  data: QuestionWriteData;
}

export interface PlannedUpdate {
  id: string;
  index: number;
  /** Yalnız DEĞİŞEN alanlar. */
  data: Partial<QuestionWriteData>;
  /** Değişenler arasındaki kilitli alanlar (yanıtsız soruda serbest, rota yine de tx içinde yeniden doğrular). */
  lockedFieldsChanged: LockedField[];
}

export interface QuestionDiffPlan {
  creates: PlannedCreate[];
  updates: PlannedUpdate[];
  deletes: string[];
  /** Hiç değişmeyen mevcut soru id'leri. */
  unchangedIds: string[];
}

export type QuestionDiffError =
  | { code: 'DUPLICATE_QUESTION_ID'; index: number; questionId: string }
  | { code: 'QUESTION_LOCKED'; index: number; questionId: string; fields: LockedField[] }
  | { code: 'QUESTION_HAS_ANSWERS'; existingIndex: number; questionId: string };

export type QuestionDiffResult =
  | { ok: true; plan: QuestionDiffPlan }
  | { ok: false; error: QuestionDiffError };

// ─── Equality helpers ───────────────────────────────────────────────────

function cleanId(id: string | null | undefined): string | null {
  if (typeof id !== 'string') return null;
  const t = id.trim();
  return t.length > 0 ? t : null;
}

function normHelp(v: string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  return v.trim() === '' ? null : v;
}

function normOptions(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const arr = v.filter((x): x is string => typeof x === 'string');
  return arr.length === 0 ? null : arr;
}

function sameOptions(a: unknown, b: unknown): boolean {
  const x = normOptions(a);
  const y = normOptions(b);
  if (x === null || y === null) return x === y;
  if (x.length !== y.length) return false;
  // Seçenek SIRASI görünür bir özelliktir → sıra farkı da değişikliktir.
  return x.every((v, i) => v === y[i]);
}

/**
 * correctAnswer eşitliği. null / undefined / '' / [] = "doğru cevap yok".
 * Dizi (multi) KÜME olarak karşılaştırılır — aynı kümeyi başka sırayla
 * göndermek anlam değişikliği değildir (puanlama da küme tabanlı).
 */
function normCorrect(v: unknown): { kind: 'none' } | { kind: 'set'; set: string[] } | { kind: 'scalar'; value: string | number } {
  if (v === null || v === undefined) return { kind: 'none' };
  if (Array.isArray(v)) {
    const set = Array.from(new Set(v.filter((x): x is string => typeof x === 'string'))).sort();
    return set.length === 0 ? { kind: 'none' } : { kind: 'set', set };
  }
  if (typeof v === 'string') return v === '' ? { kind: 'none' } : { kind: 'scalar', value: v };
  if (typeof v === 'number' && Number.isFinite(v)) return { kind: 'scalar', value: v };
  return { kind: 'none' };
}

function sameCorrect(a: unknown, b: unknown): boolean {
  const x = normCorrect(a);
  const y = normCorrect(b);
  if (x.kind !== y.kind) return false;
  if (x.kind === 'none') return true;
  if (x.kind === 'scalar' && y.kind === 'scalar') return x.value === y.value;
  if (x.kind === 'set' && y.kind === 'set') {
    return x.set.length === y.set.length && x.set.every((v, i) => v === y.set[i]);
  }
  return false;
}

/**
 * Sıralama: gelen listenin SIRASI görünen sıradır. Gönderilen `sortOrder`
 * değerleri listede kesin artıyorsa olduğu gibi korunur (builder (i+1)*10
 * gönderir → hiç değişmeyen soru için no-op); aksi halde (hepsi 0 / eksik /
 * karışık) konuma göre `(i+1)*10`.
 */
export function resolveSortOrders(incoming: ReadonlyArray<{ sortOrder?: number }>): number[] {
  const given = incoming.map((q) => q.sortOrder);
  const usable = given.every((v) => typeof v === 'number' && Number.isFinite(v));
  const strictlyIncreasing =
    usable && (given as number[]).every((v, i, arr) => i === 0 || v > arr[i - 1]);
  return strictlyIncreasing
    ? (given as number[])
    : incoming.map((_, i) => (i + 1) * 10);
}

// ─── Planner ────────────────────────────────────────────────────────────

export function planQuestionDiff(
  existing: readonly ExistingQuestionRow[],
  incoming: readonly IncomingQuestionInput[],
  answeredIds: ReadonlySet<string> | readonly string[],
): QuestionDiffResult {
  const answered: ReadonlySet<string> =
    answeredIds instanceof Set ? answeredIds : new Set(answeredIds as readonly string[]);
  const existingById = new Map(existing.map((q) => [q.id, q]));

  // 1) Aynı id payload'da iki kez → yapısal hata.
  const seen = new Set<string>();
  for (let i = 0; i < incoming.length; i += 1) {
    const id = cleanId(incoming[i].id);
    if (!id) continue;
    if (seen.has(id)) {
      return { ok: false, error: { code: 'DUPLICATE_QUESTION_ID', index: i, questionId: id } };
    }
    seen.add(id);
  }

  const sortOrders = resolveSortOrders(incoming);
  const creates: PlannedCreate[] = [];
  const updates: PlannedUpdate[] = [];
  const unchangedIds: string[] = [];
  const keptExisting = new Set<string>();

  for (let i = 0; i < incoming.length; i += 1) {
    const inc = incoming[i];
    const id = cleanId(inc.id);
    const target: QuestionWriteData = {
      type: inc.type,
      prompt: inc.prompt,
      helpText: normHelp(inc.helpText),
      options: inc.options ?? null,
      correctAnswer: inc.correctAnswer ?? null,
      weight: inc.weight ?? 1,
      isRequired: inc.isRequired ?? true,
      sortOrder: sortOrders[i],
    };

    const ex = id ? existingById.get(id) : undefined;
    if (!ex) {
      // id yok / bu şablonun değil → sunucu id'si ile oluştur (istemci id'si KULLANILMAZ).
      creates.push({ index: i, data: target });
      continue;
    }
    keptExisting.add(ex.id);

    const data: Partial<QuestionWriteData> = {};
    const locked: LockedField[] = [];

    if (target.prompt !== ex.prompt) data.prompt = target.prompt;
    if (target.helpText !== normHelp(ex.helpText)) data.helpText = target.helpText;
    if (target.isRequired !== ex.isRequired) data.isRequired = target.isRequired;
    if (target.sortOrder !== ex.sortOrder) data.sortOrder = target.sortOrder;

    if (target.type !== ex.type) {
      data.type = target.type;
      locked.push('type');
    }
    if (!sameOptions(target.options, ex.options)) {
      data.options = target.options;
      locked.push('options');
    }
    if (!sameCorrect(target.correctAnswer, ex.correctAnswer)) {
      data.correctAnswer = target.correctAnswer;
      locked.push('correctAnswer');
    }
    if (target.weight !== ex.weight) {
      data.weight = target.weight;
      locked.push('weight');
    }

    if (locked.length > 0 && answered.has(ex.id)) {
      return {
        ok: false,
        error: { code: 'QUESTION_LOCKED', index: i, questionId: ex.id, fields: locked },
      };
    }

    if (Object.keys(data).length === 0) {
      unchangedIds.push(ex.id);
    } else {
      updates.push({ id: ex.id, index: i, data, lockedFieldsChanged: locked });
    }
  }

  // 3) Gelen listede olmayan mevcut sorular.
  const deletes: string[] = [];
  for (let e = 0; e < existing.length; e += 1) {
    const ex = existing[e];
    if (keptExisting.has(ex.id)) continue;
    if (answered.has(ex.id)) {
      return {
        ok: false,
        error: { code: 'QUESTION_HAS_ANSWERS', existingIndex: e, questionId: ex.id },
      };
    }
    deletes.push(ex.id);
  }

  return { ok: true, plan: { creates, updates, deletes, unchangedIds } };
}

// ─── Error → message (rota ve testler ortak) ────────────────────────────

/**
 * API'nin `error` alanına konan Türkçe mesaj + `details.itemNumber`. UI dil
 * bazlı metni `error-humanizer`'daki kod haritasından alır; madde numarası
 * `details.itemNumber`'dan eklenir.
 */
export function describeQuestionDiffError(err: QuestionDiffError): {
  code: QuestionDiffError['code'];
  message: string;
  itemNumber: number;
} {
  switch (err.code) {
    case 'DUPLICATE_QUESTION_ID': {
      const n = err.index + 1;
      return {
        code: err.code,
        itemNumber: n,
        message: `${n}. madde aynı kimlikle birden fazla kez gönderildi.`,
      };
    }
    case 'QUESTION_LOCKED': {
      const n = err.index + 1;
      return {
        code: err.code,
        itemNumber: n,
        message: `${n}. maddeye yanıt verilmiş; türü, seçenekleri, doğru cevabı veya puan ağırlığı değiştirilemez.`,
      };
    }
    case 'QUESTION_HAS_ANSWERS': {
      const n = err.existingIndex + 1;
      return {
        code: err.code,
        itemNumber: n,
        message: `${n}. maddeye yanıt verilmiş; silinemez.`,
      };
    }
  }
}
